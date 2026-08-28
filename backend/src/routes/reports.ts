import { Router, type Response } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'

const router = Router()

// POST /api/restaurants/:id/report
// Zgłaszanie błędów/oszustw dla restauracji (widoczne dla zalogowanych)
router.post('/restaurants/:id/report', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user || !req.user.id) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony.' })
		}

		const id = req.params.id as string
		const { reason, details } = req.body
		const userId = req.user.id

		if (!reason) {
			return res.status(400).json({ success: false, message: 'Powód zgłoszenia jest wymagany.' })
		}

		const restaurant = await prisma.restaurant.findUnique({
			where: { id },
		})

		if (!restaurant) {
			return res.status(404).json({ success: false, message: 'Restauracja nie istnieje.' })
		}

		await prisma.restaurantReport.create({
			data: {
				restaurantId: id,
				userId,
				reason,
				details: details?.trim() || null,
			},
		})

		res.json({
			success: true,
			message: 'Dziękujemy! Zgłoszenie dotyczące lokalu zostało pomyślnie zarejestrowane i zostanie zweryfikowane przez moderatora.',
		})
	} catch (error) {
		console.error('❌ Error reporting restaurant:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas zgłaszania restauracji.' })
	}
})

// GET /api/reports/admin/all
// Pobiera wszystkie aktywne zgłoszenia komentarzy i lokali (tylko ADMIN)
router.get('/admin/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const commentReports = await prisma.commentReport.findMany({
			include: {
				review: {
					include: {
						user: { select: { id: true, name: true, email: true } },
						restaurant: { select: { id: true, name: true, slug: true } },
					},
				},
				user: { select: { id: true, name: true, email: true } }, // Kto zgłosił
			},
			orderBy: { createdAt: 'desc' },
		})

		const restaurantReports = await prisma.restaurantReport.findMany({
			where: { resolved: false },
			include: {
				restaurant: { select: { id: true, name: true, slug: true, address: true, city: true } },
				user: { select: { id: true, name: true, email: true } },
			},
			orderBy: { createdAt: 'desc' },
		})

		res.json({
			commentReports,
			restaurantReports,
		})
	} catch (error) {
		console.error('❌ Error fetching admin reports:', error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać zgłoszeń.' })
	}
})

// PUT /api/reports/admin/comments/:id
// Rozstrzygnięcie zgłoszenia komentarza (tylko ADMIN)
// Body: { action: 'APPROVE' | 'DELETE' }
router.put('/admin/comments/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const id = req.params.id as string
		const { action } = req.body

		if (action !== 'APPROVE' && action !== 'DELETE') {
			return res.status(400).json({ success: false, message: 'Nieprawidłowa akcja.' })
		}

		const report = await prisma.commentReport.findUnique({
			where: { id },
			include: { review: true },
		})

		if (!report) {
			return res.status(404).json({ success: false, message: 'Zgłoszenie nie istnieje.' })
		}

		const reviewId = report.reviewId
		const authorId = report.review.userId

		if (action === 'APPROVE') {
			// Przywracamy komentarz
			await prisma.review.update({
				where: { id: reviewId },
				data: { isHidden: false },
			})

			// Usuwamy wszystkie zgłoszenia powiązane z tą opinią
			await prisma.commentReport.deleteMany({
				where: { reviewId },
			})

			res.json({ success: true, message: 'Opinia została zaakceptowana i przywrócona na profil restauracji.' })
		} else {
			// Ban na 3 dni dla autora
			const banExpires = new Date()
			banExpires.setDate(banExpires.getDate() + 3)

			await prisma.$transaction([
				// 1. Zbanowanie autora komentarza na 3 dni
				prisma.user.update({
					where: { id: authorId },
					data: { commentBanExpiresAt: banExpires },
				}),
				// 2. Trwałe usunięcie opinii (usunięcie kaskadowo usunie zgłoszenia CommentReport)
				prisma.review.delete({
					where: { id: reviewId },
				}),
			])

			res.json({ success: true, message: 'Zgłoszona opinia została usunięta z bazy, a jej autor otrzymał 3-dniową blokadę pisania komentarzy.' })
		}
	} catch (error) {
		console.error('❌ Error handling comment report:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas rozpatrywania zgłoszenia.' })
	}
})

// PUT /api/reports/admin/restaurants/:id
// Rozstrzygnięcie zgłoszenia restauracji (oznaczenie jako resolved)
router.put('/admin/restaurants/:id', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const id = req.params.id as string
		const report = await prisma.restaurantReport.findUnique({
			where: { id },
		})

		if (!report) {
			return res.status(404).json({ success: false, message: 'Zgłoszenie nie istnieje.' })
		}

		await prisma.restaurantReport.update({
			where: { id },
			data: { resolved: true },
		})

		res.json({ success: true, message: 'Zgłoszenie zostało oznaczone jako rozwiązane.' })
	} catch (error) {
		console.error('❌ Error resolving restaurant report:', error)
		res.status(500).json({ success: false, message: 'Nie udało się oznaczyć zgłoszenia jako rozwiązane.' })
	}
})

export default router
