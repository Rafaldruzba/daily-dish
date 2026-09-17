import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Cron, CronExpression } from '@nestjs/schedule'
import { randomUUID } from 'crypto'

import { AuditService } from '../audit/audit.service'
import { EmailService } from '../email/email.service'
import { BistroMapaApiClient } from '../integrations/bistromapa-api.client'
import { PrismaService } from '../prisma/prisma.service'

const MAX_RETRIES = 5
const TOKEN_EXPIRY_HOURS = 72 // 3 dni

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
	 * Cykliczny przebieg (readme §25): wybiera leady ACCEPTED bez rozpoczętego
	 * onboardingu i przetwarza je zadaniowo. Każdy krok jest idempotentny,
	 * więc ponowne uruchomienie nie tworzy drugiego konta.
	 */
	@Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
	async nightlyCycle(): Promise<void> {
		await this.runCycleNow()
	}

	/** Wspólna logika dla crona i ręcznego uruchomienia z panelu. */
	async runCycleNow(): Promise<{ processed: number }> {
		const leads = await this.prisma.lead.findMany({
			where: {
				status: 'ACCEPTED',
				OR: [
					{ onboardingStatus: 'NOT_STARTED' },
					{ onboardingStatus: 'ERROR', onboardingRetryCount: { lt: MAX_RETRIES } },
				],
			},
			take: 50,
		})

		if (leads.length === 0) return { processed: 0 }

		this.logger.log(`Onboarding: ${leads.length} leadów do przetworzenia`)

		await this.prisma.lead.updateMany({
			where: { id: { in: leads.map((lead) => lead.id) } },
			data: { onboardingStatus: 'CREATE_QUEUED' },
		})

		for (const lead of leads) {
			await this.processLead(lead.id)
		}

		return { processed: leads.length }
	}

	/** Idempotentne przejścia onboardingu dla jednego leada. */
	async processLead(leadId: string): Promise<{ status: string; error?: string }> {
		const lead = await this.prisma.lead.findUnique({ where: { id: leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		// Konto już istnieje — nie tworzymy drugiego (readme §34).
		if (lead.bistroRestaurantId && lead.bistroUserId) {
			return this.sendInvitationStep(lead.id)
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
				where: { id: lead.id },
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
				details: { restaurantId: result.restaurantId, userId: result.userId },
			})

			return this.sendInvitationStep(lead.id)
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd'
			await this.markError(lead.id, 'CREATE_ACCOUNT', message, Date.now() - startedAt, lead.onboardingRetryCount + 1)

			return { status: 'ERROR', error: message }
		}
	}

	private async sendInvitationStep(leadId: string): Promise<{ status: string; error?: string }> {
		const lead = await this.prisma.lead.findUnique({ where: { id: leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		// Idempotencja (readme §25): zaproszenia wysyłamy raz, ponowienie nie spamuje leada.
		if (lead.onboardingStatus === 'INVITATION_SENT' || lead.onboardingStatus === 'ACTIVATED') {
			return { status: lead.onboardingStatus }
		}

		if (!lead.email) {
			await this.markError(leadId, 'SEND_INVITATION', 'Lead nie ma adresu email', 0, lead.onboardingRetryCount + 1)
			return { status: 'ERROR', error: 'Lead nie ma adresu email' }
		}

		const startedAt = Date.now()

		// Generowanie unikalnego tokenu aktywacyjnego
		const activationToken = randomUUID()
		const activationTokenExpiry = new Date(Date.now() + TOKEN_EXPIRY_HOURS * 60 * 60 * 1000)

		// Link prowadzi do aplikacji głównej (bistromapa.app), ale token weryfikuje CRM —
		// to CRM wysyła zaproszenie i tylko on zna token (readme §24).
		const activationUrl = `${this.config.getOrThrow<string>('BISTRO_APP_URL').replace(/\/$/, '')}/auth/activate/${activationToken}`

		try {
			// Aktualizacja tokenu w bazie
			await this.prisma.lead.update({
				where: { id: leadId },
				data: {
					activationToken,
					activationTokenExpiry,
				},
			})

			// Hasła nie wysyłamy — użytkownik ustawia własne przez link aktywacyjny (readme §24).
			await this.email.send(
				{
					leadId,
					templateKey: 'invitation',
					to: lead.email,
					variables: { activationUrl },
				},
				null,
			)

			await this.prisma.lead.update({
				where: { id: leadId },
				data: { onboardingStatus: 'INVITATION_SENT', onboardingLastAttemptAt: new Date() },
			})

			await this.log({
				leadId,
				action: 'SEND_INVITATION',
				status: 'SUCCESS',
				durationMs: Date.now() - startedAt,
				attempt: 1,
			})

			await this.audit.log({
				action: 'INVITATION_SENT',
				leadId,
				details: { to: lead.email, activationTokenSent: true },
			})

			return { status: 'INVITATION_SENT' }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd'
			// Czyszczenie tokenu w przypadku błędu
			await this.prisma.lead.update({
				where: { id: leadId },
				data: { activationToken: null, activationTokenExpiry: null },
			})
			await this.markError(leadId, 'SEND_INVITATION', message, Date.now() - startedAt, 1)

			return { status: 'ERROR', error: message }
		}
	}

	/** Ręczne oznaczenie aktywacji — automatyczne sprawdzenie wymaga API BistroMapy (TODO §33). */
	async markActivated(leadId: string, _adminUserId: string) {
		const lead = await this.prisma.lead.findUnique({ where: { id: leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		await this.prisma.lead.update({ where: { id: leadId }, data: { onboardingStatus: 'ACTIVATED' } })
		await this.log({ leadId, action: 'CHECK_ONBOARDING', status: 'SUCCESS', durationMs: 0, attempt: 1 })

		return { leadId, onboardingStatus: 'ACTIVATED' as const }
	}

	async retry(leadId: string, adminUserId: string) {
		const lead = await this.prisma.lead.findUnique({ where: { id: leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		await this.audit.log({ action: 'AUTOMATION_RETRY', leadId, adminUserId })

		return this.processLead(leadId)
	}

	async listLogs(params: { leadId?: string; action?: string; status?: string; page: number; limit: number }) {
		const where = {
			...(params.leadId ? { leadId: params.leadId } : {}),
			...(params.action ? { action: params.action } : {}),
			...(params.status ? { status: params.status } : {}),
		}

		const [items, total] = await Promise.all([
			this.prisma.automationLog.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (params.page - 1) * params.limit,
				take: params.limit,
				include: { lead: { select: { id: true, name: true, city: true } } },
			}),
			this.prisma.automationLog.count({ where }),
		])

		return { items, total, page: params.page, limit: params.limit, pages: Math.max(1, Math.ceil(total / params.limit)) }
	}

	async status() {
		const [pending, queued, errors, activated] = await Promise.all([
			this.prisma.lead.count({ where: { status: 'ACCEPTED', onboardingStatus: 'NOT_STARTED' } }),
			this.prisma.lead.count({ where: { onboardingStatus: 'CREATE_QUEUED' } }),
			this.prisma.lead.count({ where: { onboardingStatus: 'ERROR' } }),
			this.prisma.lead.count({ where: { onboardingStatus: 'ACTIVATED' } }),
		])

		return {
			integrationConfigured: this.client.configured,
			emailConfigured: this.email.configured,
			leads: { pending, queued, errors, activated },
		}
	}

	private async markError(leadId: string, action: string, message: string, durationMs: number, attempt: number): Promise<void> {
		await this.prisma.lead.update({
			where: { id: leadId },
			data: {
				onboardingStatus: 'ERROR',
				onboardingLastError: message,
				onboardingLastAttemptAt: new Date(),
				onboardingRetryCount: { increment: 1 },
			},
		})

		await this.log({ leadId, action, status: 'ERROR', error: message, durationMs, attempt })
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
