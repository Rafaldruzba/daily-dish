import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import { fetchTodayDishes } from '../services/daily-dish.service.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { getRestaurantIdsForCity, getAllActiveRestaurantIds } from '../services/restaurant-location.service.js'
import redisClient, { invalidateRestaurantCache } from '../lib/redis.js'
import { getPresignedDownloadUrl } from '../services/storage.service.js'

const router = Router()

// POST /api/dishes/fetch
// Uruchamia pobieranie dań dla całej whitelisty
router.post('/fetch', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		console.log('Rozpoczynam pobieranie dań...')

		const city = req.query.city as string | undefined;
		const results = await fetchTodayDishes(city)

		if (city) {
			await invalidateRestaurantCache(city)
		} else {
			await redisClient.del('dishes:today:all')
			await redisClient.del('restaurants:all')
		}

		res.json({
			success: true,
			results,
		})
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać dań',
		})
	}
})

// GET /api/dishes/today
// Pobiera dania dnia z dzisiejszej daty
router.get('/today', async (req: Request, res: Response) => {
	try {
		const city = req.query.city as string | undefined;
    const cacheKey = `dishes:today:${city || 'all'}`;

    if (redisClient.isOpen) {
      try {
        const cachedDishes = await redisClient.get(cacheKey);
        if (cachedDishes) {
          return res.json(JSON.parse(cachedDishes));
        }
      } catch (err) {
        console.error('[Redis] Cache read error:', err);
      }
    }

		const startOfDay = new Date()
		startOfDay.setHours(0, 0, 0, 0)

		const endOfDay = new Date()
		endOfDay.setHours(23, 59, 59, 999)

		// Get active, approved restaurant IDs with active subscriptions
		const restaurantIds = city
			? await getRestaurantIdsForCity(city)
			: await getAllActiveRestaurantIds();

		let dishes = await prisma.dailyDish.findMany({
			where: {
				date: {
					gte: startOfDay,
					lte: endOfDay,
				},
				restaurantId: { in: restaurantIds },
			},
			include: {
				restaurant: true,
			},
			orderBy: {
				restaurant: {
					name: 'asc',
				},
			},
		})

		// Pobierz wszystkie aktywne restauracje, aby wstrzyknąć ofertę stałą jako fallback
		const activeRestaurants = await prisma.restaurant.findMany({
			where: {
				id: { in: restaurantIds },
				isActive: true,
				status: { in: ['APPROVED', 'ACTIVE'] },
			},
			include: {
				standardOffers: true,
			},
		})

		const scrapedRestaurantIds = new Set(dishes.map(d => d.restaurantId))
		const fallbackDishes: any[] = []

		for (const restaurant of activeRestaurants) {
			const activeOffer = restaurant.standardOffers?.find(o => o.isActive)
			if (!scrapedRestaurantIds.has(restaurant.id) && activeOffer) {
				fallbackDishes.push({
					id: `static_${restaurant.id}`,
					restaurantId: restaurant.id,
					name: activeOffer.title,
					description: activeOffer.description || null,
					price: activeOffer.price || null,
					imageUrl: activeOffer.imageUrl || null,
					sourceUrl: null,
					sourcePostId: null,
					date: new Date(),
					publishedAt: restaurant.updatedAt || new Date(),
					restaurant: restaurant,
					isStaticOffer: true,
				})
			}
		}

		const allDishes = [...dishes, ...fallbackDishes]
		allDishes.sort((a, b) => a.restaurant.name.localeCompare(b.restaurant.name, 'pl'))

		// Podpisujemy adresy URL obrazków dla prywatnego bucketu S3 przed cache'owaniem/odesłaniem
		const signedDishes = await Promise.all(
			allDishes.map(async (dish: any) => {
				const signedImageUrl = dish.imageUrl ? await getPresignedDownloadUrl(dish.imageUrl) : null
				return {
					...dish,
					imageUrl: signedImageUrl,
				}
			})
		)

		if (redisClient.isOpen) {
			try {
				await redisClient.set(cacheKey, JSON.stringify(signedDishes), { EX: 3600 }); // Cache for 1 hour
			} catch (err) {
				console.error('[Redis] Cache write error:', err);
			}
		}

		res.json(signedDishes)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać dzisiejszych dań',
		})
	}
})

// GET /api/dishes
// Wszystkie zapisane dania
router.get('/', async (_req, res) => {
	try {
		const dishes = await prisma.dailyDish.findMany({
			include: {
				restaurant: true,
			},
			orderBy: {
				date: 'desc',
			},
		})

		res.json(dishes)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać dań',
		})
	}
})

// GET /api/dishes/:id
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params

		if (!id) {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID dania',
			})
		}

		const dish = await prisma.dailyDish.findUnique({
			where: {
				id,
			},
			include: {
				restaurant: true,
			},
		})

		if (!dish) {
			return res.status(404).json({
				success: false,
				message: 'Danie nie istnieje',
			})
		}

		res.json(dish)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać dania',
		})
	}
})

// POST /api/dishes/admin/fetch-now
// Wyzwala natychmiastowe, awaryjne skrapowanie wszystkich lokali za pomocą kolejki BullMQ (Tylko ADMIN)
router.post('/admin/fetch-now', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const { queueAllScrapingJobs } = await import('../services/scraper-queue.service.js')
		const jobs = await queueAllScrapingJobs()
		res.json({
			success: true,
			message: `Awaryjne skrapowanie zostało pomyślnie zainicjowane. Zakolejkowano ${jobs.length} zadań.`,
			jobs,
		})
	} catch (error: any) {
		console.error('❌ Error triggering emergency scrape:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas wyzwalania awaryjnego pobierania.',
		})
	}
})

export default router
