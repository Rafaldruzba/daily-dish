import prisma from '../lib/prisma.js'
import { fetchRestaurantDish } from './facebook.service.js'
import { geocodeCity } from './geolocation.service.js'
import { queueAllScrapingJobs } from './scraper-queue.service.js'
import logger from './logger.service.js'

async function getRestaurantsToFetch(city?: string) {
  if (!city) {
    return prisma.restaurant.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  const coordinates = await geocodeCity(city);
  if (coordinates) {
    const { lat, lon } = coordinates;
    const radius = 20 * 1000; // 20km

    const restaurantIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Restaurant"
      WHERE "isActive" = true AND "status" = 'APPROVED' AND latitude IS NOT NULL AND longitude IS NOT NULL AND (
        6371000 * acos(
          cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )
      ) <= ${radius};
    `;

    return prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds.map((r: { id: string }) => r.id) }
      }
    });

  } else {
    // Fallback to city name
    return prisma.restaurant.findMany({
      where: { city: { equals: city, mode: 'insensitive' }, isActive: true },
      orderBy: { name: 'asc' }
    });
  }
}

export async function fetchTodayDishes(city?: string) {
	const restaurants = await getRestaurantsToFetch(city);

	const results = []

	// Ustawiamy dzisiejszą datę na początek dnia (UTC) dla spójności w bazie
	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)

	// Równoległe pobieranie dań dla wszystkich restauracji
	const dishResults = await Promise.all(
		restaurants.map(async (restaurant) => {
			try {
				const dish = await fetchRestaurantDish(restaurant)

				if (!dish) {
					return {
						restaurantId: restaurant.id,
						restaurant: restaurant.name,
						status: 'not_found' as const,
					}
				}

				const dailyDish = await prisma.dailyDish.upsert({
					where: {
						restaurantId_date: {
							restaurantId: restaurant.id,
							date: today,
						},
					},
					update: {
						name: dish.name,
						description: dish.description ?? null,
						price: dish.price ?? null,
						imageUrl: dish.imageUrl ?? null,
						sourceUrl: dish.sourceUrl ?? null,
						sourcePostId: dish.sourcePostId ?? null,
						publishedAt: dish.publishedAt ?? null,
					},
					create: {
						restaurantId: restaurant.id,
						name: dish.name,
						description: dish.description ?? null,
						price: dish.price ?? null,
						imageUrl: dish.imageUrl ?? null,
						sourceUrl: dish.sourceUrl ?? null,
						sourcePostId: dish.sourcePostId ?? null,
						date: today,
						publishedAt: dish.publishedAt ?? null,
					},
				})

				return {
					restaurantId: restaurant.id,
					restaurant: restaurant.name,
					status: 'success' as const,
					dish: dailyDish,
				}
			} catch (error) {
				console.error(`❌ Błąd zapisywania dla restauracji ${restaurant.name}`, error)

				return {
					restaurantId: restaurant.id,
					restaurant: restaurant.name,
					status: 'error' as const,
				}
			}
		})
	)

	return dishResults
}

/**
 * Queue-based version: delegates to BullMQ worker instead of direct fetching.
 * Used by scheduler for automatic daily scraping.
 */
export async function queueTodayScraping() {
	await logger.info('⏰ [Scheduler] Wybiela godzina scrape\'a — zakolejkowanie lokali...')
	const jobs = await queueAllScrapingJobs()
	const successful = jobs.length
	await logger.info(`✅ [Scheduler] Zakolejkowano ${successful} zadań skrapowania.`)
	return { successful, failed: 0 }
}
