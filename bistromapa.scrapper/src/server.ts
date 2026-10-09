import express, { type Request, type Response } from 'express'
import cors from 'cors'
import 'dotenv/config'
import { MAX_RESTAURANTS_PER_RUN, scrapeBatch } from './services/scraper.service.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json({ limit: '1mb' }))

app.get('/health', (_req, res) => {
	res.json({ status: 'ok' })
})

// POST /api/scrape-batch  { restaurants: [{ id, name, facebookUrl }, ...] }  (1-25 lokali = 1 run Apify)
app.post('/api/scrape-batch', async (req: Request, res: Response) => {
	try {
		const { restaurants } = req.body ?? {}

		const valid =
			Array.isArray(restaurants) &&
			restaurants.length > 0 &&
			restaurants.length <= MAX_RESTAURANTS_PER_RUN &&
			restaurants.every(
				(r: any) => typeof r?.id === 'string' && typeof r?.name === 'string' && typeof r?.facebookUrl === 'string',
			)

		if (!valid) {
			return res.status(400).json({
				success: false,
				message: `Wymagana tablica restaurants (1-${MAX_RESTAURANTS_PER_RUN}) z polami id, name, facebookUrl.`,
			})
		}

		const results = await scrapeBatch(restaurants)
		res.json({ success: true, results })
	} catch (error: any) {
		console.error('❌ Błąd batcha:', error)
		res.status(500).json({ success: false, message: error.message || 'Wewnętrzny błąd mikrousługi.' })
	}
})

app.listen(PORT, () => console.log(`🚀 [Scraper Service] Działa na porcie ${PORT}`))
