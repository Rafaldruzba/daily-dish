import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { randomUUID } from 'crypto'

import { AuditService } from '../audit/audit.service'
import { EmailService } from '../email/email.service'
import { BistroMapaApiClient } from '../integrations/bistromapa-api.client'
import { PrismaService } from '../prisma/prisma.service'

const MAX_RETRIES = 5
const TOKEN_EXPIRY_HOURS = 72

export interface AutomationLogEntry {
	id: string
	action: string
	status: string
	error: string | null
	durationMs: number | null
	attempt: number
	createdAt: Date
}

@Injectable()
export class AutomationService {
	private readonly logger = new Logger(AutomationService.name)

	constructor(
		private readonly prisma: PrismaService,
		private readonly client: BistroMapaApiClient,
		private readonly email: EmailService,
		private readonly audit: AuditService,
		private readonly config: ConfigService,
	) {}

	/**
	 * Cykliczny przebieg:
	 * wybiera leady ACCEPTED bez rozpoczętego onboardingu
	 * i przetwarza je zadaniowo.
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async nightlyCycle(): Promise<void> {
		await this.runCycleNow()
	}

	/**
	 * Wspólna logika dla crona i ręcznego uruchomienia z panelu.
	 */
	async runCycleNow(): Promise<{ processed: number }> {
		const leads = await this.prisma.lead.findMany({
			where: {
				status: 'ACCEPTED',
				OR: [
					{
						onboardingStatus: 'NOT_STARTED',
					},
					{
						onboardingStatus: 'ERROR',
						onboardingRetryCount: {
							lt: MAX_RETRIES,
						},
					},
				],
			},
			take: 50,
		})

		if (leads.length === 0) {
			return {
				processed: 0,
			}
		}

		this.logger.log(`Onboarding: ${leads.length} leadów do przetworzenia`)

		await this.prisma.lead.updateMany({
			where: {
				id: {
					in: leads.map(lead => lead.id),
				},
			},
			data: {
				onboardingStatus: 'CREATE_QUEUED',
			},
		})

		for (const lead of leads) {
			await this.processLead(lead.id)
		}

		return {
			processed: leads.length,
		}
	}

	/**
	 * Idempotentne przejścia onboardingu dla jednego leada.
	 */
	async processLead(leadId: string): Promise<{ status: string; error?: string }> {
		const lead = await this.prisma.lead.findUnique({
			where: {
				id: leadId,
			},
		})

		if (!lead) {
			throw new NotFoundException('Lead nie istnieje')
		}

		/**
		 * Konto zostało już utworzone.
		 * Nie tworzymy drugiego konta.
		 */
		if (lead.bistroRestaurantId && lead.bistroUserId) {
			return this.sendInvitationStep(lead.id)
		}

		/**
		 * Sprawdzenie, czy użytkownik z takim emailem
		 * już istnieje w BistroMapie.
		 */
		if (lead.email) {
			try {
				const email = lead.email.trim()

				// @ts-ignore
				const user = await (this.prisma as any).user.findUnique({
					where: {
						email,
					},
				})

				if (user) {
					this.logger.log(
						`[Automation] Duplikat wykryty: lead ${lead.id} (${lead.name}) -> istniejący użytkownik ${user.id} (${email})`,
					)

					await this.prisma.lead.update({
						where: {
							id: lead.id,
						},
						data: {
							onboardingStatus: 'USER_EXISTS',
							onboardingLastError:
								'Znaleziono istniejące konto użytkownika z tym emailem — restaurację należy dodać ręcznie.',
							onboardingLastAttemptAt: new Date(),
						},
					})

					try {
						const result = await this.email.send(
							{
								leadId: lead.id,
								templateKey: 'NEXT_RESTAURANT',
								to: email,
							},
							null,
						)

						if (result.sent) {
							this.logger.log(`[Automation] Wysłano mail o ręcznym dodaniu restauracji do ${email}`)
						}
					} catch (mailError) {
						const message = mailError instanceof Error ? mailError.message : 'Nieznany błąd wysyłki'

						this.logger.warn(`[Automation] Nie udało się wysłać maila NEXT_RESTAURANT do ${email}: ${message}`)
					}

					/**
					 * Nie próbujemy tworzyć kolejnego konta.
					 */
					return {
						status: 'USER_EXISTS',
					}
				}
			} catch (error) {
				this.logger.warn(`[Automation] Błąd przy sprawdzaniu duplikatu dla lead ${lead.id}:`, error)
			}
		}

		const startedAt = Date.now()

		try {
			const result = await this.client.createRestaurantWithOwner({
				name: lead.name,
				city: lead.city,
				address: lead.address,
				phone: lead.phone,
				email: lead.email ?? '',
				category: lead.category,
				contactPerson: lead.contactPerson,
			})

			await this.prisma.lead.update({
				where: {
					id: lead.id,
				},
				data: {
					bistroRestaurantId: result.restaurantId,
					bistroUserId: result.userId,
					onboardingStatus: 'ACCOUNT_CREATED',
					onboardingLastError: null,
					onboardingLastAttemptAt: new Date(),
				},
			})

			await this.log({
				leadId: lead.id,
				action: 'CREATE_ACCOUNT',
				status: 'SUCCESS',
				durationMs: Date.now() - startedAt,
				attempt: lead.onboardingRetryCount + 1,
			})

			await this.audit.log({
				action: 'ACCOUNT_CREATED',
				leadId: lead.id,
				details: {
					restaurantId: result.restaurantId,
					userId: result.userId,
				},
			})

			return this.sendInvitationStep(lead.id)
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd'

			await this.markError(lead.id, 'CREATE_ACCOUNT', message, Date.now() - startedAt, lead.onboardingRetryCount + 1)

			return {
				status: 'ERROR',
				error: message,
			}
		}
	}

