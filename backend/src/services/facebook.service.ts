import axios from 'axios'
import logger from './logger.service.js'

export interface FacebookDishResult {
	name: string
	description?: string
	price?: number
	imageUrl?: string
	sourceUrl?: string
	sourcePostId?: string
	publishedAt?: Date
}

const SCRAPPER_URL = process.env.SCRAPPER_URL || 'http://localhost:3001'

/**
 * Deleguje zadanie pobrania menu dnia dla restauracji do zewnętrznego microserwisu skrapującego.
 */
export async function fetchRestaurantDish(restaurant: {
	id: string
	name: string
	facebookUrl: string | null
}): Promise<FacebookDishResult | null> {
	if (!restaurant.facebookUrl) {
		console.log(`⚠️ ${restaurant.name}: brak adresu Facebook`)
		return null
	}

	console.log(`🔎 [Main Backend] Delegowanie skrapowania dla: ${restaurant.name} do mikrousługi scrapper...`)

	try {
		const response = await axios.post(`${SCRAPPER_URL}/api/scrape`, {
			name: restaurant.name,
			facebookUrl: restaurant.facebookUrl,
		}, { timeout: 45000 }) // 45 sekund timeoutu ze względu na czas uruchamiania przeglądarki

		if (response.data && response.data.success) {
			const { dish } = response.data
			await logger.info(`Pomyślnie pobrano i zapisano danie dnia dla ${restaurant.name} z mikrousługi scrapper.`)
			return {
				name: dish.name,
				description: dish.description,
				imageUrl: dish.imageUrl,
				sourceUrl: dish.sourceUrl,
				sourcePostId: dish.sourcePostId,
				publishedAt: dish.publishedAt ? new Date(dish.publishedAt) : new Date(),
			}
		} else {
			console.warn(`⚠️ Mikrousługa scrapper nie znalazła dań dla ${restaurant.name}: ${response.data.message || 'Brak dopasowania'}`)
			return null
		}
	} catch (error: any) {
		await logger.error(`Błąd delegacji skrapowania dla ${restaurant.name} do mikrousługi:`, error.message || error)
		return null
	}
}
