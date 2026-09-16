import { Injectable, NotFoundException } from '@nestjs/common'

import { paginate, type Paginated } from '../common/dto/pagination.dto'
import { CONTACT_TYPES } from '../common/domain.constants'
import { PrismaService } from '../prisma/prisma.service'
import type { CreateInteractionDto } from './dto/create-interaction.dto'

@Injectable()
export class InteractionsService {
	constructor(private readonly prisma: PrismaService) {}

	async findByLead(leadId: string, page: number, limit: number): Promise<Paginated<unknown>> {
		const where = { leadId }

		const [items, total] = await Promise.all([
			this.prisma.interaction.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: (page - 1) * limit,
				take: limit,
			}),
			this.prisma.interaction.count({ where }),
		])

		return paginate(items, total, page, limit)
	}

	/**
	 * Historia kontaktów jest tylko dopisywana (readme §9) — brak metody update.
	 * Telefon/email/SMS liczą się jako próba kontaktu i odświeżają lastContactAt.
	 */
	async create(dto: CreateInteractionDto) {
		const lead = await this.prisma.lead.findUnique({ where: { id: dto.leadId } })
		if (!lead) throw new NotFoundException('Lead nie istnieje')

		const countsAsContact = CONTACT_TYPES.includes(dto.type)

		const [interaction] = await this.prisma.$transaction([
			this.prisma.interaction.create({
				data: {
					leadId: dto.leadId,
					type: dto.type,
					content: dto.content ?? null,
					contactPerson: dto.contactPerson ?? null,
				},
			}),
			this.prisma.lead.update({
				where: { id: dto.leadId },
				data: countsAsContact
					? { contactAttempts: { increment: 1 }, lastContactAt: new Date() }
					: {},
			}),
		])

		return interaction
	}

	async remove(id: string): Promise<{ deleted: true }> {
		const interaction = await this.prisma.interaction.findUnique({ where: { id } })
		if (!interaction) throw new NotFoundException('Interakcja nie istnieje')

		await this.prisma.interaction.delete({ where: { id } })

		return { deleted: true }
	}
}
