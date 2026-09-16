import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import nodemailer, { type Transporter } from 'nodemailer'

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

@Injectable()
export class EmailService {
	private readonly logger = new Logger(EmailService.name)
	private readonly transporter: Transporter | null
	private readonly from: string

	constructor(
		private readonly prisma: PrismaService,
		private readonly audit: AuditService,
		config: ConfigService,
	) {
		const host = config.get<string>('SMTP_HOST')
		const user = config.get<string>('SMTP_USER')
		const pass = config.get<string>('SMTP_PASS')
		const port = Number(config.get<string>('SMTP_PORT') ?? 587)

		this.from = config.get<string>('SMTP_FROM') ?? user ?? ''

		this.transporter = host && user
			? nodemailer.createTransport({
					host,
					port,
					secure: port === 465,
					auth: { user, pass },
				})
			: null

		if (!this.transporter) {
			this.logger.warn('SMTP nie jest skonfigurowane — wysyłka emaili zwróci błąd zamiast cichego sukcesu')
		}
	}

	get configured(): boolean {
		return this.transporter !== null && this.from !== ''
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
		}

		const subject = renderTemplate(dto.subject ?? template?.subject ?? '', variables)
		const body = renderTemplate(dto.body ?? template?.body ?? '', variables)

		if (!this.transporter) {
			await this.logFailure(dto.leadId, template?.id ?? null, recipient, subject, adminUserId, 'SMTP nie jest skonfigurowane')
			throw new BadRequestException('SMTP nie jest skonfigurowane — uzupełnij SMTP_HOST/SMTP_USER/SMTP_PASS w backendzie')
		}

		try {
			await this.transporter.sendMail({ from: this.from, to: recipient, subject, text: body })

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
