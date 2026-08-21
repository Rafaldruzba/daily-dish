import { Router } from 'express'
import prisma from '../lib/prisma.js'

const router = Router()

// GET /api/stats
// Pobiera statystyki systemowe: liczbę zarejestrowanych użytkowników i wyświetleń strony
router.get('/', async (_req, res) => {
	try {
		const totalUsers = await prisma.user.count()

		let stats = await prisma.systemStats.findUnique({
			where: { id: 'global' },
		})

		if (!stats) {
			stats = await prisma.systemStats.create({
				data: { id: 'global', views: 0 },
			})
		}

		res.json({
			success: true,
			totalUsers,
			totalViews: stats.views,
		})
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać statystyk' })
	}
})

// POST /api/stats/visit
// Zwiększa licznik odwiedzin strony głównej
router.post('/visit', async (_req, res) => {
	try {
		const stats = await prisma.systemStats.upsert({
			where: { id: 'global' },
			update: { views: { increment: 1 } },
			create: { id: 'global', views: 1 },
		})

		res.json({
			success: true,
			views: stats.views,
		})
	} catch (error) {
		console.error(error)
		res.status(500).json({ success: false, message: 'Nie udało się zarejestrować wizyty' })
	}
})

export default router
