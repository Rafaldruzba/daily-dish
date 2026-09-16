import { Router, type Response } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// GET /api/logs/admin/all
router.get('/admin/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const logs = await prisma.systemLog.findMany({
			orderBy: { createdAt: 'desc' },
			take: 200, // Limit to recent 200 logs
		})
		res.json(logs)
	} catch (error) {
		console.error('❌ Error fetching system logs:', error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać logów' })
	}
})

export default router
