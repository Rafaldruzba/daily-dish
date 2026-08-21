import express from 'express'
import cors from 'cors'

import restaurantsRouter from './routes/restaurants.js'
import dishesRouter from './routes/dishes.js'
import authRouter from './routes/auth.js'
import statsRouter from './routes/stats.js'

const app = express()

app.use(
	cors({
		origin: (origin, callback) => {
			// Zezwalaj na brak origin (np. Postman/Curl) lub localhost/127.0.0.1 na dowolnym porcie
			if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
				callback(null, true)
			} else {
				callback(null, [process.env.FRONTEND_URL || 'http://localhost:5173'])
			}
		},
		credentials: true,
		methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
		allowedHeaders: ['Content-Type', 'Authorization'],
	}),
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
	res.json({
		success: true,
		message: 'Daily Dish API działa!',
	})
})

app.use('/api/restaurants', restaurantsRouter)
app.use('/api/dishes', dishesRouter)
app.use('/api/auth', authRouter)
app.use('/api/stats', statsRouter)

export default app
