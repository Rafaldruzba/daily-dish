import prisma from '../lib/prisma.js'
import { geocodeCity } from './geolocation.service.js'
import { queueAllScrapingJobs } from './scraper-queue.service.js'
import { syncRestaurantMenus } from './menu-sync.service.js'
import logger from './logger.service.js'

async function getRestaurantsToFetch(city?: string) {
	if (!city) {
		return prisma.restaurant.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } })
	}

	const coordinates = await geocodeCity(city)
	if (coordinates) {
		const { lat, lon } = coordinates
		const radius = 20 * 1000 // 20km

		const restaurantIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Restaurant"
      WHERE "isActive" = true AND "status" = 'APPROVED' AND latitude IS NOT NULL AND longitude IS NOT NULL AND (
        6371000 * acos(
          cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )
      ) <= ${radius};
    `

		return prisma.restaurant.findMany({
			where: { id: { in: restaurantIds.map((r: { id: string }) => r.id) } },
		})
	}

	// Fallback: po nazwie miasta
	return prisma.restaurant.findMany({
		where: { city: { equals: city, mode: 'insensitive' }, isActive: true },
		orderBy: { name: 'asc' },
	})
}

/** Ręczne pobranie dań (np. dla miasta) – od razu, bez kolejki. */
export async function fetchTodayDishes(city?: string) {
	const restaurants = await getRestaurantsToFetch(city)
	const ids = restaurants.map(r => r.id)

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
