import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// GET /api/restaurants
// Pobiera wszystkie aktywne restauracje
router.get('/', async (_req, res) => {
	try {
		const restaurants = await prisma.restaurant.findMany({
			orderBy: {
				name: 'asc',
			},
		})

		res.json(restaurants)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać restauracji',
		})
	}
})

// GET /api/restaurants/:id
// Pobiera jedną restaurację razem z jej daniami
router.get('/:id', async (req, res) => {
	try {
		const id = Number(req.params.id)

		if (Number.isNaN(id)) {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

		const restaurant = await prisma.restaurant.findUnique({
			where: {
				id,
			},
			include: {
				dishes: {
					orderBy: {
						date: 'desc',
					},
				},
			},
		})

		if (!restaurant) {
			return res.status(404).json({
				success: false,
				message: 'Restauracja nie istnieje',
			})
		}

		res.json(restaurant)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać restauracji',
		})
	}
})

// POST /api/restaurants
// Dodaje restaurację do whitelisty
router.post('/', async (req, res) => {
	try {
		const { name, slug, phone, address, city, facebookUrl } = req.body

		if (!name || !slug || !city) {
			return res.status(400).json({
				success: false,
				message: 'Nazwa, slug i miasto są wymagane',
			})
		}

		const existingRestaurant = await prisma.restaurant.findUnique({
			where: {
				slug,
			},
		})

		if (existingRestaurant) {
			return res.status(409).json({
				success: false,
				message: 'Restauracja o takim slug już istnieje',
			})
		}

		const restaurant = await prisma.restaurant.create({
			data: {
				name: name.trim(),
				slug: slug.trim().toLowerCase(),
				phone: phone?.trim() || null,
				address: address?.trim() || null,
				city: city.trim(),
				facebookUrl: facebookUrl?.trim() || null,
			},
		})

		res.status(201).json(restaurant)
	} catch (error) {
		console.error(error)

		res.status(500).json({
			success: false,
			message: 'Nie udało się utworzyć restauracji',
		})
	}
})

// PUT /api/restaurants/:id
// Edycja restauracji
router.put('/:id', async (req, res) => {
	try {
		const id = Number(req.params.id)

		if (Number.isNaN(id)) {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowe ID restauracji',
			})
		}

		const { name, slug, phone, address, city, facebookUrl, isActive } = req.body

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
// Usuwa restaurację
router.delete('/:id', async (req, res) => {
	try {
		const id = Number(req.params.id)

		if (Number.isNaN(id)) {
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

export default router
