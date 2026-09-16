import { ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'

import { AuditService } from '../audit/audit.service'
import { addDays, startOfToday, startOfTomorrow } from '../common/dates'
import { paginate, type Paginated } from '../common/dto/pagination.dto'
import { PrismaService } from '../prisma/prisma.service'
import { DedupService, type DuplicateMatch } from './dedup.service'
import { CreateLeadDto } from './dto/create-lead.dto'
import { MergeLeadDto, UpdateConsentDto, UpdateLeadDto, UpdateLeadStatusDto } from './dto/update-lead.dto'
import { parseStatusList, type QueryLeadsDto } from './dto/query-leads.dto'

@Injectable()
export class LeadsService {
	constructor(
		private readonly prisma: PrismaService,
		private readonly dedup: DedupService,
		private readonly audit: AuditService,
	) {}

	async findAll(query: QueryLeadsDto): Promise<Paginated<unknown>> {
		const where = this.buildWhere(query)
		const orderBy = { [query.sortBy ?? 'createdAt']: query.sortDir ?? 'desc' }

		const [items, total] = await Promise.all([
			this.prisma.lead.findMany({
				where,
				orderBy,
				skip: query.skip,
				take: query.limit,
				include: { _count: { select: { interactions: true, followUps: true } } },
			}),
			this.prisma.lead.count({ where }),
		])

		return paginate(items, total, query.page, query.limit)
	}

	async findOne(id: string) {
		const lead = await this.prisma.lead.findUnique({
			where: { id },
			include: {
				interactions: { orderBy: { createdAt: 'desc' }, take: 100 },
				followUps: { orderBy: { scheduledAt: 'desc' }, take: 50 },
				campaignJob: { select: { id: true, city: true, category: true, campaign: { select: { id: true, name: true } } } },
			},
		})

		if (!lead) throw new NotFoundException('Lead nie istnieje')

		const auditLogs = await this.prisma.auditLog.findMany({
			where: { leadId: id },
			orderBy: { createdAt: 'desc' },
			take: 30,
			include: { adminUser: { select: { email: true, name: true } } },
		})

		return { ...lead, auditLogs }
	}

	/** Sprawdzenie duplikatów bez zapisu — używane przez formularz przed dodaniem. */
	async checkDuplicates(identity: { name: string; city: string; phone?: string; email?: string; website?: string; nip?: string }) {
		return this.dedup.findDuplicates(identity)
	}

	async create(dto: CreateLeadDto, adminUserId: string, ip?: string) {
		const { force, ...data } = dto
		const duplicates = await this.dedup.findDuplicates({
			name: data.name,
			city: data.city,
			phone: data.phone,
			email: data.email,
			website: data.website,
			nip: data.nip,
		})

		// Nic nie zapisujemy bez decyzji użytkownika (readme §16).
		if (duplicates.length > 0 && force !== true) {
			throw new ConflictException({
				message: 'Znaleziono możliwe duplikaty — potwierdź dodanie',
				details: { duplicates } satisfies { duplicates: DuplicateMatch[] },
			})
		}

		const lead = await this.prisma.lead.create({
			data: {
				...data,
				source: data.source ?? 'MANUAL',
				contactAttempts: 0,
			},
		})

		await this.audit.log({
			action: 'LEAD_CREATED',
			leadId: lead.id,
			adminUserId,
			ip,
			details: { name: lead.name, city: lead.city, source: lead.source, duplicatesIgnored: force === true ? duplicates.length : 0 },
		})

		return { lead, duplicates }
	}

	async update(id: string, dto: UpdateLeadDto, adminUserId: string, ip?: string) {
		await this.assertExists(id)

		const lead = await this.prisma.lead.update({ where: { id }, data: dto })

		await this.audit.log({
			action: 'LEAD_UPDATED',
			leadId: id,
			adminUserId,
			ip,
			details: { fields: Object.keys(dto) },
		})

		return lead
	}

	async updateStatus(id: string, dto: UpdateLeadStatusDto, adminUserId: string, ip?: string) {
		const current = await this.assertExists(id)

		const lead = await this.prisma.lead.update({
			where: { id },
			data: { status: dto.status },
		})

		await this.audit.log({
			action: 'STATUS_CHANGED',
			leadId: id,
			adminUserId,
			ip,
			details: { from: current.status, to: dto.status },
		})

		return lead
	}

	async updateConsent(id: string, dto: UpdateConsentDto, adminUserId: string, ip?: string) {
		await this.assertExists(id)

		const lead = await this.prisma.lead.update({
			where: { id },
			data: {
				consentStatus: dto.consentStatus,
				consentSource: dto.consentSource ?? null,
				consentNotes: dto.consentNotes ?? null,
				consentAt: new Date(),
			},
		})

		await this.audit.log({
			action: 'CONSENT_UPDATED',
			leadId: id,
			adminUserId,
			ip,
			details: { consentStatus: dto.consentStatus, consentSource: dto.consentSource ?? null },
		})

		return lead
	}

	async remove(id: string, adminUserId: string, ip?: string): Promise<{ deleted: true }> {
		const lead = await this.assertExists(id)

		// Historia kontaktów i follow-upy lecą kaskadowo (schema: onDelete: Cascade).
		await this.prisma.lead.delete({ where: { id } })

		await this.audit.log({
			action: 'LEAD_DELETED',
			adminUserId,
			ip,
			details: { deletedLeadId: id, name: lead.name, city: lead.city },
		})

		return { deleted: true }
	}

	/** Scalanie duplikatu: historia i follow-upy przechodzą na leada docelowego (readme §16). */
	async merge(targetId: string, dto: MergeLeadDto, adminUserId: string, ip?: string) {
		const target = await this.assertExists(targetId)
		const source = await this.assertExists(dto.sourceLeadId)

		if (target.id === source.id) {
			throw new ConflictException('Nie można scalić leada z samym sobą')
		}

		await this.prisma.$transaction(async (tx) => {
			await tx.interaction.updateMany({ where: { leadId: source.id }, data: { leadId: target.id } })
			await tx.followUp.updateMany({ where: { leadId: source.id }, data: { leadId: target.id } })

			// Uzupełniamy tylko puste pola — nie nadpisujemy danych docelowych.
			await tx.lead.update({
				where: { id: target.id },
				data: {
					address: target.address ?? source.address,
					phone: target.phone ?? source.phone,
					email: target.email ?? source.email,
					website: target.website ?? source.website,
					nip: target.nip ?? source.nip,
					category: target.category ?? source.category,
					contactPerson: target.contactPerson ?? source.contactPerson,
					contactAttempts: target.contactAttempts + source.contactAttempts,
					notes: [target.notes, source.notes].filter(Boolean).join('\n---\n') || null,
				},
			})

			await tx.lead.delete({ where: { id: source.id } })
		})

		await this.audit.log({
			action: 'LEAD_MERGED',
			leadId: targetId,
			adminUserId,
			ip,
			details: { mergedFrom: source.id, mergedFromName: source.name, keptAsDeclined: dto.keepSourceAsDeclined ?? false },
		})

		return this.prisma.lead.findUnique({ where: { id: targetId } })
	}

	private async assertExists(id: string) {
		const lead = await this.prisma.lead.findUnique({ where: { id } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		return lead
	}

	private buildWhere(query: QueryLeadsDto): Prisma.LeadWhereInput {
		const where: Prisma.LeadWhereInput = {}
		const statuses = parseStatusList(query.status)

		if (statuses.length > 0) where.status = { in: statuses }
		if (query.city) where.city = { equals: query.city, mode: 'insensitive' }
		if (query.category) where.category = { equals: query.category, mode: 'insensitive' }
		if (query.source) where.source = query.source

		if (query.lastContactFrom || query.lastContactTo) {
			where.lastContactAt = {
				...(query.lastContactFrom ? { gte: new Date(query.lastContactFrom) } : {}),
				...(query.lastContactTo ? { lte: new Date(query.lastContactTo) } : {}),
			}
		}

		const now = new Date()
		if (query.followUp === 'overdue') {
			where.nextFollowUpAt = { lt: startOfToday(now) }
		} else if (query.followUp === 'today') {
			where.nextFollowUpAt = { gte: startOfToday(now), lt: startOfTomorrow(now) }
		} else if (query.followUp === 'week') {
			where.nextFollowUpAt = { gte: startOfToday(now), lt: addDays(startOfToday(now), 7) }
		} else if (query.followUp === 'none') {
			where.nextFollowUpAt = null
		}

		if (query.search) {
			const search = query.search.trim()
			where.OR = [
				{ name: { contains: search, mode: 'insensitive' } },
				{ city: { contains: search, mode: 'insensitive' } },
				{ address: { contains: search, mode: 'insensitive' } },
				{ email: { contains: search, mode: 'insensitive' } },
				{ phone: { contains: search } },
				{ nip: { contains: search } },
				{ contactPerson: { contains: search, mode: 'insensitive' } },
			]
		}

		return where
	}
}
