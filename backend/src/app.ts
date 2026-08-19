import express from 'express'
import cors from 'cors'

import restaurantsRouter from './routes/restaurants.js'
import dishesRouter from './routes/dishes.js'

const app = express()

app.use(
	cors({
		origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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

export default app
