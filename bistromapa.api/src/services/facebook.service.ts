import axios from 'axios'
import logger from './logger.service.js'

const SCRAPPER_URL = process.env.SCRAPPER_URL || 'http://localhost:3001'

export interface ScrapedDish {
	name: string
	category: 'zupa' | 'przystawka' | 'salatka' | 'danie_glowne' | 'deser' | 'napoj' | 'inne'
	price?: number
}

export interface ScrapeInput {
	id: string
	name: string
	facebookUrl: string
}

export interface ScrapeOutput {
	id: string
	status: 'ok' | 'no_post' | 'not_menu' | 'error'
	message?: string
	post?: {
		sourcePostId: string
		sourceUrl?: string
		imageUrl?: string
		publishedAt: string
		menu: { dishes: ScrapedDish[]; setPrice?: number }
	}
}

/**
 * Wysyła do scrapera paczkę lokali (max 25 = jeden run Apify).
 * Przy błędzie sieci zwraca status "error" dla każdego lokalu zamiast rzucać wyjątek.
 */
export async function fetchRestaurantMenus(restaurants: ScrapeInput[]): Promise<ScrapeOutput[]> {
	if (restaurants.length === 0) return []

	try {
		const { data } = await axios.post(`${SCRAPPER_URL}/api/scrape-batch`, { restaurants }, { timeout: 4 * 60_000 })
		return data.results as ScrapeOutput[]
	} catch (error: any) {
		await logger.error('Błąd wywołania scrapera:', error.message || error)
		return restaurants.map(r => ({ id: r.id, status: 'error' as const, message: 'Scraper niedostępny' }))
	}
}
