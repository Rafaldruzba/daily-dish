import { Router, type Response } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'

const router = Router()

/**
 * Pomocnicza funkcja do ponownego przeliczania średniej oceny restauracji
 */
async function recalculateRestaurantRating(restaurantId: string) {
	try {
		const reviews = await prisma.review.findMany({
			where: { restaurantId, isHidden: false },
		})
		const count = reviews.length
		const avg = count > 0 ? reviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / count : 5.0 // Domyślnie 5.0 przy braku opinii

		await prisma.restaurant.update({
			where: { id: restaurantId },
			data: {
				rating: avg,
			},
		})
	} catch (err) {
		console.error('❌ Błąd przeliczania oceny restauracji:', err)
	}
}

// GET /api/restaurants/:id/reviews
// Pobiera listę wszystkich opinii danej restauracji (tylko nieukryte)
router.get('/:id/reviews', async (req, res) => {
	try {
		const id = req.params.id as string

		const reviews = await prisma.review.findMany({
			where: { restaurantId: id, isHidden: false },
			include: {
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})

		res.json(reviews)
	} catch (error) {
		console.error('❌ Error fetching reviews:', error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać opinii.' })
	}
})

// POST /api/restaurants/:id/reviews
// Dodaje opinię z komentarzem (tylko zalogowany USER / ADMIN, blokada dla OWNER)
router.post('/:id/reviews', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony.' })
		}

		const id = req.params.id as string
		const { rating, comment } = req.body
		const userId = req.user.id

		// Sprawdzamy rolę użytkownika - restaurator nie może wystawiać opinii
		const user = await prisma.user.findUnique({
			where: { id: userId },
		})

		if (!user) {
			return res.status(404).json({ success: false, message: 'Użytkownik nie istnieje.' })
		}

		if (user.role === 'OWNER') {
			return res.status(403).json({
				success: false,
				message: 'Restauratorzy nie mogą wystawiać opinii ani komentować lokali.',
			})
		}

		// Sprawdzamy, czy użytkownik ma aktywnego bana na komentarze
		if (user.commentBanExpiresAt && user.commentBanExpiresAt > new Date()) {
			return res.status(403).json({
				success: false,
				message: `Twoja możliwość komentowania została zablokowana przez moderatora. Ban wygasa: ${new Date(user.commentBanExpiresAt).toLocaleString('pl-PL')}`,
			})
		}

		// Walidacja ratingu i komentarza (nie można dodać opinii bez komentarza i na odwrót)
		const parsedRating = parseInt(rating)
		if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
			return res.status(400).json({
				success: false,
				message: 'Ocena jest wymagana i musi być liczbą całkowitą od 1 do 5.',
			})
		}

		if (!comment || comment.trim().length < 3) {
			return res.status(400).json({
				success: false,
				message: 'Komentarz do opinii jest wymagany i musi mieć co najmniej 3 znaki.',
			})
		}

		// Sprawdzamy, czy opinia już istnieje (1 użytkownik = 1 opinia na restaurację)
		const existingReview = await prisma.review.findUnique({
			where: {
				userId_restaurantId: {
					userId,
					restaurantId: id,
				},
			},
		})

		if (existingReview) {
			return res.status(400).json({
				success: false,
				message: 'Wystawiłeś już opinię dla tej restauracji. Możesz ją edytować lub usunąć za pośrednictwem administratora.',
			})
		}

		// Tworzymy opinię
		const review = await prisma.review.create({
			data: {
				rating: parsedRating,
				comment: comment.trim(),
				userId,
				restaurantId: id,
			},
			include: {
				user: {
					select: {
						id: true,
						name: true,
					},
				},
			},
		})

		// Przeliczamy średnią ocenę restauracji
		await recalculateRestaurantRating(id)

		res.status(201).json({
			success: true,
			message: 'Dziękujemy! Twoja opinia została pomyślnie opublikowana.',
			review,
		})
	} catch (error) {
		console.error('❌ Error creating review:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas dodawania opinii.' })
	}
})

// POST /api/reviews/:id/report
// Zgłaszanie opinii/komentarza (auto-hide i trafia do panelu admina)
router.post('/report/:reviewId', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony.' })
		}

		const reviewId = req.params.reviewId as string
		const { reason } = req.body
		const userId = req.user.id

		if (!reason) {
			return res.status(400).json({ success: false, message: 'Powód zgłoszenia jest wymagany.' })
		}

		const review = await prisma.review.findUnique({
			where: { id: reviewId },
		})

		if (!review) {
			return res.status(404).json({ success: false, message: 'Opinia nie istnieje.' })
		}

		// Tworzymy zgłoszenie komentarza w bazie danych
		await prisma.commentReport.create({
			data: {
				reviewId,
				userId,
				reason,
			},
		})

		// Automatyczne ukrycie zgłoszonego komentarza (auto-hide)
		await prisma.review.update({
			where: { id: reviewId },
			data: {
				isHidden: true,
			},
		})

		// Przeliczamy ocenę lokalu (ponieważ ukryty komentarz nie wchodzi w skład średniej)
		await recalculateRestaurantRating(review.restaurantId)

		res.json({
			success: true,
			message: 'Komentarz został pomyślnie zgłoszony i ukryty do czasu weryfikacji przez moderatora. Dziękujemy za dbanie o społeczność!',
		})
	} catch (error) {
		console.error('❌ Error reporting review:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas zgłaszania opinii.' })
	}
})

// GET /api/reviews/me
// Pobiera wszystkie opinie wystawione przez zalogowanego użytkownika
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony.' })
		}
		const reviews = await prisma.review.findMany({
			where: { userId: req.user.id },
			include: {
				restaurant: {
					select: {
						id: true,
						name: true,
						slug: true,
					}
				}
			},
			orderBy: { createdAt: 'desc' }
		})
		res.json(reviews)
	} catch (error) {
		console.error('❌ Error fetching user reviews:', error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać Twoich opinii.' })
	}
})

export default router
