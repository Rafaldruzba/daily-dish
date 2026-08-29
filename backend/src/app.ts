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

const app = express()

const corsOptions = {
	origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
		// Allow requests with no origin (like mobile apps or curl requests)
		if (!origin) {
			return callback(null, true)
		}

		const allowedOrigins = [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:5173']

		// Check if the origin is a localhost URL on any port
		if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) {
			return callback(null, true)
		}

		// Check if the origin is a Railway preview URL
		if (/\.up\.railway\.app$/.test(origin)) {
			return callback(null, true)
		}

		if (allowedOrigins.indexOf(origin) !== -1) {
			callback(null, true)
		} else {
			callback(new Error('Not allowed by CORS'))
		}
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

export default app
