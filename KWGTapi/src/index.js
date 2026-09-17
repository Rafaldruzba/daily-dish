import 'dotenv/config'
import express from 'express'
import { PrismaClient } from '@prisma/client'

// Połącz z główną bazą BistroMapy (te same dane co aplikacja)
const prisma = new PrismaClient({
	datasources: {
		db: { url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daily_dish?schema=public' },
	},
})

// CRM ma osobną bazę — ładowanie przez osobny client, jeśli trzeba
// (tutaj zakładamy, że wszystko jest w głównej; jeśli potrzebujesz CRM,
// dodaj drugi PrismaClient z DATABASE_URL_CRM — ale dla widgetu 4 liczby wystarcza główna)

const app = express()

/**
 * Widget dla KWGT — JSON z 4 liczbami. Bez autoryzacji (publiczne),
 * czytelne, statyczne — wystarczy odświeżenie co jakiś czas.
 */
app.get('/widget', async (_req, res) => {
	try {
		// 1. Liczba zarejestrowanych kont (User / AdminUser z CRM — używamy głównej User)
		const users = await prisma.user.count()

		// 2. Odwiedziny — sumowanie wizyt wszystkich restauracji (Restaurant.views)
		const visitsResult = await prisma.$queryRawUnsafe(`SELECT COALESCE(SUM(views),0)::int as total FROM "Restaurant"`)
		const totalVisits =
			visitsResult && Array.isArray(visitsResult) && visitsResult[0] && visitsResult[0].total
				? Number(visitsResult[0].total)
				: 0

		// 3. Liczba podjętych prób kontaktu — z CRM Lead.contactAttempts
		// Uwaga: CRM ma osobną bazę (crm_console) — jeśli masz ją pod ręką lokalnie,
		// podłącz się przez DATABASE_URL_CRM. Jeśli nie — zostaw 0 z komentarzem.
		let contactAttempts = 0
		try {
			const crmUrl = process.env.DATABASE_URL_CRM || process.env.DATABASE_URL
			if (crmUrl && crmUrl !== process.env.DATABASE_URL) {
				// Wymaga osobnego klienta — uproszczone: zakładamy, że użytkownik podłączy ręcznie
				// lub że main ma też te dane. W praktyce można dodać drugi PrismaClient.
				contactAttempts = 0 // placeholder — do wypełnienia przy podłączaniu CRM
			}
		} catch {
			// Brak CRM — nie psuje odpowiedzi
		}

		// 4. Status aplikacji — nazwa + stan
		const status = {
			name: 'BistroMapa',
			ready: true,
			version: '2026.09.17',
			lastUpdate: new Date().toISOString(),
		}

		res.json({
			users,
			visits: totalVisits,
			contactAttempts,
			status: status.name,
			ready: status.ready,
		})
	} catch (error) {
		console.error('KWGT widget error:', error)
		res.status(500).json({ error: 'Błąd pobierania danych' })
	}
})

/** Prosty ping — do sprawdzenia czy serwer żyje z widgetu */
app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4004
app.listen(PORT, () => console.log(`KWGT-api: http://localhost:${PORT}/widget`))
