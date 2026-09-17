import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { AuditService } from '../audit/audit.service'
import { paginate } from '../common/dto/pagination.dto'
import { DedupService } from '../leads/dedup.service'
import { PrismaService } from '../prisma/prisma.service'
import { type LeadSourceProvider } from './lead-source'
import { MockLeadSourceProvider } from './providers/mock.provider'
import { GoogleMapsProvider } from './providers/google-maps.provider'
import type { CreateCampaignDto, QueryCampaignsDto } from './dto/campaign.dto'

@Injectable()
export class CampaignsService {
	private readonly logger = new Logger(CampaignsService.name)
	private readonly provider: LeadSourceProvider

	constructor(
		private readonly prisma: PrismaService,
		private readonly dedup: DedupService,
		private readonly audit: AuditService,
		private readonly mock: MockLeadSourceProvider,
		private readonly google: GoogleMapsProvider,
		config: ConfigService,
	) {
		// Źródło danych jest wymienne (readme §19).
		// Nieznana wartość to BŁĄD KONFIGURACJI, nie cichy powrót do mocka — wcześniej brak
		// zmiennej oznaczał, że produkcja zbierała dane testowe mimo ustawionego klucza Google.
		const name = (config.get<string>('LEAD_SOURCE_PROVIDER') ?? 'mock').trim().toLowerCase()

		if (name !== 'mock' && name !== 'google') {
			throw new Error(`LEAD_SOURCE_PROVIDER="${name}" jest nieznane — dozwolone wartości: mock, google`)
		}

		this.provider = name === 'google' ? google : mock

		if (name === 'mock' && config.get<string>('NODE_ENV') === 'production') {
			this.logger.warn(
				'LEAD_SOURCE_PROVIDER=mock w środowisku produkcyjnym — kampanie zapiszą DANE TESTOWE, nie prawdziwe restauracje',
			)
		}
	}

	get activeProvider() {
		return { source: this.provider.source, configured: this.provider.configured }
	}

	async findAll(query: QueryCampaignsDto) {
		const where = query.status ? { status: query.status } : {}

		const [items, total] = await Promise.all([
			this.prisma.campaign.findMany({
				where,
				orderBy: { createdAt: 'desc' },
				skip: query.skip,
				take: query.limit,
				include: { _count: { select: { jobs: true } } },
			}),
			this.prisma.campaign.count({ where }),
		])

		return paginate(items, total, query.page, query.limit)
	}

	async findOne(id: string) {
		const campaign = await this.prisma.campaign.findUnique({
			where: { id },
			include: { jobs: { orderBy: { createdAt: 'asc' } } },
		})

		if (!campaign) throw new NotFoundException('Kampania nie istnieje')

		return {
			...campaign,
			summary: {
				resultsFound: campaign.jobs.reduce((sum, job) => sum + job.resultsFound, 0),
				newLeads: campaign.jobs.reduce((sum, job) => sum + job.newLeads, 0),
				duplicates: campaign.jobs.reduce((sum, job) => sum + job.duplicates, 0),
				pending: campaign.jobs.filter((job) => job.status === 'PENDING' || job.status === 'ERROR').length,
			},
		}
	}

	async create(dto: CreateCampaignDto, adminUserId: string, ip?: string) {
		const cities = dto.cities.map((city) => city.trim()).filter(Boolean)
		if (cities.length === 0) {
			throw new BadRequestException('Podaj co najmniej jedno miasto (dla całego kraju — listę miast do oblecenia)')
		}

		const campaign = await this.prisma.campaign.create({
			data: {
				name: dto.name,
				region: dto.region ?? null,
				category: dto.category ?? null,
				status: 'RUNNING',
				jobs: {
					create: cities.map((city) => ({
						city,
						category: dto.category ?? null,
						search: dto.search ?? null,
						limit: dto.limitPerJob ?? 100,
					})),
				},
			},
			include: { jobs: true },
		})

		await this.audit.log({
			action: 'CAMPAIGN_CREATED',
			adminUserId,
			ip,
			details: { campaign: campaign.name, jobs: campaign.jobs.length },
		})

		return campaign
	}

