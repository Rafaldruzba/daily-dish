import express from 'express'
import cors from 'cors'

import restaurantsRouter from './routes/restaurants.js'
import dishesRouter from './routes/dishes.js'
import authRouter from './routes/auth.js'
import statsRouter from './routes/stats.js'
import offersRouter from './routes/offers.js'
import paymentsRouter from './routes/payments.js'
import logsRouter from './routes/logs.js'
import reviewsRouter from './routes/reviews.js'
import reportsRouter from './routes/reports.js'
import seoRouter from './routes/seo.js'
import crmRouter from './routes/crm.js'

const app = express()

/** Domena, której subdomeny (www, console, staging…) mają dostęp do API. */
const ROOT_DOMAIN = 'bistromapa.app'

/**
 * Lista dozwolonych originów. `FRONTEND_URL` może zawierać kilka adresów
 * rozdzielonych przecinkiem — bez tego każdy nowy frontend wymaga zmiany kodu.
 */
function buildAllowedOrigins(): string[] {
	const fromEnv = (process.env.FRONTEND_URL ?? '')
		.split(',')
		.map(value => value.trim().replace(/\/+$/, ''))
		.filter(Boolean)

	return [
		...fromEnv,
		`https://${ROOT_DOMAIN}`,
		`https://www.${ROOT_DOMAIN}`,
		'https://staging.bistromapa.app',
		'https://console.bistromapa.app',
		'http://localhost:3000',
		'http://localhost:3001',
		'http://localhost:5173',
	]
}

const corsOptions = {
	origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
		// Brak origin = żądanie server-to-server (CRM, curl) — CORS nie dotyczy
		if (!origin) {
			return callback(null, true)
		}

		const normalized = origin.trim().replace(/\/+$/, '')

		// Każda subdomena naszej domeny (www, console, staging, api…) + podglądy Railway
		const isOwnDomain = normalized === `https://${ROOT_DOMAIN}` || normalized.endsWith(`.${ROOT_DOMAIN}`)
		const isLocalhost = /^https?:\/\/localhost(:\d+)?$/.test(normalized)
		const isRailwayPreview = /\.up\.railway\.app$/.test(normalized)
		const isListed = buildAllowedOrigins().includes(normalized)

		if (isOwnDomain || isLocalhost || isRailwayPreview || isListed) {
			return callback(null, true)
		}

		// Bez tego logu odrzucony origin widać tylko jako stack trace bez kontekstu
		console.warn(`[CORS] Odrzucony origin: ${origin} — dopisz go do FRONTEND_URL (po przecinku)`)
		callback(null, false)
	},
	credentials: true,
}

app.use(cors(corsOptions))
app.use(
	express.json({
		verify: (req: any, _res, buf) => {
			req.rawBody = buf
		},
	}),
)

app.get('/api/health', (_req, res) => {
	res.json({
		success: true,
		message: 'BISTRO MAPA API działa!',
	})
})

app.use('/api/restaurants', restaurantsRouter)
app.use('/api/dishes', dishesRouter)
app.use('/api/auth', authRouter)
app.use('/api/stats', statsRouter)
app.use('/api/offers', offersRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/logs', logsRouter)
app.use('/api/reviews', reviewsRouter)
app.use('/api/reports', reportsRouter)
app.use('/api/seo', seoRouter)
// Integracja z CRM (console.bistromapa.app) — autoryzacja przez BISTRO_API_TOKEN
app.use('/api/crm', crmRouter)

export default app
