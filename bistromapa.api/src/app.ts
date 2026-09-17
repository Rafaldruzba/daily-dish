import express from 'express'
import cors from 'cors'

import { isOriginAllowed } from './lib/cors.js'
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

const corsOptions = {
	origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
		if (isOriginAllowed(origin)) {
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