	/** Wykonuje zadania kampanii po kolei — można wznowić po błędzie (readme §18). */
	async run(campaignId: string) {
		const campaign = await this.prisma.campaign.findUnique({
			where: { id: campaignId },
			include: { jobs: { where: { status: { in: ['PENDING', 'ERROR'] } }, orderBy: { createdAt: 'asc' } } },
		})

		if (!campaign) throw new NotFoundException('Kampania nie istnieje')

		const results = []
		for (const job of campaign.jobs) {
			results.push(await this.runJob(job.id))
		}

		return { campaignId, processed: results.length, results }
	}

	async runJob(jobId: string) {
		const job = await this.prisma.campaignJob.findUnique({ where: { id: jobId } })
		if (!job) throw new NotFoundException('Zadanie kampanii nie istnieje')

		// Nieskonfigurowane źródło to błąd użytkownika (400 z czytelnym powodem),
		// a nie 500 — w panelu widać wtedy, czego brakuje.
		if (!this.provider.configured) {
			throw new BadRequestException(
				`Źródło leadów "${this.provider.source}" nie jest skonfigurowane — brakuje klucza API w środowisku backendu`,
			)
		}

		await this.prisma.campaignJob.update({
			where: { id: jobId },
			data: { status: 'RUNNING', startedAt: new Date() },
		})

		const startedAt = Date.now()

		try {
			const found = await this.provider.findLeads({
				city: job.city ?? undefined,
				category: job.category ?? undefined,
				search: job.search ?? undefined,
				limit: job.limit,
			})

			let newLeads = 0
			let duplicates = 0

			for (const raw of found) {
				if (!raw.name || !raw.city) continue

				const matches = await this.dedup.findDuplicates({
					name: raw.name,
					city: raw.city,
					phone: raw.phone,
					email: null,
					website: raw.website,
					nip: raw.nip,
				})

				if (matches.length > 0) {
					duplicates++
					continue
				}

				await this.prisma.lead.create({
					data: {
						name: raw.name,
						city: raw.city,
						address: raw.address ?? null,
						phone: raw.phone ?? null,
						website: raw.website ?? null,
						nip: raw.nip ?? null,
						category: raw.category ?? null,
						source: this.provider.source,
						sourceUrl: raw.sourceUrl ?? null,
						campaignJobId: jobId,
					},
				})
				newLeads++
			}

			const durationMs = Date.now() - startedAt
			await this.prisma.campaignJob.update({
				where: { id: jobId },
				data: {
					status: 'COMPLETED',
					resultsFound: found.length,
					newLeads,
					duplicates,
					completedAt: new Date(),
					errorMsg: null,
				},
			})

			await this.prisma.automationLog.create({
				data: {
					action: 'CAMPAIGN_JOB_RUN',
					status: 'SUCCESS',
					durationMs,
					attempt: job.retryCount + 1,
				},
			})

			await this.finishCampaignIfDone(job.campaignId)

			return { jobId, status: 'COMPLETED', resultsFound: found.length, newLeads, duplicates, durationMs }
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Nieznany błąd'
			this.logger.error(`Zadanie ${jobId} nie powiodło się: ${message}`)

			await this.prisma.campaignJob.update({
				where: { id: jobId },
				data: { status: 'ERROR', errorMsg: message, completedAt: new Date() },
			})

			await this.prisma.automationLog.create({
				data: {
					action: 'CAMPAIGN_JOB_RUN',
					status: 'ERROR',
					error: message,
					durationMs: Date.now() - startedAt,
					attempt: job.retryCount + 1,
				},
			})

			return { jobId, status: 'ERROR', errorMsg: message }
		}
	}

	async retryJob(jobId: string) {
		const job = await this.prisma.campaignJob.findUnique({ where: { id: jobId } })
		if (!job) throw new NotFoundException('Zadanie kampanii nie istnieje')

		await this.prisma.campaignJob.update({
			where: { id: jobId },
			data: { status: 'PENDING', errorMsg: null, retryCount: job.retryCount + 1 },
		})

		return this.runJob(jobId)
	}

	/** Kampania jest COMPLETED tylko wtedy, gdy żadne zadanie nie czeka i nie błyszczy błędem. */
	private async finishCampaignIfDone(campaignId: string): Promise<void> {
		const remaining = await this.prisma.campaignJob.count({
			where: { campaignId, status: { in: ['PENDING', 'RUNNING', 'ERROR'] } },
		})

		if (remaining === 0) {
			await this.prisma.campaign.update({ where: { id: campaignId }, data: { status: 'COMPLETED' } })
		}
	}
}
