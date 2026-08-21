import { Router, type Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma from '../lib/prisma.js'
import { authenticate, type AuthRequest } from '../middleware/auth.js'

const router = Router()
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-daily-dish-key'

// POST /api/auth/register
router.post('/register', async (req, res) => {
	try {
		const { email, password, name, accountType } = req.body

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

		const existingUser = await prisma.user.findUnique({
			where: { email: email.toLowerCase().trim() },
		})

		if (existingUser) {
			return res.status(409).json({
				success: false,
				message: 'Konto o tym adresie email już istnieje.',
			})
		}

		const hashedPassword = await bcrypt.hash(password, 10)

		// Sprawdzamy czy to pierwszy użytkownik lub ma email admina
		const userCount = await prisma.user.count()
		const isFirstUser = userCount === 0
		const isAdminEmail = email.toLowerCase().trim() === 'admin@dailydish.com' || email.toLowerCase().trim().startsWith('admin@')
		
		let role = 'USER'
		if (isFirstUser || isAdminEmail) {
			role = 'ADMIN'
		} else if (accountType === 'OWNER') {
			role = 'OWNER'
		}

		const user = await prisma.user.create({
			data: {
				email: email.toLowerCase().trim(),
				password: hashedPassword,
				name: name?.trim() || null,
				role,
			},
		})

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role },
			JWT_SECRET,
			{ expiresIn: '7d' },
		)

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
		console.error('Błąd rejestracji:', error)
		res.status(500).json({
			success: false,
			message: 'Wystąpił błąd podczas rejestracji.',
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

		const token = jwt.sign(
			{ id: user.id, email: user.email, role: user.role },
			JWT_SECRET,
			{ expiresIn: '7d' },
		)

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

export default router
