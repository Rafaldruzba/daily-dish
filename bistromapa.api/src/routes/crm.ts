import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

import prisma from '../lib/prisma.js'
import { slugify } from '../lib/slug.js'
import { requireServiceToken } from '../middleware/service-token.js'
import logger from '../services/logger.service.js'

const router = Router()

// Wszystkie endpointy CRM są wewnętrzne (readme §33) — tylko dla console.bistromapa.app
router.use(requireServiceToken)

interface OnboardingBody {
	name?: string
	city?: string
	address?: string | null
	phone?: string | null
	email?: string
	category?: string | null
	contactPerson?: string | null
}

/**
 * POST /api/crm/onboarding
 *
 * Tworzy komplet dla zaakceptowanego leada: konto właściciela (OWNER) + lokal
 * w statusie PENDING. Hasło jest losowe i nieużywalne — właściciel ustawia własne
 * przez link aktywacyjny wysłany z CRM (readme §24).
 *
 * Idempotencja: powtórne wywołanie dla tego samego e-maila zwraca istniejący
 * komplet (200) zamiast tworzyć drugie konto i drugi lokal (readme §25, §34).
 */
router.post('/onboarding', async (req: Request, res: Response) => {
	try {
		const { name, city, address, phone, email, category, contactPerson } = req.body as OnboardingBody

		if (!name?.trim() || !city?.trim() || !email?.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Nazwa, miasto i e-mail są wymagane.',
			})
		}

		const cleanEmail = email.toLowerCase().trim()

		// Powtórzone wywołanie (retry z CRM) nie może stworzyć drugiego lokalu.
		const existingUser = await prisma.user.findUnique({
			where: { email: cleanEmail },
			include: { restaurants: true },
		})

		if (existingUser) {
			const existingRestaurant = existingUser.restaurants[0]

			if (!existingRestaurant) {
				return res.status(409).json({
					success: false,
					message: 'Konto o tym adresie e-mail już istnieje i nie ma przypisanego lokalu.',
				})
			}

			return res.status(200).json({
				success: true,
				restaurantId: existingRestaurant.id,
				userId: existingUser.id,
				alreadyExisted: true,
			})
		}

		const slug = await buildUniqueSlug(name)
		// Losowe hasło — konto jest bezużyteczne do momentu aktywacji (readme §24).
		const placeholderPassword = await bcrypt.hash(randomUUID(), 10)

		const result = await prisma.$transaction(async tx => {
			const user = await tx.user.create({
				data: {
					email: cleanEmail,
					password: placeholderPassword,
					name: contactPerson?.trim() || null,
					role: 'OWNER',
					city: city.trim(),
				},
			})

			const restaurant = await tx.restaurant.create({
				data: {
					name: name.trim(),
					slug,
					phone: phone?.trim() || null,
					address: address?.trim() || null,
					city: city.trim(),
					citySlug: slugify(city),
					cuisines: category ? [slugify(category)] : [],
					status: 'PENDING',
					// Widoczność ustawia moderator przez /restaurants/admin/:id/status —
					// onboarding nie omija moderacji.
					isActive: false,
					userId: user.id,
				},
			})

			await tx.ownershipDeclaration.create({
				data: {
					userId: user.id,
					restaurantId: restaurant.id,
					ownerPhone: phone?.trim() || '',
					representsSelf: true,
					acceptedTerms: true,
				},
			})

			return { user, restaurant }
		})

		await logger.info(`CRM onboarding: utworzono lokal ${result.restaurant.name} (${result.restaurant.id}) dla ${cleanEmail}`)

		res.status(201).json({
			success: true,
			restaurantId: result.restaurant.id,
			userId: result.user.id,
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('❌ Błąd onboardingu CRM:', message)
		await logger.error('Błąd onboardingu CRM', message)

		res.status(500).json({
			success: false,
			message: 'Nie udało się utworzyć lokalu.',
		})
	}
})

/**
 * POST /api/crm/activate
 *
 * Ustawia hasło właściciela po weryfikacji tokenu po stronie CRM (readme §24).
 * Token zna wyłącznie CRM — tutaj trafia już rozwiązany userId.
 */
router.post('/activate', async (req: Request, res: Response) => {
	try {
		const { userId, password } = req.body as { userId?: string; password?: string }

		if (!userId || !password) {
			return res.status(400).json({
				success: false,
				message: 'userId oraz password są wymagane.',
			})
		}

		if (password.length < 12) {
			return res.status(400).json({
				success: false,
				message: 'Hasło musi mieć co najmniej 12 znaków.',
			})
		}

		const user = await prisma.user.findUnique({ where: { id: userId } })

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'Użytkownik nie istnieje.',
			})
		}

		await prisma.user.update({
			where: { id: userId },
			data: { password: await bcrypt.hash(password, 10) },
		})

		await logger.info(`CRM aktywacja: ustawiono hasło dla konta ${user.email}`)

		res.status(200).json({
			success: true,
			message: 'Hasło zostało ustawione.',
		})
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error)
		console.error('❌ Błąd aktywacji konta z CRM:', message)
		await logger.error('Błąd aktywacji konta z CRM', message)

		res.status(500).json({
			success: false,
			message: 'Nie udało się aktywować konta.',
		})
	}
})

/** "Pizza Roma" → "pizza-roma", a przy kolizji "pizza-roma-2", "pizza-roma-3"... */
async function buildUniqueSlug(name: string): Promise<string> {
	const base = slugify(name) || 'lokal'
	let candidate = base

	for (let suffix = 2; suffix < 100; suffix++) {
		const taken = await prisma.restaurant.findUnique({ where: { slug: candidate } })
		if (!taken) return candidate

		candidate = `${base}-${suffix}`
	}

	return `${base}-${randomUUID().slice(0, 8)}`
}

export default router
