import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import type { Restaurant, Subscription } from '@prisma/client'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'
import { getRestaurantIdsForCity, getAllActiveRestaurantIds } from '../services/restaurant-location.service.js'
import { geocodeCity } from '../services/geolocation.service.js'
import redisClient from '../lib/redis.js'

const router = Router()

// Pomocnicza funkcja do mapowania listy subskrypcji (1-to-many) z bazy
// na pojedynczy obiekt subskrypcji (legacy format) oczekiwany przez frontend.
function mapRestaurantSubscription(restaurant: any) {
	if (!restaurant.subscriptions || restaurant.subscriptions.length === 0) {
		return {
			...restaurant,
			isPromoted: false,
			subscription: null,
		}
	}

	// Znajdź tylko aktywne subskrypcje
	const activeSubs = restaurant.subscriptions.filter(
		(sub: any) => sub.status === 'ACTIVE' && new Date(sub.endsAt) > new Date(),
	)

	if (activeSubs.length === 0) {
		// Jeżeli brak aktywnych, weź najświeższą wygasłą/anulowaną
		const sortedSubs = [...restaurant.subscriptions].sort(
			(a: any, b: any) => new Date(b.endsAt).getTime() - new Date(a.endsAt).getTime(),
		)
		const latestSub = sortedSubs[0]

		let plan = 'FREE_TRIAL'
		if (latestSub.type === 'BASE') plan = 'BASE'
		else if (latestSub.type === 'PROMOTION') plan = 'PROMOTION'
		else if (latestSub.type === 'STATIC_MENU') plan = 'STATIC_MENU'

		return {
			...restaurant,
			isPromoted: false,
			subscription: {
				id: latestSub.id,
				plan: plan,
				type: latestSub.type,
				status: latestSub.status,
				currentPeriodEnd: latestSub.endsAt,
			},
		}
	}

	// Określ najwyższy poziom planu subskrypcji dla aktywnych planów
	const hasStaticMenu = activeSubs.some((sub: any) => sub.type === 'STATIC_MENU')
	const hasPromotion = activeSubs.some((sub: any) => sub.type === 'PROMOTION')
	const hasBase = activeSubs.some((sub: any) => sub.type === 'BASE')
	const hasTrial = activeSubs.some((sub: any) => sub.type === 'FREE_TRIAL')

	let plan = 'FREE_TRIAL'
	if (hasStaticMenu) plan = 'STATIC_MENU'
	else if (hasPromotion) plan = 'PROMOTION'
	else if (hasBase) plan = 'BASE'
	else if (hasTrial) plan = 'FREE_TRIAL'

	// Jako główną subskrypcję do wyznaczenia okresu ważności wybierz BASE / FREE_TRIAL, lub pierwszą aktywną
	const primarySub = activeSubs.find((sub: any) => sub.type === 'BASE' || sub.type === 'FREE_TRIAL') || activeSubs[0]

	return {
		...restaurant,
		isPromoted: hasPromotion,
		subscription: {
			id: primarySub.id,
			plan: plan,
			type: primarySub.type,
			status: 'ACTIVE',
			currentPeriodEnd: primarySub.endsAt,
		},
	}
}

