import type { Request, Response, NextFunction } from 'express'
import { randomUUID } from 'crypto'

export const requestIdHeader = 'x-request-id'

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
	// Użyj istniejącego ID z headera lub wygeneruj nowy
	const id = req.headers[requestIdHeader] as string
		?? req.headers[requestIdHeader.toLowerCase()] as string
		?? randomUUID()

	req.headers[requestIdHeader] = id
	res.setHeader(requestIdHeader, id)

	// Dodaj ID do res dla łatwego dostępu
	;(res as any).locals = (res as any).locals || {}
	;(res as any).locals.requestId = id

	next()
}
