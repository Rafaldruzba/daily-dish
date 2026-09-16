import { Queue, Worker } from 'bullmq'
import prisma from '../lib/prisma.js'
import { fetchRestaurantDish } from './facebook.service.js'
import logger from './logger.service.js'
import { sendAdminScrapingAlert } from './email.service.js'

const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
const REDIS_PORT = process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined

const connection = {
	host: REDIS_HOST,
	port: REDIS_PORT,
	password: REDIS_PASSWORD,
}

// 1. Inicjalizacja kolejki
export const scraperQueue = new Queue('scraper-queue', { connection })

/**
 * Dodaje wszystkie aktywne i zatwierdzone restauracje do kolejki zadań skrapowania.
 */
export async function queueAllScrapingJobs() {
	try {
		await logger.info('⏰ [Scraper Queue] Rozpoczynam dodawanie lokali do kolejki zadań...')

		const restaurants = await prisma.restaurant.findMany({
			where: {
				isActive: true,
				status: 'ACTIVE',
			},
		})

		if (restaurants.length === 0) {
			await logger.warn('⚠️ [Scraper Queue] Brak aktywnych restauracji do skrapowania.')
			return []
		}

		const jobs = []
		for (const r of restaurants) {
			// Dodajemy pojedyncze zadanie dla każdego lokalu z unikalnym ID
			const job = await scraperQueue.add(
				'scrape-restaurant',
				{
					restaurantId: r.id,
					name: r.name,
					facebookUrl: r.facebookUrl,
				},
				{
					attempts: 3, // Autoretry 3 razy przy błędzie sieci
					backoff: {
						type: 'exponential',
						delay: 5000, // Odczekaj 5 sekund przed ponowną próbą
					},
				}
			)
			jobs.push({ jobId: job.id, restaurant: r.name })
		}

		await logger.info(`✅ [Scraper Queue] Pomyślnie zakolejkowano ${jobs.length} zadań skrapowania.`)
		return jobs
	} catch (error: any) {
		await logger.error('❌ [Scraper Queue] Błąd podczas dodawania zadań do kolejki:', error.message || error)
		throw error
	}
}

// 2. Definicja Workera
// Concurrency: 5 — automatyczny load-balancer obciążenia (odpala 5 scraperów jednocześnie w tle!)
export const scraperWorker = new Worker(
	'scraper-queue',
	async job => {
		const { restaurantId, name, facebookUrl } = job.data
		console.log(`🤖 [Scraper Worker] Przetwarzanie lokalu: ${name} (ID: ${restaurantId})`)

		// Sprawdzamy restaurację w bazie
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
			include: { standardOffers: true },
		})

		if (!restaurant || !restaurant.isActive || restaurant.status !== 'ACTIVE') {
			console.log(`⚠️ [Scraper Worker] Lokal ${name} jest nieaktywny, omijanie zadania.`)
			return { status: 'skipped', reason: 'Restaurant is not active' }
		}

		const today = new Date()
		today.setUTCHours(0, 0, 0, 0)

		try {
			// Pobieramy ofertę z Facebooka
			const dishResult = await fetchRestaurantDish({ id: restaurantId, name, facebookUrl })

			if (dishResult) {
				// Upload image to S3 if available
				let s3ImageUrl = dishResult.imageUrl || null
				if (s3ImageUrl) {
					try {
						const { uploadImageFromUrl } = await import('./storage.service.js')
						const uploadedUrl = await uploadImageFromUrl(s3ImageUrl, 'scraped')
						if (uploadedUrl) {
							s3ImageUrl = uploadedUrl
						}
					} catch (s3Err: any) {
						console.error('⚠️ [Scraper Worker] Failed to upload scraped image to S3:', s3Err.message || s3Err)
					}
				}

				// Sukces — zapisujemy pobrane danie w bazie
				await prisma.dailyDish.upsert({
					where: {
						restaurantId_date: {
							restaurantId,
							date: today,
						},
					},
					update: {
						name: dishResult.name,
						description: dishResult.description || null,
						price: dishResult.price || null,
						imageUrl: s3ImageUrl,
						sourceUrl: dishResult.sourceUrl || null,
						sourcePostId: dishResult.sourcePostId || null,
						publishedAt: new Date(),
					},
					create: {
						restaurantId,
						name: dishResult.name,
						description: dishResult.description || null,
						price: dishResult.price || null,
						imageUrl: s3ImageUrl,
						sourceUrl: dishResult.sourceUrl || null,
						sourcePostId: dishResult.sourcePostId || null,
						date: today,
						publishedAt: new Date(),
					},
				})

				return { status: 'success', name: dishResult.name }
			} else {
				// Brak posta na FB — sprawdzamy czy istnieje Oferta Stała
				const activeOffer = restaurant.standardOffers?.find((o: any) => o.isActive)
				if (activeOffer) {
					await prisma.dailyDish.upsert({
						where: {
							restaurantId_date: {
								restaurantId,
								date: today,
							},
						},
						update: {
							name: activeOffer.title,
							description: activeOffer.description || null,
							price: activeOffer.price || null,
							imageUrl: activeOffer.imageUrl || null,
							publishedAt: new Date(),
						},
						create: {
							restaurantId,
							name: activeOffer.title,
							description: activeOffer.description || null,
							price: activeOffer.price || null,
							imageUrl: activeOffer.imageUrl || null,
							date: today,
							publishedAt: new Date(),
						},
					})

					return { status: 'success_fallback', name: activeOffer.title }
				}

				throw new Error('Brak dzisiejszego posta oraz brak oferty stałej (StandardOffer) w bazie.')
			}
		} catch (error: any) {
			console.error(`❌ [Scraper Worker] Błąd dla lokalu ${name}:`, error.message || error)
			throw error // Wyrzucamy błąd, aby BullMQ obsłużył próbę ponownego uruchomienia (attempts)
		}
	},
	{
		connection,
		concurrency: 5, // Autopoziomowanie — max 5 bocznych procesów Chromium na raz
	}
)

// Obsługa globalnych zdarzeń kolejki
scraperWorker.on('completed', job => {
	console.log(`✅ [Scraper Queue] Zadanie ${job.id} dla lokalu ${job.data.name} zakończone sukcesem!`)
})

scraperWorker.on('failed', async (job, err) => {
	console.error(`❌ [Scraper Queue] Zadanie ${job?.id} dla lokalu ${job?.data.name} nie powiodło się po ponowieniach:`, err.message)
	
	// Wysyłamy alert o błędzie na Gmaila admina
	if (job) {
		await sendAdminScrapingAlert([{ name: job.data.name, reason: err.message }])
	}
})
