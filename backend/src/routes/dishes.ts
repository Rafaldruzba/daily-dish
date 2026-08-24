import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import { fetchTodayDishes } from '../services/daily-dish.service.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'
import { geocodeCity } from '../services/geolocation.service.js'
import redisClient from '../lib/redis.js'

const router = Router()

// POST /api/dishes/fetch
// Uruchamia pobieranie dań dla całej whitelisty
router.post('/fetch', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		console.log('🔄 Rozpoczynam pobieranie dań...')

		const city = req.query.city as string | undefined;
		const results = await fetchTodayDishes(city)

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

		let restaurantIds: string[] | undefined = undefined;

		if (city) {
			const coordinates = await geocodeCity(city);
			if (coordinates) {
				const { lat, lon } = coordinates;
				// 20km radius
				const radius = 20 * 1000;

				const restaurantsInRadius: { id: string }[] = await prisma.$queryRaw`
					SELECT id FROM "Restaurant"
					WHERE "isActive" = true AND "status" = 'APPROVED' AND
					ST_DWithin(
						ST_MakePoint(longitude, latitude)::geography,
						ST_MakePoint(${lon}, ${lat})::geography,
						${radius}
					);
				`;
				restaurantIds = restaurantsInRadius.map((r: { id: string }) => r.id);

			} else {
				// If geocoding fails, fall back to simple city name matching
				const restaurants = await prisma.restaurant.findMany({
					where: { city: { equals: city, mode: 'insensitive' }, isActive: true, status: 'APPROVED' },
					select: { id: true }
				});
				restaurantIds = restaurants.map((r: { id: string }) => r.id);
			}
		}

		let dishes = await prisma.dailyDish.findMany({
			where: {
				date: {
					gte: startOfDay,
					lte: endOfDay,
				},
				restaurant: {
					isActive: true,
					...(restaurantIds && { id: { in: restaurantIds } })
				},
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

		// Na localhost automatycznie pobieramy (i generujemy) dania dnia, jeśli ich dzisiaj nie ma
		if (process.env.NODE_ENV !== 'production' && dishes.length === 0) {
			console.log('🤖 [LOCAL MOCK] Dzisiejsze dania są puste. Generuję dane testowe...')
			await fetchTodayDishes(city)

			dishes = await prisma.dailyDish.findMany({
				where: {
					date: {
						gte: startOfDay,
						lte: endOfDay,
					},
					restaurant: {
						isActive: true,
						...(restaurantIds && { id: { in: restaurantIds } })
					},
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
		}

    if (redisClient.isOpen) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(dishes), { EX: 3600 }); // Cache for 1 hour
      } catch (err) {
        console.error('[Redis] Cache write error:', err);
      }
    }

		res.json(dishes)
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

export default router