// GET /api/restaurants
// Pobiera wszystkie aktywne i zatwierdzone restauracje (dla gości/użytkowników)
router.get('/', async (req: Request, res: Response) => {
	try {
		const city = req.query.city as string | undefined
		const cacheKey = `restaurants:${city || 'all'}`

		if (redisClient.isOpen) {
			try {
				const cachedRestaurants = await redisClient.get(cacheKey)
				if (cachedRestaurants) {
					return res.json(JSON.parse(cachedRestaurants))
				}
			} catch (err) {
				console.error('[Redis] Cache read error:', err)
			}
		}

		// Pobierz identyfikatory restauracji posiadających aktywne subskrypcje w zadanym obszarze
		const restaurantIds = city ? await getRestaurantIdsForCity(city) : await getAllActiveRestaurantIds()

		let restaurants = await prisma.restaurant.findMany({
			where: {
				id: { in: restaurantIds },
				isActive: true,
				status: { in: ['APPROVED', 'ACTIVE'] },
			},
			include: { subscriptions: true },
			orderBy: {
				name: 'asc',
			},
		})

		// Sortowanie promujące aktywne subskrypcje PROMOTION na samą górę (tylko w okolicy/promieniu) wg zaawansowanego scoringu
		try {
			const calculateScore = (r: any) => {
				const rating = r.rating || 0.0
				const googleReviewsCount = r.userRatingsTotal || 0
				const views = r.views || 0
				return rating * 10 + Math.log(googleReviewsCount + 1) * 5 + Math.log(views + 1) * 2
			}

			restaurants.sort((a, b) => {
				const aPromoted = a.subscriptions.some(
					s => s.type === 'PROMOTION' && s.status === 'ACTIVE' && s.endsAt > new Date(),
				)
				const bPromoted = b.subscriptions.some(
					s => s.type === 'PROMOTION' && s.status === 'ACTIVE' && s.endsAt > new Date(),
				)

				if (aPromoted && !bPromoted) return -1
				if (!aPromoted && bPromoted) return 1

				if (aPromoted && bPromoted) {
					const scoreA = calculateScore(a)
					const scoreB = calculateScore(b)
					if (scoreB !== scoreA) {
						return scoreB - scoreA // Wyższy Score na górę
					}
				}

				return a.name.localeCompare(b.name, 'pl')
			})
		} catch (err) {
			console.error('Error prioritizing promoted restaurants:', err)
		}

		const mappedRestaurants = restaurants.map(mapRestaurantSubscription)

		if (redisClient.isOpen) {
			try {
				await redisClient.set(cacheKey, JSON.stringify(mappedRestaurants), { EX: 3600 }) // Cache for 1 hour
			} catch (err) {
				console.error('[Redis] Cache write error:', err)
			}
		}

		res.json(mappedRestaurants)
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
				subscriptions: true,
			},
			orderBy: { createdAt: 'desc' },
		})
		res.json(restaurants.map(mapRestaurantSubscription))
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
			include: { subscriptions: true },
			orderBy: { createdAt: 'desc' },
		})
		res.json(restaurants.map(mapRestaurantSubscription))
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

		// Próba wyszukania po unikalnym ID
		restaurant = await prisma.restaurant.findUnique({
			where: { id },
			include: {
				dishes: { orderBy: { date: 'desc' } },
				menuItems: { orderBy: { order: 'asc' } },
				standardOffers: true,
				subscriptions: true,
			},
		})

		// Fallback: próba wyszukania po unikalnym slugu
		if (!restaurant) {
			restaurant = await prisma.restaurant.findUnique({
				where: { slug: id },
				include: {
					dishes: { orderBy: { date: 'desc' } },
					menuItems: { orderBy: { order: 'asc' } },
					standardOffers: true,
					subscriptions: true,
				},
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

		let lat: number | undefined
		let lon: number | undefined
		if (address && city) {
			const coords = await geocodeCity(`${address}, ${city}`)
			if (coords) {
				lat = coords.lat
				lon = coords.lon
			}
		}

		// Pobranie danych Google Places (rating i userRatingsTotal)
		let googlePlaceId = null
		let userRatingsTotal = 0
		let initialRating = rating !== undefined ? Number(rating) : 5.0

		try {
			const { fetchGooglePlaceDetails } = await import('../services/google-maps.service.js')
			const googleDetails = await fetchGooglePlaceDetails(name.trim(), address || null, city.trim())
			if (googleDetails) {
				googlePlaceId = googleDetails.googlePlaceId
				initialRating = googleDetails.rating
				userRatingsTotal = googleDetails.userRatingsTotal
			}
		} catch (gErr) {
			console.error('⚠️ Błąd pobierania danych z Google Places przy tworzeniu:', gErr)
		}

		const userId = req.user?.id
		const isOwner = req.user?.role === 'OWNER'

		// Check if owner already has restaurants
		const existingCount = await prisma.restaurant.count({ where: { userId: userId } })
		const hasFreeTrial = existingCount === 0

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
				rating: initialRating,
				googlePlaceId,
				userRatingsTotal,
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
		})

		// If it's the first restaurant for an owner, create a free trial subscription
		if (isOwner && hasFreeTrial) {
			const trialEndsAt = new Date()
			trialEndsAt.setDate(trialEndsAt.getDate() + 30)

			await prisma.subscription.create({
				data: {
					restaurantId: restaurant.id,
					type: 'FREE_TRIAL',
					status: 'ACTIVE',
					startsAt: new Date(),
					endsAt: trialEndsAt,
				},
			})
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

		let restaurant

		if (status === 'APPROVED') {
			const trialEndsAt = new Date()
			trialEndsAt.setDate(trialEndsAt.getDate() + 30)

			// Pobieramy dane z Google przed wejściem w transakcję, żeby nie blokować bazy
			const existingRest = await prisma.restaurant.findUnique({ where: { id } })
			let googleData = null
			if (existingRest) {
				try {
					const { fetchGooglePlaceDetails } = await import('../services/google-maps.service.js')
					googleData = await fetchGooglePlaceDetails(existingRest.name, existingRest.address, existingRest.city)
				} catch (gErr) {
					console.error('⚠️ Błąd pobierania danych z Google Places przy zatwierdzaniu:', gErr)
				}
			}

			restaurant = await prisma.$transaction(async tx => {
				const rest = await tx.restaurant.update({
					where: { id },
					data: {
						status: 'ACTIVE',
						...(googleData && {
							googlePlaceId: googleData.googlePlaceId,
							rating: googleData.rating,
							userRatingsTotal: googleData.userRatingsTotal,
						}),
					},
				})

				// Usuwamy stare i tworzymy nową subskrypcję FREE_TRIAL
				await tx.subscription.deleteMany({
					where: { restaurantId: id },
				})

				await tx.subscription.create({
					data: {
						restaurantId: id,
						type: 'FREE_TRIAL',
						status: 'ACTIVE',
						startsAt: new Date(),
						endsAt: trialEndsAt,
					},
				})

				return rest
			})
		} else {
			restaurant = await prisma.restaurant.update({
				where: { id },
				data: { status: 'REJECTED' },
			})
		}

		if (redisClient.isOpen) {
			await redisClient.del(`restaurants:${restaurant.city}`)
			await redisClient.del('restaurants:all')
		}

		res.json(restaurant)
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Błąd aktualizacji statusu' })
	}
})

