import { Router, type Response } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// GET /api/restaurants
// Pobiera wszystkie aktywne i zatwierdzone restauracje (dla gości/użytkowników)
router.get('/', async (_req, res) => {
	try {
		const restaurants = await prisma.restaurant.findMany({
			where: {
				isActive: true,
				status: 'APPROVED',
			},
			orderBy: {
				name: 'asc',
			},
		})

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

		res.json(favorites.map(fav => fav.restaurant))
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

		const userId = req.user?.id
		const isOwner = req.user?.role === 'OWNER'

		// Darmowy okres próbny (7 dni) dla właścicieli
		const trialEndsAt = new Date()
		trialEndsAt.setDate(trialEndsAt.getDate() + 7)

		const restaurant = await prisma.restaurant.create({
			data: {
				name: name.trim(),
				slug: slug.trim().toLowerCase(),
				phone: phone?.trim() || null,
				address: address?.trim() || null,
				city: city.trim(),
				facebookUrl: facebookUrl?.trim() || null,
				rating: rating !== undefined ? Number(rating) : 5.0,
				...(userId && {
					user: {
						connect: {
							id: userId,
						},
					},
				}),
				status: 'PENDING', // Zawsze PENDING na start
				subscriptionPlan: isOwner ? 'FREE_TRIAL' : 'NONE',
				trialEndsAt: isOwner ? trialEndsAt : null,
			},
		})

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
