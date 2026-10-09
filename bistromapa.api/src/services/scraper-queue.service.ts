import { Queue, Worker } from 'bullmq'
import prisma from '../lib/prisma.js'
import logger from './logger.service.js'
import { sendAdminScrapingAlert } from './email.service.js'
import { syncRestaurantMenus } from './menu-sync.service.js'

const connection = {
	host: process.env.REDIS_HOST || 'localhost',
	port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
	password: process.env.REDIS_PASSWORD || undefined,
}

const JOB_NAME = 'scrape-all'

export const scraperQueue = new Queue('scraper-queue', { connection })

const getActiveRestaurantIds = async () => {
	const rows = await prisma.restaurant.findMany({
		where: { isActive: true, status: 'ACTIVE' },
		select: { id: true },
		orderBy: { id: 'asc' },
	})
	return rows.map(r => r.id)
}

/**
 * Zleca scrapowanie wszystkich aktywnych lokali (jeden job).
 * Stały jobId: jeśli poprzedni job jeszcze trwa, nowy nie zostanie dodany (brak podwójnych kosztów).
 */
export async function queueAllScrapingJobs() {
	const restaurants = (await getActiveRestaurantIds()).length

	if (restaurants === 0) {
		await logger.warn('⚠️ [Scraper Queue] Brak aktywnych restauracji do skrapowania.')
		return { jobId: null, restaurants: 0 }
	}

	const job = await scraperQueue.add(
		JOB_NAME,
		{},
		{ jobId: JOB_NAME, attempts: 1, removeOnComplete: true, removeOnFail: true },
	)
	await logger.info(`✅ [Scraper Queue] Zlecono scrapowanie ${restaurants} lokali (job ${job.id}).`)
	return { jobId: job.id, restaurants }
}

export const scraperWorker = new Worker(
	'scraper-queue',
	async job => {
		// stare joby "per lokal", które mogły zostać w Redisie
		if (job.name !== JOB_NAME) return { skipped: true }

		const ids = await getActiveRestaurantIds()
		await logger.info(`🤖 [Scraper Worker] Start: ${ids.length} lokali`)
		return syncRestaurantMenus(ids)
	},
	{ connection, concurrency: 1 },
)

scraperWorker.on('failed', async (job, err) => {
	await logger.error(`❌ [Scraper Queue] Job ${job?.id} nie powiódł się:`, err.message)
	await sendAdminScrapingAlert([{ name: 'Scraping (cały przebieg)', reason: err.message }])
})
