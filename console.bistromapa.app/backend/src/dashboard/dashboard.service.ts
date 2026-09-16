import { Injectable } from '@nestjs/common'

import { addDays, startOfToday, startOfTomorrow } from '../common/dates'
import { PrismaService } from '../prisma/prisma.service'

/** Statystyki dashboardu (readme §11). */
@Injectable()
export class DashboardService {
	constructor(private readonly prisma: PrismaService) {}

	async getStats() {
		const today = startOfToday()
		const tomorrow = startOfTomorrow()

		const [
			total,
			byStatusRaw,
			followUpToday,
			overdue,
			upcoming,
			acceptedPendingOnboarding,
			onboardingErrors,
			recentLeads,
			todayFollowUps,
			overdueFollowUps,
			recentInteractions,
		] = await Promise.all([
			this.prisma.lead.count(),
			this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
			this.prisma.followUp.count({
				where: { completed: false, scheduledAt: { gte: today, lt: tomorrow } },
			}),
			this.prisma.followUp.count({
				where: { completed: false, scheduledAt: { lt: today } },
			}),
			this.prisma.followUp.count({
				where: { completed: false, scheduledAt: { gte: tomorrow, lt: addDays(today, 7) } },
			}),
			this.prisma.lead.count({ where: { status: 'ACCEPTED', onboardingStatus: 'NOT_STARTED' } }),
			this.prisma.lead.count({ where: { onboardingStatus: 'ERROR' } }),
			this.prisma.lead.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
			this.prisma.followUp.findMany({
				where: { completed: false, scheduledAt: { gte: today, lt: tomorrow } },
				orderBy: { scheduledAt: 'asc' },
				take: 5,
				include: { lead: { select: { id: true, name: true, city: true, phone: true, status: true } } },
			}),
			this.prisma.followUp.findMany({
				where: { completed: false, scheduledAt: { lt: today } },
				orderBy: { scheduledAt: 'asc' },
				take: 5,
				include: { lead: { select: { id: true, name: true, city: true, phone: true, status: true } } },
			}),
			this.prisma.interaction.findMany({
				orderBy: { createdAt: 'desc' },
				take: 5,
				include: { lead: { select: { id: true, name: true } } },
			}),
		])

		const byStatus: Record<string, number> = {}
		for (const row of byStatusRaw) {
			byStatus[row.status] = row._count._all
		}

		return {
			leads: { total, byStatus },
			followUps: { today: followUpToday, overdue, upcoming },
			onboarding: { pending: acceptedPendingOnboarding, errors: onboardingErrors },
			recentLeads,
			todayFollowUps,
			overdueFollowUps,
			recentInteractions,
		}
	}
}