// PUT /api/restaurants/admin/:id/subscription
// Admin ręcznie zarządza planem subskrypcji lub blokuje restaurację (karencja 3 miesiące)
router.put('/admin/:id/subscription', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const id = req.params.id as string
		const { action } = req.body // EXTEND_TRIAL, ACTIVATE_BASE, BLOCK

		if (!id || !['EXTEND_TRIAL', 'ACTIVATE_BASE', 'BLOCK'].includes(action)) {
			return res.status(400).json({ success: false, message: 'Nieprawidłowe dane lub akcja.' })
		}

		const restaurant = await prisma.restaurant.findUnique({
			where: { id },
			include: { user: true },
		})

		if (!restaurant) {
			return res.status(404).json({ success: false, message: 'Restauracja nie istnieje.' })
		}

		const now = new Date()
		const expiresAt = new Date()
		expiresAt.setDate(expiresAt.getDate() + 30)

		if (action === 'EXTEND_TRIAL') {
			await prisma.$transaction([
				// 1. Upewnij się, że restauracja jest aktywna
				prisma.restaurant.update({
					where: { id },
					data: { status: 'ACTIVE', isActive: true },
				}),
				// 2. Przedłużenie/nadpisanie subskrypcji próbnej
				prisma.subscription.deleteMany({
					where: { restaurantId: id },
				}),
				prisma.subscription.create({
					data: {
						restaurantId: id,
						type: 'FREE_TRIAL',
						status: 'ACTIVE',
						startsAt: now,
						endsAt: expiresAt,
					},
				}),
			])
		} else if (action === 'ACTIVATE_BASE') {
			await prisma.$transaction([
				// 1. Aktywuj restaurację
				prisma.restaurant.update({
					where: { id },
					data: { status: 'ACTIVE', isActive: true },
				}),
				// 2. Aktywuj abonament podstawowy
				prisma.subscription.deleteMany({
					where: { restaurantId: id },
				}),
				prisma.subscription.create({
					data: {
						restaurantId: id,
						type: 'BASE',
						status: 'ACTIVE',
						startsAt: now,
						endsAt: expiresAt,
					},
				}),
			])
		} else if (action === 'BLOCK') {
			// Blokada restauracji — zmiana statusu na REMOVAL (3-miesięczna karencja)
			await prisma.$transaction([
				// 1. Zmiana statusu lokalu na REMOVAL
				prisma.restaurant.update({
					where: { id },
					data: {
						status: 'REMOVAL',
						removalRequestedAt: now,
						isActive: false,
					},
				}),
				// 2. Anulowanie wszystkich aktywnych subskrypcji
				prisma.subscription.updateMany({
					where: { restaurantId: id, status: 'ACTIVE' },
					data: { status: 'CANCELLED' },
				}),
			])

			// Wysłanie maila do właściciela o zablokowaniu
			if (restaurant.user?.email) {
				try {
					const nodemailer = await import('nodemailer')
					const transporter = nodemailer.default.createTransport({
						service: 'gmail',
						auth: {
							user: (process.env.GMAIL_USER || 'app.bistromapa@gmail.com').trim(),
							pass: (process.env.GMAIL_PASS || '').trim(),
						},
					})
					await transporter.sendMail({
						from: `"Bistromapa Moderator" <${(process.env.GMAIL_USER || 'app.bistromapa@gmail.com').trim()}>`,
						to: restaurant.user.email,
						subject: 'Twój lokal został zawieszony — Bistromapa.pl',
						html: `
							<div style="font-family: sans-serif; padding: 20px; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 5px;">
								<h2 style="color: #c53030; text-align: center;">Twój lokal został zawieszony</h2>
								<p>Witaj, <strong>${restaurant.user.name || 'Właścicielu'}</strong>.</p>
								<p>Twój lokal <strong>${restaurant.name}</strong> został zawieszony przez administratora i oznaczony do usunięcia (status REMOVAL).</p>
								<p>Lokal został natychmiast ukryty i nie będzie wyświetlany na mapie oraz listach wyszukiwania.</p>
								<p style="background-color: #fffaf0; padding: 15px; border-left: 4px solid #dd6b20; border-radius: 4px; font-size: 13px; color: #7b341e;">
									Rozpoczął się 3-miesięczny okres karencji. Jeśli chcesz odwołać się od tej decyzji i przywrócić lokal, skontaktuj się z nami odpowiadając na tę wiadomość w ciągu najbliższych 90 dni. Po tym okresie profil lokalu zostanie trwale skasowany.
								</p>
							</div>
						`,
					})
				} catch (mailErr) {
					console.error('❌ Błąd wysyłania maila o blokadzie:', mailErr)
				}
			}
		}

		// Czyścimy cache w Redisie
		if (redisClient.isOpen) {
			await redisClient.del(`restaurants:${restaurant.city}`)
			await redisClient.del('restaurants:all')
		}

		res.json({ success: true, message: `Akcja ${action} została pomyślnie zaimplementowana.` })
	} catch (error) {
		console.error('❌ Błąd zarządzania subskrypcją przez admina:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas modyfikacji subskrypcji.' })
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
			await redisClient.del(`restaurants:${restaurant.city}`)
			if (restaurantToUpdate.city !== restaurant.city) {
				await redisClient.del(`restaurants:${restaurantToUpdate.city}`)
			}
			await redisClient.del('restaurants:all')
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
// Usuwa restaurację (Admin lub właściciel lokalu)
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		const { id } = req.params

		if (!id || typeof id !== 'string') {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: 'Brak autoryzacji',
			})
		}

		const restaurant = await prisma.restaurant.findUnique({ where: { id } })
		if (!restaurant) {
			return res.status(404).json({
				success: false,
				message: 'Restauracja nie istnieje',
			})
		}

		// Zabezpieczenie: usunąć może tylko Admin lub właściciel danej restauracji
		if (req.user.role !== 'ADMIN' && restaurant.userId !== req.user.id) {
			return res.status(403).json({
				success: false,
				message: 'Brak uprawnień do usunięcia tej restauracji',
			})
		}

		if (redisClient.isOpen) {
			await redisClient.del(`restaurants:${restaurant.city}`)
			await redisClient.del('restaurants:all')
		}

		await prisma.restaurant.delete({
			where: {
				id,
			},
		})

		res.json({
			success: true,
			message: 'Restauracja została pomyślnie usunięta z bazy danych.',
		})
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