	/**
	 * Wysyła mail aktywacyjny.
	 *
	 * Token jest przechowywany w CRM,
	 * a użytkownik dostaje link do BistroMapy.
	 */
	private async sendInvitationStep(leadId: string): Promise<{ status: string; error?: string }> {
		const lead = await this.prisma.lead.findUnique({
			where: {
				id: leadId,
			},
		})

		if (!lead) {
			throw new NotFoundException('Lead nie istnieje')
		}

		/**
		 * Idempotencja:
		 * nie wysyłamy ponownie aktywacji,
		 * jeśli została już wysłana lub konto aktywowano.
		 */
		if (lead.onboardingStatus === 'INVITATION_SENT' || lead.onboardingStatus === 'ACTIVATED') {
			return {
				status: lead.onboardingStatus,
			}
		}

		if (!lead.email) {
			await this.markError(leadId, 'SEND_INVITATION', 'Lead nie ma adresu email', 0, lead.onboardingRetryCount + 1)

			return {
				status: 'ERROR',
				error: 'Lead nie ma adresu email',
			}
		}

		const startedAt = Date.now()

		/**
		 * Generujemy unikalny token aktywacyjny.
		 */
		const activationToken = randomUUID()

		const activationTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

		const appUrl = this.config.getOrThrow<string>('BISTRO_APP_URL').replace(/\/$/, '')

		const activationUrl = `${appUrl}/auth/activate/${activationToken}`

		try {
			/**
			 * Zapisujemy token przed wysłaniem wiadomości.
			 */
			await this.prisma.lead.update({
				where: {
					id: leadId,
				},
				data: {
					activationToken,
					activationTokenExpiry,
				},
			})

			/**
			 * Wysyłka przez JEDYNY system emailowy.
			 */
			const result = await this.email.send(
				{
					leadId,
					templateKey: 'ACCOUNT_ACTIVATION',
					to: lead.email,
					variables: {
						activationUrl,
					},
				},
				null,
			)

			if (!result.sent) {
				throw new Error('EmailService nie potwierdził wysłania wiadomości')
			}

			await this.prisma.lead.update({
				where: {
					id: leadId,
				},
				data: {
					onboardingStatus: 'INVITATION_SENT',
					onboardingLastError: null,
					onboardingLastAttemptAt: new Date(),
				},
			})

			await this.log({
				leadId,
				action: 'SEND_INVITATION',
				status: 'SUCCESS',
				durationMs: Date.now() - startedAt,
				attempt: lead.onboardingRetryCount + 1,
			})

			await this.audit.log({
				action: 'INVITATION_SENT',
				leadId,
				details: {
					to: lead.email,
					activationTokenSent: true,
					resendId: result.resendId ?? null,
				},
			})

			this.logger.log(`[Automation] Mail aktywacyjny wysłany do ${lead.email}`)

			return {
				status: 'INVITATION_SENT',
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd'

			/**
			 * Jeżeli wysyłka się nie udała,
			 * token przestaje być ważny.
			 */
			await this.prisma.lead.update({
				where: {
					id: leadId,
				},
				data: {
					activationToken: null,
					activationTokenExpiry: null,
				},
			})

			await this.markError(leadId, 'SEND_INVITATION', message, Date.now() - startedAt, lead.onboardingRetryCount + 1)

			this.logger.error(`[Automation] Błąd wysyłania maila aktywacyjnego do ${lead.email}: ${message}`)

			return {
				status: 'ERROR',
				error: message,
			}
		}
	}

	/**
	 * Ręczne oznaczenie aktywacji.
	 */
	async markActivated(leadId: string, _adminUserId: string) {
		const lead = await this.prisma.lead.findUnique({
			where: {
				id: leadId,
			},
		})

		if (!lead) {
			throw new NotFoundException('Lead nie istnieje')
		}

		await this.prisma.lead.update({
			where: {
				id: leadId,
			},
			data: {
				onboardingStatus: 'ACTIVATED',
			},
		})

		await this.log({
			leadId,
			action: 'CHECK_ONBOARDING',
			status: 'SUCCESS',
			durationMs: 0,
			attempt: 1,
		})

		return {
			leadId,
			onboardingStatus: 'ACTIVATED' as const,
		}
	}

	/**
	 * Ponowienie onboardingu.
	 */
	async retry(leadId: string, adminUserId: string) {
		const lead = await this.prisma.lead.findUnique({
			where: {
				id: leadId,
			},
		})

		if (!lead) {
			throw new NotFoundException('Lead nie istnieje')
		}

		await this.audit.log({
			action: 'AUTOMATION_RETRY',
			leadId,
			adminUserId,
		})

		return this.processLead(leadId)
	}

	/**
	 * Lista logów automatyzacji.
	 */
	async listLogs(params: { leadId?: string; action?: string; status?: string; page: number; limit: number }) {
		const where = {
			...(params.leadId
				? {
						leadId: params.leadId,
					}
				: {}),
			...(params.action
				? {
						action: params.action,
					}
				: {}),
			...(params.status
				? {
						status: params.status,
					}
				: {}),
		}

		const [items, total] = await Promise.all([
			this.prisma.automationLog.findMany({
				where,
				orderBy: {
					createdAt: 'desc',
				},
				skip: (params.page - 1) * params.limit,
				take: params.limit,
				include: {
					lead: {
						select: {
							id: true,
							name: true,
							city: true,
						},
					},
				},
			}),
			this.prisma.automationLog.count({
				where,
			}),
		])

		return {
			items,
			total,
			page: params.page,
			limit: params.limit,
			pages: Math.max(1, Math.ceil(total / params.limit)),
		}
	}

	/**
	 * Status automatyzacji.
	 */
	async status() {
		const [pending, queued, errors, activated] = await Promise.all([
			this.prisma.lead.count({
				where: {
					status: 'ACCEPTED',
					onboardingStatus: 'NOT_STARTED',
				},
			}),
			this.prisma.lead.count({
				where: {
					onboardingStatus: 'CREATE_QUEUED',
				},
			}),
			this.prisma.lead.count({
				where: {
					onboardingStatus: 'ERROR',
				},
			}),
			this.prisma.lead.count({
				where: {
					onboardingStatus: 'ACTIVATED',
				},
			}),
		])

		return {
			integrationConfigured: this.client.configured,
			emailConfigured: this.email.configured,
			leads: {
				pending,
				queued,
				errors,
				activated,
			},
		}
	}

	private async markError(
		leadId: string,
		action: string,
		message: string,
		durationMs: number,
		attempt: number,
	): Promise<void> {
		await this.prisma.lead.update({
			where: {
				id: leadId,
			},
			data: {
				onboardingStatus: 'ERROR',
				onboardingLastError: message,
				onboardingLastAttemptAt: new Date(),
				onboardingRetryCount: {
					increment: 1,
				},
			},
		})

		await this.log({
			leadId,
			action,
			status: 'ERROR',
			error: message,
			durationMs,
			attempt,
		})
	}

	private async log(entry: {
		leadId: string
		action: string
		status: 'SUCCESS' | 'ERROR'
		error?: string
		durationMs: number
		attempt: number
	}): Promise<void> {
		await this.prisma.automationLog.create({
			data: {
				leadId: entry.leadId,
				action: entry.action,
				status: entry.status,
				error: entry.error ?? null,
				durationMs: entry.durationMs,
				attempt: entry.attempt,
			},
		})
	}
}
