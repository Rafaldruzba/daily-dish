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

/** Zmienne dostępne w szablonach — treści nie są hardkodowane w komponentach (§23). */
export function renderTemplate(template: string, variables: Record<string, string | null | undefined>): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => variables[key] ?? '')
}

/**
 * Szablony w bazie są zwykłym tekstem (tak je edytuje panel), a Resend wysyła HTML.
 * Dlatego escapujemy znaczniki i zamieniamy nowe linie na <br> — inaczej treść
 * zlewa się w jeden akapit, a link aktywacyjny nie jest klikalny.
 */
export function bodyToHtml(body: string): string {
	const escaped = body.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

	const withLinks = escaped.replace(
		/(https?:\/\/[^\s<]+)/g,
		(url) => `<a href="${url}" style="color:#1c1917">${url}</a>`,
	)

	return `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#1c1917">${withLinks.replace(/\n/g, '<br>')}</div>`
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
		const apiKey = config.get<string>('RESEND_API')
		this.from = config.get<string>('EMAIL_FROM') ?? ''

		if (apiKey) {
			this.resend = new Resend(apiKey)
		} else {
			this.logger.warn('RESEND_API nie jest ustawiona — wysyłka emaili zwróci błąd')
		}
	}

	get configured(): boolean {
		return this.resend !== undefined && this.from !== ''
	}

	async listTemplates() {
		return this.prisma.emailTemplate.findMany({ orderBy: { key: 'asc' } })
	}

	async updateTemplate(id: string, dto: UpdateTemplateDto) {
		const template = await this.prisma.emailTemplate.findUnique({ where: { id } })
		if (!template) throw new NotFoundException('Szablon nie istnieje')

		return this.prisma.emailTemplate.update({ where: { id }, data: { subject: dto.subject, body: dto.body } })
	}

	async listLogs(leadId: string | undefined, page: number, limit: number) {
		const where = leadId ? { leadId } : {}

		const [items, total] = await Promise.all([
			this.prisma.emailLog.findMany({
				where,
				orderBy: { sentAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
				include: { lead: { select: { id: true, name: true } } },
			}),
			this.prisma.emailLog.count({ where }),
		])

		return { items, total, page, limit, pages: Math.max(1, Math.ceil(total / limit)) }
	}

	/** Wysyłka z szablonu — logujemy każde wysłanie i błąd (readme §23). */
	async send(dto: SendEmailDto, adminUserId: string | null) {
		const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		const recipient = dto.to ?? lead.email
		if (!recipient) throw new BadRequestException('Lead nie ma adresu email — podaj odbiorcę ręcznie')

		const template = await this.prisma.emailTemplate.findUnique({ where: { key: dto.templateKey } })
		if (!template && (!dto.subject || !dto.body)) {
			throw new BadRequestException(`Szablon "${dto.templateKey}" nie istnieje — podaj temat i treść ręcznie`)
		}

		const variables = {
			name: lead.name,
			city: lead.city,
			address: lead.address,
			phone: lead.phone,
			contactPerson: lead.contactPerson,
			email: lead.email,
			website: lead.website,
			// Zmienne wywołania (np. activationUrl) nadpisują dane leada.
			...(dto.variables ?? {}),
		}

		const subject = renderTemplate(dto.subject ?? template?.subject ?? '', variables)
		const body = renderTemplate(dto.body ?? template?.body ?? '', variables)

		if (!this.resend) {
			await this.logFailure(dto.leadId, template?.id ?? null, recipient, subject, adminUserId, 'RESEND_API nie jest skonfigurowana')
			throw new BadRequestException('RESEND_API nie jest skonfigurowana — uzupełnij w backendzie')
		}

		try {
			await this.resend.emails.send({
				from: this.from,
				to: recipient,
				subject,
				text: body,
				html: bodyToHtml(body),
			})

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
				where: { id: lead.id },
				data: { contactAttempts: { increment: 1 }, lastContactAt: new Date() },
			})

			await this.audit.log({ action: 'EMAIL_SENT', leadId: lead.id, adminUserId, details: { to: recipient, subject } })

			return { sent: true, to: recipient }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd wysyłki'
			await this.logFailure(lead.id, template?.id ?? null, recipient, subject, adminUserId, message)

			throw new BadRequestException(`Nie udało się wysłać emaila: ${message}`)
		}
	}

	private async logFailure(
		leadId: string,
		templateId: string | null,
		to: string,
		subject: string,
		adminUserId: string | null,
		error: string,
	): Promise<void> {
		await this.prisma.emailLog.create({
			data: { leadId, templateId, adminUserId, to, subject, status: 'ERROR', error },
		})
	}
}
