import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'
import redisClient from '../lib/redis.js'
import { sendVerificationCode, sendPasswordResetEmail } from '../services/email.service.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-daily-dish-key'

// POST /api/auth/register
// Generuje i wysyła kod weryfikacyjny (OTP) na maila
router.post('/register', async (req, res) => {
	try {
		const { email, password, name, accountType, city, nip, ownerPhone, representsSelf, acceptedTerms } = req.body

		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Email i hasło są wymagane.',
			})
		}

		if (password.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'Hasło musi mieć co najmniej 6 znaków.',
			})
		}

		if (!acceptedTerms) {
			return res.status(400).json({
				success: false,
				message: 'Musisz zaakceptować regulamin serwisu.',
			})
		}

		if (accountType === 'OWNER') {
			if (!ownerPhone) {
				return res.status(400).json({
					success: false,
					message: 'Numer telefonu jest wymagany dla konta restauracji.',
				})
			}
			if (!representsSelf) {
				return res.status(400).json({
					success: false,
					message: 'Musisz potwierdzić, że jesteś właścicielem lub posiadasz uprawnienia do reprezentacji lokalu.',
				})
			}
		}

		const existingUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
		})

		if (existingUser) {
			return res.status(409).json({
				success: false,
				message: 'Konto o tym adresie email już istnieje.',
			})
		}

		// Generowanie 6-cyfrowego kodu weryfikacyjnego
		const code = Math.floor(100000 + Math.random() * 900000).toString()

		// Zapisanie danych tymczasowych w Redis na 15 minut (TTL 900 sekund)
		if (redisClient.isOpen) {
			const pendingData = {
				email: email.toLowerCase().trim(),
				password, // Haszowanie nastąpi dopiero przy zatwierdzeniu weryfikacji
				name: name?.trim() || null,
				accountType,
				city: city?.trim() || null,
				nip: nip?.trim() || null,
				ownerPhone: ownerPhone?.trim() || null,
				representsSelf: !!representsSelf,
				acceptedTerms: !!acceptedTerms,
				code,
			}
			await redisClient.set(`pending_register:${email.toLowerCase().trim()}`, JSON.stringify(pendingData), {
				EX: 900,
			})
		} else {
			return res.status(500).json({
				success: false,
				message: 'Usługa weryfikacji jest tymczasowo niedostępna (Redis błąd).',
			})
		}

		// Wysłanie e-maila z kodem weryfikacyjnym
		const mailSent = await sendVerificationCode(email.toLowerCase().trim(), code)
		if (!mailSent) {
			return res.status(500).json({
				success: false,
				message: 'Nie udało się wysłać kodu weryfikacyjnego na podany adres e-mail.',
			})
		}

		res.status(200).json({
			success: true,
			message: 'Kod weryfikacyjny został wysłany na podany e-mail. Wpisz go, aby dokończyć rejestrację.',
		})
	} catch (error) {
		console.error('Błąd żądania rejestracji:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas żądania rejestracji.',
		})
	}
})

