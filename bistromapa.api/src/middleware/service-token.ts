import type { Request, Response, NextFunction } from 'express'

/**
 * Autoryzacja wywołań server-to-server z CRM (console.bistromapa.app).
 *
 * CRM nie loguje się jako użytkownik — uwierzytelnia się wspólnym sekretem
 * BISTRO_API_TOKEN. Endpointy CRM nie mogą być publiczne, bo tworzą konta
 * i ustawiają hasła.
 */
export function requireServiceToken(req: Request, res: Response, next: NextFunction) {
	const expected = process.env.BISTRO_API_TOKEN

	if (!expected) {
		// Brak konfiguracji to błąd serwera, nie klienta — nie zdradzamy szczegółów.
		console.error('❌ BISTRO_API_TOKEN nie jest ustawione — endpointy CRM są wyłączone')
		return res.status(503).json({
			success: false,
			message: 'Integracja CRM nie jest skonfigurowana.',
		})
	}

	if (req.headers.authorization !== `Bearer ${expected}`) {
		return res.status(401).json({
			success: false,
			message: 'Nieautoryzowane.',
		})
	}

	next()
}
