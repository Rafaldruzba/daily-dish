import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-daily-dish-key'

export interface AuthRequest extends Request {
	user?: {
		id: string
		email: string
		role: string
	}
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
	const authHeader = req.headers.authorization

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return res.status(401).json({
			success: false,
			message: 'Brak tokenu autoryzacji. Zaloguj się.',
		})
	}

	const token = authHeader.split(' ')[1]

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as {
			id: string
			email: string
			role: string
		}
		req.user = decoded
		next()
	} catch (error) {
		return res.status(401).json({
			success: false,
			message: 'Nieprawidłowy lub przedawniony token autoryzacji.',
		})
	}
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
	if (!req.user || req.user.role !== 'ADMIN') {
		return res.status(403).json({
			success: false,
			message: 'Wymagane uprawnienia administratora.',
		})
	}
	next()
}