// POST /api/auth/register/verify
// Odbiera kod, sprawdza go w Redis, tworzy konto użytkownika i loguje (JWT)
router.post('/register/verify', async (req, res) => {
	try {
		const { email, code } = req.body

		if (!email || !code) {
			return res.status(400).json({
				success: false,
				message: 'Email oraz kod są wymagane.',
			})
		}

		const cacheKey = `pending_register:${email.toLowerCase().trim()}`
		if (!redisClient.isOpen) {
			return res.status(500).json({
				success: false,
				message: 'Serwer weryfikacji nie odpowiada.',
			})
		}

		const cachedData = await redisClient.get(cacheKey)
		if (!cachedData) {
			return res.status(400).json({
				success: false,
				message: 'Kod weryfikacyjny wygasł lub nie został wygenerowany. Poproś o nowy kod rejestracyjny.',
			})
		}

		const pendingUser = JSON.parse(cachedData)

		if (pendingUser.code !== code.trim()) {
			return res.status(400).json({
				success: false,
				message: 'Podany kod weryfikacyjny jest nieprawidłowy.',
			})
		}

		// Kod jest poprawny! Tworzymy użytkownika w bazie danych.
		const existingUser = await prisma.user.findUnique({
			where: { email: pendingUser.email },
		})

		if (existingUser) {
			return res.status(409).json({
				success: false,
				message: 'Konto o tym adresie email zostało już utworzone w międzyczasie.',
			})
		}

		const hashedPassword = await bcrypt.hash(pendingUser.password, 10)

		// Sprawdzamy czy to pierwszy użytkownik lub ma email admina
		const userCount = await prisma.user.count()
		const isFirstUser = userCount === 0
		const isAdminEmail =
			pendingUser.email === 'admin@dailydish.com' || pendingUser.email.startsWith('admin@')

		let role = 'USER'
		if (isFirstUser || isAdminEmail) {
			role = 'ADMIN'
		} else if (pendingUser.accountType === 'OWNER') {
			role = 'OWNER'
		}

		// Tworzymy użytkownika oraz oświadczenie własności w transakcji
		const user = await prisma.$transaction(async (tx) => {
			const u = await tx.user.create({
				data: {
					email: pendingUser.email,
					password: hashedPassword,
					name: pendingUser.name,
					role,
					city: pendingUser.city,
				},
			})

			if (role === 'OWNER') {
				await tx.ownershipDeclaration.create({
					data: {
						userId: u.id,
						nip: pendingUser.nip,
						ownerPhone: pendingUser.ownerPhone || '',
						representsSelf: pendingUser.representsSelf,
						acceptedTerms: pendingUser.acceptedTerms,
					},
				})
			}

			return u
		})

		// Usuwamy dane z Redis po udanej rejestracji
		await redisClient.del(cacheKey)

		const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

		res.status(201).json({
			success: true,
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			},
		})
	} catch (error) {
		console.error('Błąd weryfikacji kodu rejestracji:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas weryfikacji konta.',
		})
	}
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
	try {
		const { email, password } = req.body

		if (!email || !password) {
			return res.status(400).json({
				success: false,
				message: 'Email i hasło są wymagane.',
			})
		}

		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
		})

		if (!user) {
			return res.status(401).json({
				success: false,
				message: 'Nieprawidłowy email lub hasło.',
			})
		}

		const isPasswordValid = await bcrypt.compare(password, user.password)

		if (!isPasswordValid) {
			return res.status(401).json({
				success: false,
				message: 'Nieprawidłowy email lub hasło.',
			})
		}

		if (user.role === 'OWNER') {
			const ownedRestaurants = await prisma.restaurant.findMany({
				where: { userId: user.id }
			})
			const allInRemoval = ownedRestaurants.length > 0 && ownedRestaurants.every(r => r.status === 'REMOVAL')
			if (allInRemoval) {
				return res.status(403).json({
					success: false,
					message: 'Twoje konto jest w trakcie usuwania (okres karencji 3 miesięcy). Skontaktuj się z administratorem, jeśli chcesz cofnąć tę decyzję.'
				})
			}
		}

		const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' })

		res.json({
			success: true,
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
			},
		})
	} catch (error) {
		console.error('Błąd logowania:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas logowania.',
		})
	}
})

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({
				success: false,
				message: 'Nieuwierzytelniony.',
			})
		}

		const user = await prisma.user.findUnique({
			where: { id: req.user.id },
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				createdAt: true,
			},
		})

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'Użytkownik nie istnieje.',
			})
		}

		res.json({
			success: true,
			user,
		})
	} catch (error) {
		console.error('Błąd pobierania danych użytkownika:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas pobierania danych użytkownika.',
		})
	}
})

// PUT /api/auth/me
// Aktualizuje profil zalogowanego użytkownika (imię, miejscowość)
router.put('/me', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony.' })
		}

		const { name, city } = req.body

		const updatedUser = await prisma.user.update({
			where: { id: req.user.id },
			data: {
				name: name?.trim() || null,
				city: city?.trim() || null,
			},
			select: {
				id: true,
				email: true,
				name: true,
				role: true,
				city: true,
			},
		})

		res.json({
			success: true,
			message: 'Profil został pomyślnie zaktualizowany.',
			user: updatedUser,
		})
	} catch (error) {
		console.error('Error updating user profile:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas aktualizacji profilu.' })
	}
})

