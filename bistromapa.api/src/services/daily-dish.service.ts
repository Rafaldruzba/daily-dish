import prisma from '../lib/prisma.js'
import { queueAllScrapingJobs } from './scraper-queue.service.js'
import { getRestaurantIdsForCity, getAllActiveRestaurantIds } from './restaurant-location.service.js'
import { syncRestaurantMenus } from './menu-sync.service.js'
import logger from './logger.service.js'

/** Ręczne pobranie dań (np. dla miasta) – od razu, bez kolejki. */
export async function fetchTodayDishes(city?: string) {
	// Wybór lokali należy do restaurant-location.service — wspólne źródło prawdy,
	// żeby nie powstał kolejny rozjeżdżający się filtr statusu.
	const ids = city ? await getRestaurantIdsForCity(city) : await getAllActiveRestaurantIds()

	const restaurants = await prisma.restaurant.findMany({
		where: { id: { in: ids } },
		orderBy: { name: 'asc' },
	})

	const summary = await syncRestaurantMenus(ids)

	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)

	const dishes = await prisma.dailyDish.findMany({ where: { restaurantId: { in: ids }, date: today } })
	const byRestaurant = new Map(dishes.map(d => [d.restaurantId, d]))
	const failed = new Set(summary.failedIds)

	return restaurants.map(r => {
		const dish = byRestaurant.get(r.id)
		if (dish) return { restaurantId: r.id, restaurant: r.name, status: 'success' as const, dish }
		if (failed.has(r.id)) return { restaurantId: r.id, restaurant: r.name, status: 'error' as const }
		return { restaurantId: r.id, restaurant: r.name, status: 'not_found' as const }
	})
}

/** Wersja kolejkowa, używana przez harmonogram. */
export async function queueTodayScraping() {
	await logger.info('⏰ [Scheduler] Zlecam scrapowanie lokali...')
	const { restaurants } = await queueAllScrapingJobs()
	return { successful: restaurants, failed: 0 }
}
