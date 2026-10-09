import prisma from '../lib/prisma.js'
import logger from './logger.service.js'
import { sendAdminScrapingAlert } from './email.service.js'
import { uploadImageFromUrl } from './storage.service.js'
import { fetchRestaurantMenus, type ScrapedDish, type ScrapeOutput } from './facebook.service.js'

/** Lokali na jeden run Apify. Musi być ≤ MAX_RESTAURANTS_PER_RUN w scraperze. */
const BATCH_SIZE = 25

export interface SyncSummary {
	total: number // lokale na wejściu
	skipped: number // już miały dzisiejsze danie z Facebooka
	saved: number // zapisane z Facebooka
	fallback: number // zapisane z oferty stałej
	noMenu: number // brak menu i brak oferty stałej
	errors: number // błędy techniczne
	failedIds: string[]
}

type DishData = {
	name: string
	description: string | null
	price: number | null
	imageUrl: string | null
	sourceUrl: string | null
	sourcePostId: string | null
	publishedAt: Date
}

const loadRestaurants = (ids: string[]) =>
	prisma.restaurant.findMany({
		where: { id: { in: ids }, isActive: true },
		include: { standardOffers: true },
	})

type Restaurant = Awaited<ReturnType<typeof loadRestaurants>>[number]

/* ---------- pomocnicze ---------- */

const todayUtc = () => {
	const d = new Date()
	d.setUTCHours(0, 0, 0, 0)
	return d
}

const chunk = <T>(arr: T[], size: number): T[][] =>
	Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, (i + 1) * size))

const CATEGORY_LABELS: Record<ScrapedDish['category'], string> = {
	zupa: 'Zupa',
	przystawka: 'Przystawka',
	salatka: 'Sałatka',
	danie_glowne: 'Danie główne',
	deser: 'Deser',
	napoj: 'Napój',
	inne: '',
}

/** Kilka dań -> jedno danie dnia (name + description + price). */
function toDishFields(dishes: ScrapedDish[], setPrice?: number) {
	const name = dishes
		.map(d => d.name)
		.join(' + ')
		.slice(0, 190)

	const description = dishes
		.map(d => {
			const label = CATEGORY_LABELS[d.category]
			const base = label ? `${label}: ${d.name}` : d.name
			return d.price ? `${base} – ${d.price} zł` : base
		})
		.join('\n')

	const price = setPrice ?? dishes.find(d => d.price)?.price ?? null
	return { name, description, price }
}

/* ---------- zapis ---------- */

function saveDailyDish(restaurantId: string, date: Date, data: DishData) {
	return prisma.dailyDish.upsert({
		where: { restaurantId_date: { restaurantId, date } },
		update: data,
		create: { restaurantId, date, ...data },
	})
}

async function dishFromPost(r: Restaurant, post: NonNullable<ScrapeOutput['post']>): Promise<DishData> {
	let imageUrl: string | null = null

	if (post.imageUrl) {
		try {
			imageUrl = (await uploadImageFromUrl(post.imageUrl, 'scraped')) || null
		} catch (e: any) {
			await logger.warn(`⚠️ [Sync] Upload zdjęcia do S3 nie powiódł się dla ${r.name}:`, e.message || e)
		}
	}

	// Nie zapisujemy linku z Facebooka (wygasa) – bez uploadu bierzemy zdjęcie tła lokalu.
	if (!imageUrl) imageUrl = r.backgroundImageUrl || null

	return {
		...toDishFields(post.menu.dishes, post.menu.setPrice),
		imageUrl,
		sourceUrl: post.sourceUrl ?? null,
		sourcePostId: post.sourcePostId,
		publishedAt: new Date(post.publishedAt),
	}
}

/** Brak menu na FB: zapisujemy ofertę stałą, jeśli lokal ją ma. */
async function saveFallback(r: Restaurant, today: Date): Promise<boolean> {
	const offer = r.standardOffers?.find((o: any) => o.isActive)
	if (!offer) return false

	await saveDailyDish(r.id, today, {
		name: offer.title,
		description: offer.description || null,
		price: offer.price ? Number(offer.price) : null,
		imageUrl: offer.imageUrl || null,
		sourceUrl: null,
		sourcePostId: null, // null = "nie z Facebooka", więc kolejny przebieg spróbuje ponownie
		publishedAt: new Date(),
	})
	return true
}

/* ---------- główna funkcja ---------- */

export async function syncRestaurantMenus(restaurantIds: string[]): Promise<SyncSummary> {
	const today = todayUtc()
	const restaurants = await loadRestaurants(restaurantIds)

	// Lokale z dzisiejszym daniem z Facebooka pomijamy – to główna oszczędność kosztów.
	const done = await prisma.dailyDish.findMany({
		where: { restaurantId: { in: restaurants.map(r => r.id) }, date: today, sourcePostId: { not: null } },
		select: { restaurantId: true },
	})
	const doneIds = new Set(done.map(d => d.restaurantId))
	const todo = restaurants.filter(r => !doneIds.has(r.id))

	const summary: SyncSummary = {
		total: restaurantIds.length,
		skipped: restaurants.length - todo.length,
		saved: 0,
		fallback: 0,
		noMenu: 0,
		errors: 0,
		failedIds: [],
	}
	const alerts: Array<{ name: string; reason: string }> = []

	// Jedna paczka = jeden run Apify.
	for (const group of chunk(todo, BATCH_SIZE)) {
		const results = await fetchRestaurantMenus(
			group.filter(r => r.facebookUrl?.trim()).map(r => ({ id: r.id, name: r.name, facebookUrl: r.facebookUrl! })),
		)
		const byId = new Map(results.map(res => [res.id, res]))

		for (const r of group) {
			const res = byId.get(r.id)

			try {
				if (res?.status === 'ok' && res.post) {
					await saveDailyDish(r.id, today, await dishFromPost(r, res.post))
					summary.saved++
					continue
				}

				if (res?.status === 'error') {
					summary.errors++
					summary.failedIds.push(r.id)
					alerts.push({ name: r.name, reason: res.message ?? 'Błąd scrapera' })
				}

				if (await saveFallback(r, today)) summary.fallback++
				else summary.noMenu++
			} catch (e: any) {
				summary.errors++
				summary.failedIds.push(r.id)
				alerts.push({ name: r.name, reason: e.message || 'Błąd zapisu' })
				await logger.error(`❌ [Sync] Błąd dla ${r.name}:`, e.message || e)
			}
		}
	}

	await logger.info(`📊 [Sync] ${JSON.stringify({ ...summary, failedIds: summary.failedIds.length })}`)

	// Jeden zbiorczy alert zamiast maila na każdy lokal.
	if (alerts.length > 0) await sendAdminScrapingAlert(alerts)

	return summary
}