// DELETE /api/auth/me
// Usuwanie własnego konta (USER: natychmiast, OWNER: zmiana statusu na REMOVAL na 3 miesiące)
router.delete('/me', authenticate, async (req: AuthRequest, res: Response) => {
	try {
		if (!req.user) {
			return res.status(401).json({ success: false, message: 'Nieuwierzytelniony.' })
		}

		const userId = req.user.id
		const userRole = req.user.role

		if (userRole === 'OWNER') {
			// Właściciel: Ustawiamy status REMOVAL i datę karencji na 3 miesiące
			const now = new Date()

			await prisma.$transaction([
				// 1. Zmiana statusu wszystkich restauracji właściciela na REMOVAL
				prisma.restaurant.updateMany({
					where: { userId },
					data: {
						status: 'REMOVAL',
						removalRequestedAt: now,
						isActive: false, // Wstrzymujemy automatyczne pobieranie dań dnia
					},
				}),
				// 2. Anulowanie/wygaśnięcie wszystkich subskrypcji właściciela
				prisma.subscription.updateMany({
					where: {
						restaurant: { userId },
						status: 'ACTIVE',
					},
					data: {
						status: 'CANCELLED',
					},
				}),
			])

			// Czyścimy Redis cache dla wszystkich miast powiązanych z lokalami tego właściciela
			try {
				const ownedRestaurants = await prisma.restaurant.findMany({
					where: { userId },
					select: { city: true },
				})
				if (redisClient.isOpen) {
					const cities = [...new Set(ownedRestaurants.map(r => r.city))]
					for (const city of cities) {
						await redisClient.del(`restaurants:${city}`)
					}
					await redisClient.del('restaurants:all')
				}
			} catch (err) {
				console.error('Error invalidating Redis cache during deletion:', err)
			}

			res.json({
				success: true,
				message: 'Twoje lokale zostały zawieszone i ukryte, a konto zostało oznaczone do usunięcia. Okres karencji wynosi 3 miesiące, w ciągu których możesz odwołać tę operację kontaktując się z nami.',
			})
		} else {
			// Zwykły użytkownik: Natychmiastowe usunięcie kaskadowe
			await prisma.user.delete({
				where: { id: userId },
			})

			res.json({
				success: true,
				message: 'Twoje konto zostało bezpowrotnie usunięte z systemu BistroMapa. Dziękujemy za wspólny czas!',
			})
		}
	} catch (error) {
		console.error('Error deleting account:', error)
		res.status(500).json({ success: false, message: 'Wystąpił błąd podczas usuwania konta.' })
	}
})

// POST /api/auth/forgot-password
// Generuje i wysyła link resetujący hasło
router.post('/forgot-password', async (req, res) => {
	try {
		const { email } = req.body

		if (!email) {
			return res.status(400).json({
				success: false,
				message: 'Email jest wymagany.',
			})
		}

		const user = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
		})

		if (user) {
			const token = jwt.sign(
				{ userId: user.id, purpose: 'password-reset' },
				JWT_SECRET,
				{ expiresIn: '1h' }
			)

			const origin = req.headers.origin || 'http://localhost:5173'
			const resetLink = `${origin}/reset-password?token=${token}`

			const mailSent = await sendPasswordResetEmail(user.email, resetLink)
			if (!mailSent) {
				return res.status(500).json({
					success: false,
					message: 'Nie udało się wysłać linku resetującego na podany adres e-mail.',
				})
			}
		}

		res.status(200).json({
			success: true,
			message: 'Jeśli podany adres istnieje w naszym systemie, wysłaliśmy na niego link resetujący hasło.',
		})
	} catch (error) {
		console.error('Błąd żądania resetowania hasła:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas generowania prośby o resetowanie hasła.',
		})
	}
})

// POST /api/auth/reset-password
// Odbiera token, weryfikuje go, i zmienia hasło użytkownika
router.post('/reset-password', async (req, res) => {
	try {
		const { token, password } = req.body

		if (!token || !password) {
			return res.status(400).json({
				success: false,
				message: 'Token oraz nowe hasło są wymagane.',
			})
		}

		if (password.length < 6) {
			return res.status(400).json({
				success: false,
				message: 'Nowe hasło musi mieć co najmniej 6 znaków.',
			})
		}

		let decoded: any
		try {
			decoded = jwt.verify(token, JWT_SECRET)
		} catch (err) {
			return res.status(400).json({
				success: false,
				message: 'Link resetujący wygasł lub jest nieprawidłowy.',
			})
		}

		if (decoded.purpose !== 'password-reset' || !decoded.userId) {
			return res.status(400).json({
				success: false,
				message: 'Nieprawidłowy token resetowania hasła.',
			})
		}

		const user = await prisma.user.findUnique({
			where: { id: decoded.userId },
		})

		if (!user) {
			return res.status(404).json({
				success: false,
				message: 'Użytkownik nie istnieje.',
			})
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		await prisma.user.update({
			where: { id: user.id },
			data: { password: hashedPassword },
		})

		res.status(200).json({
			success: true,
			message: 'Twoje hasło zostało pomyślnie zmienione. Możesz teraz się zalogować przy użyciu nowego hasła.',
		})
	} catch (error) {
		console.error('Błąd resetowania hasła:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas resetowania hasła.',
		})
	}
})

export default router
