import { Injectable, NotFoundException } from '@nestjs/common'

import { paginate, type Paginated } from '../common/dto/pagination.dto'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateFollowUpDto, QueryFollowUpsDto, UpdateFollowUpDto } from './dto/follow-up.dto'

@Injectable()
export class FollowUpsService {
	constructor(private readonly prisma: PrismaService) {}

	async findMany(query: QueryFollowUpsDto): Promise<Paginated<unknown>> {
		const where = {
			...(query.leadId ? { leadId: query.leadId } : {}),
			...(query.pending === 'true' ? { completed: false } : {}),
			...(query.from || query.to
				? {
						scheduledAt: {
							...(query.from ? { gte: new Date(query.from) } : {}),
							...(query.to ? { lte: new Date(query.to) } : {}),
						},
					}
				: {}),
		}

		const [items, total] = await Promise.all([
			this.prisma.followUp.findMany({
				where,
				orderBy: { scheduledAt: 'asc' },
				skip: query.skip,
				take: query.limit,
				include: { lead: { select: { id: true, name: true, city: true, phone: true, status: true } } },
			}),
			this.prisma.followUp.count({ where }),
		])

		return paginate(items, total, query.page, query.limit)
	}

	async create(dto: CreateFollowUpDto) {
		const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		const followUp = await this.prisma.followUp.create({
			data: {
				leadId: dto.leadId,
				scheduledAt: new Date(dto.scheduledAt),
				notes: dto.notes ?? null,
			},
		})

		await this.syncLeadNextFollowUp(dto.leadId)

		return followUp
	}

	async update(id: string, dto: UpdateFollowUpDto) {
		const followUp = await this.prisma.followUp.findUnique({ where: { id } })
		if (!followUp) throw new NotFoundException('Follow-up nie istnieje')

		const updated = await this.prisma.followUp.update({
			where: { id },
			data: {
				...(dto.notes !== undefined ? { notes: dto.notes } : {}),
				...(dto.completed !== undefined
					? { completed: dto.completed, completedAt: dto.completed ? new Date() : null }
					: {}),
			},
		})

		await this.syncLeadNextFollowUp(followUp.leadId)

		return updated
	}

	async remove(id: string): Promise<{ deleted: true }> {
		const followUp = await this.prisma.followUp.findUnique({ where: { id } })
		if (!followUp) throw new NotFoundException('Follow-up nie istnieje')

		await this.prisma.followUp.delete({ where: { id } })
		await this.syncLeadNextFollowUp(followUp.leadId)

		return { deleted: true }
	}

	/** Lead.nextFollowUpAt = najbliższy niezakończony follow-up (readme §10). */
	async syncLeadNextFollowUp(leadId: string): Promise<void> {
		const next = await this.prisma.followUp.findFirst({
			where: { leadId, completed: false },
			orderBy: { scheduledAt: 'asc' },
		})

		await this.prisma.lead.update({
			where: { id: leadId },
			data: { nextFollowUpAt: next?.scheduledAt ?? null },
		})
	}
}
