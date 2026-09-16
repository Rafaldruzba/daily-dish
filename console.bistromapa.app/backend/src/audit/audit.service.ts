import { Injectable, Logger } from '@nestjs/common'

import { PrismaService } from '../prisma/prisma.service'

export type AuditAction =
	| 'LOGIN'
	| 'LOGIN_FAILED'
	| 'LEAD_CREATED'
	| 'LEAD_UPDATED'
	| 'STATUS_CHANGED'
	| 'CONSENT_UPDATED'
	| 'LEAD_DELETED'
	| 'LEAD_MERGED'
	| 'EMAIL_SENT'
	| 'ACCOUNT_CREATED'
	| 'INVITATION_SENT'
	| 'IMPORT_STARTED'
	| 'IMPORT_FINISHED'
	| 'CAMPAIGN_CREATED'
	| 'CAMPAIGN_RUN'
	| 'AUTOMATION_RETRY'

export interface AuditEntry {
	action: AuditAction
	leadId?: string | null
	adminUserId?: string | null
	details?: unknown
	ip?: string | null
}

/** Zapis ważnych operacji (readme §29). Nigdy nie przerywa akcji, którą loguje. */
@Injectable()
export class AuditService {
	private readonly logger = new Logger(AuditService.name)

	constructor(private readonly prisma: PrismaService) {}

	async log(entry: AuditEntry): Promise<void> {
		try {
			await this.prisma.auditLog.create({
				data: {
					action: entry.action,
					leadId: entry.leadId ?? null,
					adminUserId: entry.adminUserId ?? null,
					details: entry.details === undefined ? null : JSON.stringify(entry.details),
					ip: entry.ip ?? null,
				},
			})
		} catch (error) {
			this.logger.error(`Nie udało się zapisać audytu ${entry.action}: ${error instanceof Error ? error.message : String(error)}`)
		}
	}

	async findMany(params: { leadId?: string; action?: string; page: number; limit: number }) {
		const where = {
			...(params.leadId ? { leadId: params.leadId } : {}),
			...(params.action ? { action: params.action } : {}),
		}

		const [items, total] = await Promise.all([
			this.prisma.auditLog.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (params.page - 1) * params.limit,
				take: params.limit,
				include: {
					lead: { select: { id: true, name: true } },
					adminUser: { select: { id: true, email: true, name: true } },
				},
			}),
			this.prisma.auditLog.count({ where }),
		])

		return { items, total }
	}
}
