import { Queue, Worker } from 'bullmq'
import prisma from '../lib/prisma.js'
import { fetchRestaurantDish } from './facebook.service.js'
import logger from './logger.service.js'
import nodemailer from 'nodemailer'

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

/**
 * Funkcja wysyłająca powiadomienie e-mail do administratora w przypadku błędu pobierania dań
 */
export async function sendAdminScrapingAlert(failedJobs: any[]) {
	try {
		const transporter = nodemailer.createTransport({
			service: 'gmail',
			auth: {
				user: (process.env.GMAIL_USER || 'app.bistromapa@gmail.com').trim(),
				pass: (process.env.GMAIL_PASS || '').trim(),
			},
		})

		const mailOptions = {
			from: `"Bistromapa Alerty" <${(process.env.GMAIL_USER || 'app.bistromapa@gmail.com').trim()}>`,
			to: 'app.bistromapa@gmail.com', // MAIN_MAIL / ADMIN
			subject: '🚨 ALERT: Nie udało się pobrać dań dnia — Bistromapa.pl',
			html: `
				<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
					<h2 style="color: #c53030; text-align: center;">🚨 Alarm Scrapera Facebooka</h2>
					<p>Witaj Administratorze,</p>
					<p>Informujemy, że podczas dzisiejszego automatycznego cyklu pobierania ofert wystąpiły błędy. <strong>Liczba nieudanych pobrań: ${failedJobs.length}</strong>.</p>
					
					<p>Oto lista lokali, dla których pobieranie zakończyło się błędem:</p>
					<table style="width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px;">
						<thead>
							<tr style="background-color: #f7fafc; border-bottom: 1px solid #edf2f7;">
								<th style="padding: 10px; text-align: left;">Nazwa Restauracji</th>
								<th style="padding: 10px; text-align: left;">Błąd / Powód</th>
							</tr>
						</thead>
						<tbody>
							${failedJobs.map(job => `
								<tr style="border-bottom: 1px solid #edf2f7;">
									<td style="padding: 10px; font-weight: bold; color: #2d3748;">${job.name}</td>
									<td style="padding: 10px; color: #e53e3e; font-family: monospace;">${job.reason || 'Brak danych / Błąd sieciowy'}</td>
								</tr>
							`).join('')}
						</tbody>
					</table>
					
					<p style="margin-top: 25px; font-size: 12px; color: #718096; text-align: center;">
						Możesz spróbować uruchomić pobieranie ponownie w dowolnym momencie, klikając przycisk awaryjny w Panelu Administratora.<br />
						System Bistromapa.pl
					</p>
				</div>
			`,
		}

		await transporter.sendMail(mailOptions)
		console.log('📬 [Scraper Queue] Wysłano mailowy alert o błędach do Admina.')
	} catch (err) {
		console.error('❌ [Scraper Queue] Błąd podczas wysyłania alertu mailowego:', err)
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
						imageUrl: dishResult.imageUrl || null,
						sourceUrl: dishResult.sourceUrl || null,
						sourcePostId: dishResult.sourcePostId || null,
						publishedAt: new Date(),
					},
					create: {
						restaurantId,
						name: dishResult.name,
						description: dishResult.description || null,
						price: dishResult.price || null,
						imageUrl: dishResult.imageUrl || null,
						sourceUrl: dishResult.sourceUrl || null,
						sourcePostId: dishResult.sourcePostId || null,
						date: today,
						publishedAt: new Date(),
					},
				})

				return { status: 'success', name: dishResult.name }
			} else {
				// Brak posta na FB — sprawdzamy czy istnieje Oferta Stała
				if (restaurant.staticOfferTitle) {
					await prisma.dailyDish.upsert({
						where: {
							restaurantId_date: {
								restaurantId,
								date: today,
							},
						},
						update: {
							name: restaurant.staticOfferTitle,
							description: restaurant.staticOfferDesc || null,
							price: restaurant.staticOfferPrice || null,
							imageUrl: restaurant.staticOfferImg || null,
							publishedAt: new Date(),
						},
						create: {
							restaurantId,
							name: restaurant.staticOfferTitle,
							description: restaurant.staticOfferDesc || null,
							price: restaurant.staticOfferPrice || null,
							imageUrl: restaurant.staticOfferImg || null,
							date: today,
							publishedAt: new Date(),
						},
					})

					return { status: 'success_fallback', name: restaurant.staticOfferTitle }
				}

				throw new Error('Brak dzisiejszego posta oraz brak oferty stałej (staticOffer) w bazie.')
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
