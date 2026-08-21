import { Router, type Response } from 'express'
import prisma from '../lib/prisma.js'
import { fetchTodayDishes } from '../services/daily-dish.service.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// POST /api/dishes/fetch
// Uruchamia pobieranie dań dla całej whitelisty
router.post('/fetch', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		console.log('🔄 Rozpoczynam pobieranie dań...')

		const results = await fetchTodayDishes()

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
router.get('/today', async (_req, res) => {
	try {
		const startOfDay = new Date()
		startOfDay.setHours(0, 0, 0, 0)

		const endOfDay = new Date()
		endOfDay.setHours(23, 59, 59, 999)

		const dishes = await prisma.dailyDish.findMany({
			where: {
				date: {
					gte: startOfDay,
					lte: endOfDay,
				},
				restaurant: {
					isActive: true,
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
