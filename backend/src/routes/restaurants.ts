import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import type { Restaurant, Subscription } from '@prisma/client'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { MOCK_RESTAURANTS, MOCK_OWNERS } from '../data/mockDishes.js'
import { geocodeCity } from '../services/geolocation.service.js'
import redisClient from '../lib/redis.js'

const router = Router()

// GET /api/restaurants
// Pobiera wszystkie aktywne i zatwierdzone restauracje (dla gości/użytkowników)
router.get('/', async (req: Request, res: Response) => {
	try {
    const city = req.query.city as string | undefined;
    const cacheKey = `restaurants:${city || 'all'}`;

    if (redisClient.isOpen) {
      try {
        const cachedRestaurants = await redisClient.get(cacheKey);
        if (cachedRestaurants) {
          return res.json(JSON.parse(cachedRestaurants));
        }
      } catch (err) {
        console.error('[Redis] Cache read error:', err);
      }
    }

    let where: any = {
      isActive: true,
      status: 'APPROVED',
    };

    if (city) {
      const coordinates = await geocodeCity(city);
      if (coordinates) {
        const { lat, lon } = coordinates;
        const radius = 20 * 1000; // 20km

        // Prioritize promoted restaurants first
        const promotedRestaurantIds = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT r.id FROM "Restaurant" r
          LEFT JOIN "Subscription" s ON r.id = s."restaurantId"
          WHERE r."isActive" = true AND r."status" = 'APPROVED' AND s."isPromoted" = true AND s.status = 'ACTIVE' AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL AND (
            6371000 * acos(cos(radians(${lat})) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(${lon})) + sin(radians(${lat})) * sin(radians(r.latitude)))
          ) <= ${radius};
        `;

        const otherRestaurantIds = await prisma.$queryRaw<Array<{ id: string }>>`
          SELECT r.id FROM "Restaurant" r
          LEFT JOIN "Subscription" s ON r.id = s."restaurantId"
          WHERE r."isActive" = true AND r."status" = 'APPROVED' AND (s."isPromoted" IS NULL OR s."isPromoted" = false) AND r.latitude IS NOT NULL AND r.longitude IS NOT NULL AND (
            6371000 * acos(cos(radians(${lat})) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(${lon})) + sin(radians(${lat})) * sin(radians(r.latitude)))
          ) <= ${radius};
        `;

        const finalIds = [...promotedRestaurantIds.map((r: {id: string}) => r.id), ...otherRestaurantIds.map((r: {id: string}) => r.id)];
        where.id = { in: finalIds };

      } else {
        where.city = { equals: city, mode: 'insensitive' };
      }
    }

		type RestaurantWithSubscription = Restaurant & { subscription: Subscription | null };
		let restaurants: RestaurantWithSubscription[] = await prisma.restaurant.findMany({
			where,
			include: { subscription: true },
			orderBy: {
				name: 'asc',
			},
		})

		// Na localhost automatycznie inicjalizujemy restauracje testowe, jeśli baza jest pusta
		if (process.env.NODE_ENV !== 'production' && restaurants.length === 0) {
			console.log('🤖 [LOCAL MOCK] Inicjalizacja testowych właścicieli i restauracji...')
			
      // 1. Seed Mock Owners
      for (const owner of MOCK_OWNERS) {
        try {
          await prisma.user.upsert({
            where: { id: owner.id },
            update: {
              email: owner.email,
              name: owner.name,
              role: owner.role
            },
            create: {
              id: owner.id,
              email: owner.email,
              password: '$2a$10$954tU7yQp.E8S3vTsh7C/.E/2B2tX8F.a8vPqX89yMhFvx7t5xIym', // hash for password123
              name: owner.name,
              role: owner.role
            }
          })
        } catch (err) {
          console.error(`❌ Błąd podczas upsertowania właściciela testowego ${owner.name}:`, err)
        }
      }

      // 2. Seed Mock Restaurants
      for (const r of MOCK_RESTAURANTS) {
				try {
          const restaurantInDb = await prisma.restaurant.findUnique({ where: { id: r.id } });
          let lat = restaurantInDb?.latitude;
          let lon = restaurantInDb?.longitude;
          if (!lat || !lon) {
            const coords = await geocodeCity(`${r.address}, ${r.city}`);
            if (coords) {
              lat = coords.lat;
              lon = coords.lon;
            }
          }

					const restaurant = await prisma.restaurant.upsert({
						where: { id: r.id },
            update: { name: r.name, slug: r.slug, phone: r.phone, address: r.address, city: r.city, facebookUrl: r.facebookUrl, isActive: r.isActive, status: r.status, rating: r.rating, description: r.description, generalMenu: r.generalMenu, latitude: lat, longitude: lon, userId: r.userId || null },
            create: { id: r.id, name: r.name, slug: r.slug, phone: r.phone, address: r.address, city: r.city, facebookUrl: r.facebookUrl, isActive: r.isActive, status: r.status, rating: r.rating, description: r.description, generalMenu: r.generalMenu, latitude: lat, longitude: lon, userId: r.userId || null },
					});

          // Create a mock subscription for the mock restaurant
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 30);
          await prisma.subscription.upsert({
            where: { restaurantId: restaurant.id },
            create: {
              restaurantId: restaurant.id,
              plan: 'FREE_TRIAL',
              status: 'ACTIVE',
              currentPeriodEnd: trialEndsAt,
            },
            update: {},
          });

				} catch (err) {
					console.error(`❌ Błąd podczas upsertowania restauracji testowej ${r.name}:`, err)
				}
			}

			// Pobierz ponownie po zasileniu bazy
			restaurants = await prisma.restaurant.findMany({
				where,
				include: { subscription: true },
				orderBy: {
					name: 'asc',
				},
			})
		}

    // In-memory sort to prioritize promoted restaurants (isPromoted = true) at the very top
    try {
      // HACK: Using a type assertion because the build process is using a stale, cached type for the Subscription model.
      // This forces TypeScript to recognize the new `isPromoted` field.
      type RestaurantWithFlags = Restaurant & { subscription: { isPromoted?: boolean } | null };

      (restaurants as RestaurantWithFlags[]).sort((a, b) => {
        const aPromoted = a.subscription?.isPromoted || false;
        const bPromoted = b.subscription?.isPromoted || false;

        if (aPromoted && !bPromoted) return -1;
        if (!aPromoted && bPromoted) return 1;
        return a.name.localeCompare(b.name, 'pl');
      });
    } catch (err) {
      console.error('Error prioritizing promoted restaurants:', err);
    }

    if (redisClient.isOpen) {
      try {
        await redisClient.set(cacheKey, JSON.stringify(restaurants), { EX: 3600 }); // Cache for 1 hour
      } catch (err) {
        console.error('[Redis] Cache write error:', err);
      }
    }

		res.json(restaurants)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać restauracji' })
	}
})

// GET /api/restaurants/admin/all
// Pobiera wszystkie restauracje (dla admina) z informacją o autorze wpisu
router.get('/admin/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const restaurants = await prisma.restaurant.findMany({
			include: {
				user: {
					select: {
						email: true,
						name: true,
					},
				},
				subscription: true,
			},
			orderBy: { createdAt: 'desc' },
		})
		res.json(restaurants)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać restauracji' })
	}
})

// GET /api/restaurants/owner
// Pobiera restauracje zalogowanego właściciela
router.get('/owner', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) return res.status(401).json({ success: false, message: 'Brak autoryzacji' })

		// Admin nie powinien mieć swoich lokali i statystyk (SaaS-rule: admin tylko moderuje)
		if (req.user.role === 'ADMIN') {
			return res.status(403).json({ success: false, message: 'Administrator nie posiada własnych lokali.' })
		}

		const restaurants = await prisma.restaurant.findMany({
			where: { userId: req.user.id },
			include: { subscription: true },
			orderBy: { createdAt: 'desc' },
		})
		res.json(restaurants)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać restauracji' })
	}
})

// GET /api/restaurants/favorites
// Pobiera ulubione restauracje zalogowanego użytkownika
router.get('/favorites', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony' })
		}

		const favorites = await prisma.favoriteRestaurant.findMany({
			where: { userId: req.user.id },
			include: { restaurant: true },
		})

		res.json(favorites.map((fav: { restaurant: any }) => fav.restaurant))
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać ulubionych' })
	}
})

// GET /api/restaurants/:id
// Pobiera jedną restaurację razem z jej daniami (wspiera wyszukiwanie po ID lub po slugu)
router.get('/:id', async (req, res) => {
	try {
		const { id } = req.params
		if (!id) return res.status(400).json({ success: false, message: 'Nieprawidłowe ID' })

		let restaurant = null

		// Próba wyszukania po UUID, jeśli id pasuje do formatu UUID
		if (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)) {
			restaurant = await prisma.restaurant.findUnique({
				where: { id },
				include: { dishes: { orderBy: { date: 'desc' } } },
			})
		}

		// Fallback: próba wyszukania po unikalnym slugu
		if (!restaurant) {
			restaurant = await prisma.restaurant.findUnique({
				where: { slug: id },
				include: { dishes: { orderBy: { date: 'desc' } } },
			})
		}

		if (!restaurant) return res.status(404).json({ success: false, message: 'Restauracja nie istnieje' })
		res.json(restaurant)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać restauracji' })
	}
})

// POST /api/restaurants/:id/view
// Rejestruje odwiedziny profilu restauracji
router.post('/:id/view', async (req, res) => {
	try {
		const { id } = req.params
		if (!id) return res.status(400).json({ success: false, message: 'Nieprawidłowe ID' })

		await prisma.restaurant.update({
			where: { id },
			data: { views: { increment: 1 } },
		})

		res.json({ success: true })
	} catch (error) {
		// Ignorujemy błędy, by nie psuć UX
		res.json({ success: false })
	}
})

// POST /api/restaurants
// Dodaje restaurację (każdy zalogowany użytkownik, status domyślnie PENDING)
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		const { name, slug, phone, address, city, facebookUrl, rating } = req.body

		if (!name || !slug || !city) {
			return res.status(400).json({ success: false, message: 'Nazwa, slug i miasto są wymagane' })
		}

		const existingRestaurant = await prisma.restaurant.findUnique({ where: { slug } })
		if (existingRestaurant) {
			return res.status(409).json({ success: false, message: 'Restauracja o takim slug już istnieje' })
		}

    let lat: number | undefined;
    let lon: number | undefined;
    if (address && city) {
      const coords = await geocodeCity(`${address}, ${city}`);
      if (coords) {
        lat = coords.lat;
        lon = coords.lon;
      }
    }

		const userId = req.user?.id
		const isOwner = req.user?.role === 'OWNER'

		// Check if owner already has restaurants
		const existingCount = await prisma.restaurant.count({ where: { userId: userId } });
		const hasFreeTrial = existingCount === 0;

		const restaurant = await prisma.restaurant.create({
		data: {
		name: name.trim(),
		slug: slug.trim().toLowerCase(),
		phone: phone?.trim() || null,
		address: address?.trim() || null,
		city: city.trim(),
		    latitude: lat,
		    longitude: lon,
		facebookUrl: facebookUrl?.trim() || null,
		rating: rating !== undefined ? Number(rating) : 5.0,
		...(userId && {
		user: {
		connect: {
		id: userId,
		},
		},
		}),
		status: 'PENDING', // Always PENDING on start
		    isActive: hasFreeTrial, // Activate immediately only if it's the first restaurant
		},
		});

		// If it's the first restaurant for an owner, create a free trial subscription
		if (isOwner && hasFreeTrial) {
		  const trialEndsAt = new Date();
		  trialEndsAt.setDate(trialEndsAt.getDate() + 30);

		  await prisma.subscription.create({
		    data: {
		      restaurantId: restaurant.id,
		      plan: 'FREE_TRIAL',
		      status: 'ACTIVE',
		      currentPeriodEnd: trialEndsAt,
		    }
		  });
		}

		res.status(201).json(restaurant)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się utworzyć restauracji' })
	}
})

// PUT /api/restaurants/admin/:id/status
// Zmienia status akceptacji (tylko Admin)
router.put('/admin/:id/status', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const { status } = req.body // APPROVED, REJECTED

		if (!id || typeof id !== 'string' || !['APPROVED', 'REJECTED'].includes(status)) {
			return res.status(400).json({ success: false, message: 'Nieprawidłowe dane' })
		}

		const restaurant = await prisma.restaurant.update({
			where: { id },
			data: { status },
		})

    if (redisClient.isOpen) {
      await redisClient.del(`restaurants:${restaurant.city}`);
      await redisClient.del('restaurants:all');
    }

		res.json(restaurant)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Błąd aktualizacji statusu' })
	}
})

// PUT /api/restaurants/:id
// Edycja restauracji (Admin lub Właściciel)
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params
		const user = req.user

		if (!id || typeof id !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

		const restaurantToUpdate = await prisma.restaurant.findUnique({ where: { id } })

		if (!restaurantToUpdate) {
			return res.status(404).json({ success: false, message: 'Restauracja nie istnieje' })
		}

		if (!user || (user.role !== 'ADMIN' && restaurantToUpdate.userId !== user.id)) {
			return res.status(403).json({ success: false, message: 'Brak uprawnień do edycji tej restauracji' })
		}

		const { name, slug, phone, address, city, facebookUrl, isActive, description, generalMenu } = req.body

		const restaurant = await prisma.restaurant.update({
			where: {
				id,
			},
			data: {
				...(name !== undefined && {
					name: name.trim(),
				}),
				...(slug !== undefined && {
					slug: slug.trim().toLowerCase(),
				}),
				...(phone !== undefined && {
					phone: phone?.trim() || null,
				}),
				...(address !== undefined && {
					address: address?.trim() || null,
				}),
				...(city !== undefined && {
					city: city.trim(),
				}),
				...(facebookUrl !== undefined && {
					facebookUrl: facebookUrl?.trim() || null,
				}),
				...(isActive !== undefined && {
					isActive: Boolean(isActive),
				}),
				...(description !== undefined && {
					description: description?.trim() || null,
				}),
				...(generalMenu !== undefined && {
					generalMenu: generalMenu?.trim() || null,
				}),
			},
		})

    if (redisClient.isOpen) {
      await redisClient.del(`restaurants:${restaurant.city}`);
      if (restaurantToUpdate.city !== restaurant.city) {
        await redisClient.del(`restaurants:${restaurantToUpdate.city}`);
      }
      await redisClient.del('restaurants:all');
    }

		res.json(restaurant)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się zaktualizować restauracji',
		})
	}
})

// DELETE /api/restaurants/:id
// Usuwa restaurację (tylko Admin)
router.delete('/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params

		if (!id || typeof id !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

    const restaurant = await prisma.restaurant.findUnique({ where: { id } });
    if (restaurant && redisClient.isOpen) {
      await redisClient.del(`restaurants:${restaurant.city}`);
      await redisClient.del('restaurants:all');
    }

		await prisma.restaurant.delete({
			where: {
				id,
			},
		})

		res.status(204).send()
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się usunąć restauracji',
		})
	}
})

// POST /api/restaurants/:id/favorite
// Dodaje restaurację do ulubionych
router.post('/:id/favorite', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		const { id: restaurantId } = req.params
		if (!restaurantId || typeof restaurantId !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: 'Nieuwierzytelniony',
			})
		}

		const userId = req.user.id

		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
		})

		if (!restaurant) {
			return res.status(404).json({
				success: false,
				message: 'Restauracja nie istnieje',
			})
		}

		await prisma.favoriteRestaurant.upsert({
			where: {
				userId_restaurantId: {
					userId,
					restaurantId,
				},
			},
			create: {
				userId,
				restaurantId,
			},
			update: {},
		})

		res.json({
			success: true,
			message: 'Dodano restaurację do ulubionych',
		})
	} catch (error) {
		console.error(error)
		res.status(500).json({
			success: false,
			message: 'Nie udało się dodać restauracji do ulubionych',
		})
	}
})

// DELETE /api/restaurants/:id/favorite
// Usuwa restaurację z ulubionych
router.delete('/:id/favorite', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		const { id: restaurantId } = req.params
		if (!restaurantId || typeof restaurantId !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: 'Nieuwierzytelniony',
			})
		}

		const userId = req.user.id

		await prisma.favoriteRestaurant.delete({
			where: {
				userId_restaurantId: {
					userId,
					restaurantId,
				},
			},
		})

		res.json({
			success: true,
			message: 'Usunięto restaurację z ulubionych',
		})
	} catch (error) {
		console.error(error)
		res.status(500).json({
			success: false,
			message: 'Nie udało się usunąć restauracji z ulubionych',
		})
	}
})

export default router
