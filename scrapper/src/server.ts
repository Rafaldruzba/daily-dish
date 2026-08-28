import express, { type Request, type Response } from 'express'
import cors from 'cors'
import 'dotenv/config'
import { scrapeFacebookPage } from './services/scraper.service.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/health', (_req, res) => {
	res.json({ status: 'ok' })
})

// POST /api/scrape
// Wywołuje Playwright do pobrania najnowszego dania dnia z fanpage
app.post('/api/scrape', async (req: Request, res: Response) => {
	try {
		const { name, facebookUrl } = req.body

		if (!name || !facebookUrl) {
			return res.status(400).json({
				success: false,
				message: 'Nazwa restauracji oraz facebookUrl są wymagane.'
			})
		}

		const result = await scrapeFacebookPage(name, facebookUrl)
		
		if (!result) {
			return res.json({
				success: false,
				message: 'Nie znaleziono dzisiejszego menu dnia na profilu lokalu (brak pasujących postów).'
			})
		}

		res.json({
			success: true,
			dish: result
		})
	} catch (error: any) {
		console.error('❌ Błąd kontrolera skrapowania:', error)
		res.status(500).json({
			success: false,
			message: error.message || 'Wystąpił wewnętrzny błąd mikrousługi skrapującej.'
		})
	}
})

app.listen(PORT, () => {
	console.log(`🚀 [Scraper Service] Działa na porcie http://localhost:${PORT}`)
})
