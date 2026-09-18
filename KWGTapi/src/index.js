import express from 'express'
import pg from 'pg'
import 'dotenv/config'

const { Pool } = pg // Używamy Pool zamiast Client do ponownego wykorzystywania połączeń

const app = express()

const WIDGET_KEY = process.env.WIDGET_KEY || ''
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/daily_dish?schema=public'
const crmUrl = process.env.DATABASE_URL_CRM

// Inicjalizujemy pule połączeń raz przy starcie (max 2 połączenia wystarczą)
const mainPool = new Pool({ connectionString: dbUrl, max: 2 })
const crmPool = crmUrl && crmUrl !== dbUrl ? new Pool({ connectionString: crmUrl, max: 2 }) : null

app.get('/widget', async (_req, res) => {
	if (WIDGET_KEY && String(_req.query?.key ?? '') !== WIDGET_KEY) {
		return res.status(403).json({ error: 'Niezautoryzowany — użyj ?key=' + WIDGET_KEY })
	}

	try {
		// Zapytania wykonujemy bezpośrednio przez pool.query
		const usersRes = await mainPool.query('SELECT COUNT(*)::int as total FROM "User"')
		const visitsRes = await mainPool.query('SELECT COALESCE(SUM(views),0)::int as total FROM "Restaurant"')
		const restaurantsRes = await mainPool.query(
			'SELECT COUNT(*)::int as total FROM "Restaurant" WHERE "isActive" = true',
		)
		const reviewsRes = await mainPool.query('SELECT COUNT(*)::int as total FROM "Review"')

		let contactAttempts = 0
		if (crmPool) {
			try {
				const crmRes = await crmPool.query('SELECT COALESCE(SUM(contactAttempts),0)::int as total FROM "Lead"')
				if (crmRes.rows[0] && crmRes.rows[0].total !== null) {
					contactAttempts = Number(crmRes.rows[0].total)
				}
			} catch (crmError) {
				console.error('Błąd pobierania z CRM:', crmError.message)
			}
		}

		const status = { name: 'BistroMapa', ready: true, version: '2026.09.18', lastUpdate: new Date().toISOString() }

		// Zmieniono klucze z cyfr ("1", "2") na czytelne nazwy słowne + zachowano stary format dla kompatybilności
		const data = {
			users: usersRes.rows[0].total,
			visits: visitsRes.rows[0]?.total ?? 0,
			restaurants: restaurantsRes.rows[0].total,
			reviews: reviewsRes.rows[0].total,
			contactAttempts: contactAttempts,
			status: status.name,
			ready: status.ready,
			version: status.version,
			lastUpdate: status.lastUpdate,
			// Mapowanie numeryczne dla zachowania wstecznej kompatybilności:
			1: usersRes.rows[0].total,
			2: visitsRes.rows[0]?.total ?? 0,
			3: restaurantsRes.rows[0].total,
			4: reviewsRes.rows[0].total,
			5: contactAttempts,
			6: status.name,
		}

		// Opcjonalne pobieranie pojedynczego pola przez URL np. &field=users
		if (_req.query?.field && data[_req.query.field] !== undefined) {
			return res.send(String(data[_req.query.field]))
		}

		res.json(data)
	} catch (error) {
		console.error('KWGT widget error:', error)
		res.status(500).json({ error: 'Błąd pobierania danych' })
	}
})

app.get('/health', (_req, res) => res.json({ ok: true }))

const PORT = process.env.PORT || 4004
app.listen(PORT, () => console.log(`KWGT-api: http://localhost:${PORT}/widget?key=${WIDGET_KEY}`))
