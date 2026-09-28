import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import type { SendEmailDto, UpdateTemplateDto } from './dto/email.dto'

export interface RenderedEmail {
	subject: string
	body: string
}

/**
 * Renderuje zmienne w szablonie:
 *
 * {{name}}
 * {{city}}
 * {{activationUrl}}
 *
 * Zmienne przekazane w wywołaniu mają pierwszeństwo
 * przed standardowymi danymi leada.
 */
export function renderTemplate(template: string, variables: Record<string, string | null | undefined>): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => {
		return variables[key] ?? ''
	})
}

/**
 * Szablony w bazie mogą zawierać pełny HTML.
 *
 * Jeżeli body zaczyna się od <!DOCTYPE albo <html,
 * traktujemy je jako gotowy HTML.
 *
 * W przeciwnym przypadku traktujemy je jako zwykły tekst
 * i zamieniamy linki oraz nowe linie na HTML.
 */
export function bodyToHtml(body: string): string {
	const trimmed = body.trim()

	if (trimmed.toLowerCase().startsWith('<!doctype html') || trimmed.toLowerCase().startsWith('<html')) {
		return trimmed
	}

	const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

	const withLinks = escaped.replace(
		/(https?:\/\/[^\s<]+)/g,
		url => `<a href="${url}" style="color:#e87522;text-decoration:underline;">${url}</a>`,
	)

	return `
		<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#292724;max-width:600px;margin:0 auto;">
			<div style="background:#e87522;padding:24px 20px;text-align:center;color:#fff;">
				<div style="font-size:26px;font-weight:bold;letter-spacing:1px;">BistroMapa.app</div>
				<div style="font-size:11px;opacity:0.85;margin-top:4px;">Odkrywaj restauracje, zarządzaj profilami</div>
			</div>
			<div style="padding:28px 24px;background:#fff;border:1px solid #eceae5;border-top:none;">
				${withLinks.replace(/\n/g, '<br>')}
			</div>
			<div style="padding:14px 24px;background:#f7f5f0;text-align:center;font-size:12px;color:#7a7468;border:1px solid #eceae5;border-top:none;">
				© BistroMapa.app · <a href="https://bistromapa.app" style="color:#e87522;text-decoration:underline;">bistromapa.app</a>
			</div>
		</div>
	`
}

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private readonly resend?: Resend
	private readonly from: string

	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		config: ConfigService,
	) {
		const apiKey = config.get<string>('RESEND_API')?.trim()
		this.from = config.get<string>('EMAIL_FROM')?.trim() || 'BistroMapa <kontakt@bistromapa.app>'

		if (apiKey) {
			this.resend = new Resend(apiKey)
		} else {
			this.logger.warn('RESEND_API nie jest ustawiona — wysyłka emaili będzie niedostępna')
		}
	}

	get configured(): boolean {
		return this.resend !== undefined && this.from !== ''
	}

	/**
	 * Lista wszystkich szablonów emaili.
	 */
	async listTemplates() {
		return this.prisma.emailTemplate.findMany({
			orderBy: { key: 'asc' },
		})
	}

	/**
	 * Aktualizacja szablonu emaila.
	 */
	async updateTemplate(id: string, dto: UpdateTemplateDto) {
		const template = await this.prisma.emailTemplate.findUnique({
			where: { id },
		})

		if (!template) {
			throw new NotFoundException('Szablon nie istnieje')
		}

		return this.prisma.emailTemplate.update({
			where: { id },
			data: {
				subject: dto.subject,
				body: dto.body,
			},
		})
	}

	/**
	 * Lista logów wysłanych emaili.
	 */
	async listLogs(leadId: string | undefined, page: number, limit: number) {
		const where = leadId ? { leadId } : {}

		const [items, total] = await Promise.all([
			this.prisma.emailLog.findMany({
				where,
				orderBy: { sentAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
				include: {
					lead: {
						select: {
							id: true,
							name: true,
						},
					},
				},
			}),
			this.prisma.emailLog.count({ where }),
		])

		return {
			items,
			total,
			page,
			limit,
			pages: Math.max(1, Math.ceil(total / limit)),
		}
	}

	/**
	 * Główna metoda wysyłania emaili.
	 *
	 * Wszystkie automatyczne i ręczne wiadomości
	 * powinny przechodzić przez tę metodę.
	 */
	async send(dto: SendEmailDto, adminUserId: string | null) {
		const lead = await this.prisma.lead.findUnique({
			where: { id: dto.leadId },
		})

		if (!lead) {
			throw new NotFoundException('Lead nie istnieje')
		}

		const recipient = dto.to?.trim() || lead.email?.trim()

		if (!recipient) {
			throw new BadRequestException('Lead nie ma adresu email — podaj odbiorcę ręcznie')
		}

		const template = await this.prisma.emailTemplate.findUnique({
			where: {
				key: dto.templateKey,
			},
		})

		if (!template && (!dto.subject || !dto.body)) {
			throw new BadRequestException(`Szablon "${dto.templateKey}" nie istnieje — podaj temat i treść ręcznie`)
		}

		const variables: Record<string, string | null | undefined> = {
			name: lead.name,
			city: lead.city,
			address: lead.address,
			phone: lead.phone,
			contactPerson: lead.contactPerson,
			email: lead.email,
			website: lead.website,

			// Zmienne przekazane przy konkretnym wysłaniu
			// nadpisują standardowe dane leada.
			...(dto.variables ?? {}),
		}

		const subject = renderTemplate(dto.subject ?? template?.subject ?? '', variables)

		const body = renderTemplate(dto.body ?? template?.body ?? '', variables)

		if (!this.resend) {
			const error = 'RESEND_API nie jest skonfigurowana'

			await this.logFailure(lead.id, template?.id ?? null, recipient, subject, adminUserId, error)

			throw new BadRequestException(error)
		}

		if (!subject.trim()) {
			throw new BadRequestException('Email nie ma tematu')
		}

		if (!body.trim()) {
			throw new BadRequestException('Email nie ma treści')
		}

		try {
			const result = await this.resend.emails.send({
				from: this.from,
				to: recipient,
				subject,
				text: this.htmlToPlainText(body),
				html: bodyToHtml(body),
			})

			this.logger.log(`Email wysłany do ${recipient} — "${subject}"`)

			await this.prisma.emailLog.create({
				data: {
					leadId: lead.id,
					templateId: template?.id ?? null,
					adminUserId,
					to: recipient,
					subject,
					status: 'SENT',
				},
			})

			await this.prisma.interaction.create({
				data: {
					leadId: lead.id,
					type: 'EMAIL',
					content: `Wysłano email: ${subject}`,
				},
			})

			await this.prisma.lead.update({
				where: {
					id: lead.id,
				},
				data: {
					contactAttempts: {
						increment: 1,
					},
					lastContactAt: new Date(),
				},
			})

			await this.audit.log({
				action: 'EMAIL_SENT',
				leadId: lead.id,
				adminUserId,
				details: {
					to: recipient,
					subject,
					resendId: result.data?.id ?? null,
				},
			})

			return {
				sent: true,
				to: recipient,
				resendId: result.data?.id ?? null,
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd wysyłki'

			this.logger.error(`Błąd wysyłki emaila do ${recipient}: ${message}`)

			await this.logFailure(lead.id, template?.id ?? null, recipient, subject, adminUserId, message)

			throw new BadRequestException(`Nie udało się wysłać emaila: ${message}`)
		}
	}

	/**
	 * Zamienia HTML na prosty tekst.
	 * Używane jako wersja text/plain emaila.
	 */
	private htmlToPlainText(body: string): string {
		return body
			.replace(/<br\s*\/?>/gi, '\n')
			.replace(/<\/p>/gi, '\n\n')
			.replace(/<\/div>/gi, '\n')
			.replace(/<[^>]+>/g, '')
			.replace(/&nbsp;/gi, ' ')
			.replace(/&amp;/gi, '&')
			.replace(/&lt;/gi, '<')
			.replace(/&gt;/gi, '>')
			.trim()
	}

	/**
	 * Loguje nieudaną próbę wysyłki.
	 */
	private async logFailure(
		leadId: string,
		templateId: string | null,
		to: string,
		subject: string,
		adminUserId: string | null,
		error: string,
	): Promise<void> {
		await this.prisma.emailLog.create({
			data: {
				leadId,
				templateId,
				adminUserId,
				to,
				subject,
				status: 'ERROR',
				error,
			},
		})
	}
}
