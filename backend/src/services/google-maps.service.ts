import axios from 'axios'
import prisma from '../lib/prisma.js'
import logger from './logger.service.js'

/**
 * Szuka i pobiera szczegóły restauracji z Google Places API (rating, user_ratings_total, place_id).
 */
export async function fetchGooglePlaceDetails(
	name: string,
	address: string | null,
	city: string
): Promise<{ googlePlaceId: string; rating: number; userRatingsTotal: number } | null> {
	const apiKey = process.env.GOOGLE_MAPS_API_KEY
	if (!apiKey) {
		console.warn('⚠️ Brak klucza GOOGLE_MAPS_API_KEY w środowisku. Google Places API wyłączone.')
		return null
	}

	try {
		// KROK 1: Find Place (szukanie place_id na podstawie nazwy, adresu i miasta)
		const query = `${name}, ${address || ''} ${city}`.trim()
		const findPlaceUrl = 'https://maps.googleapis.com/maps/api/place/findplacefromtext/json'
		
		const findRes = await axios.get(findPlaceUrl, {
			params: {
				input: query,
				inputtype: 'textquery',
				fields: 'place_id',
				key: apiKey,
			},
		})

		const candidates = findRes.data?.candidates
		if (!candidates || candidates.length === 0) {
			await logger.warn(`[Google Places] Nie znaleziono lokalu dla zapytania: "${query}"`)
			return null
		}

		const placeId = candidates[0].place_id

		// KROK 2: Place Details (pobranie ratingu i liczby opinii)
		const detailsUrl = 'https://maps.googleapis.com/maps/api/place/details/json'
		const detailsRes = await axios.get(detailsUrl, {
			params: {
				place_id: placeId,
				fields: 'rating,user_ratings_total',
				key: apiKey,
				language: 'pl',
			},
		})

		const result = detailsRes.data?.result
		if (!result) {
			await logger.warn(`[Google Places] Brak szczegółów dla place_id: "${placeId}"`)
			return null
		}

		return {
			googlePlaceId: placeId,
			rating: result.rating || 0,
			userRatingsTotal: result.user_ratings_total || 0,
		}
	} catch (error: any) {
		await logger.error(`[Google Places] Błąd pobierania danych dla lokalu "${name}":`, error.message || error)
		return null
	}
}

/**
 * Cyklicznie aktualizuje oceny ze wszystkich aktywnych lokali (np. raz w tygodniu).
 */
export async function syncAllRestaurantsGoogleDetails(): Promise<void> {
	await logger.info('🔄 [Google Places] Rozpoczynam synchronizację ocen z Google Maps...')

	try {
		const restaurants = await prisma.restaurant.findMany({
			where: {
				isActive: true,
				status: { in: ['APPROVED', 'ACTIVE'] },
			},
		})

		if (restaurants.length === 0) {
			await logger.info('ℹ️ [Google Places] Brak aktywnych restauracji do synchronizacji.')
			return
		}

		let count = 0
		for (const r of restaurants) {
			const details = await fetchGooglePlaceDetails(r.name, r.address, r.city)
			if (details) {
				await prisma.restaurant.update({
					where: { id: r.id },
					data: {
						googlePlaceId: details.googlePlaceId,
						rating: details.rating,
						userRatingsTotal: details.userRatingsTotal,
					},
				})
				count++
			}
			// Odstęp między zapytaniami, aby uniknąć rate-limitów i przegrzania API
			await new Promise(resolve => setTimeout(resolve, 500))
		}

		await logger.info(`✅ [Google Places] Synchronizacja zakończona. Zaktualizowano ${count}/${restaurants.length} restauracji.`)
	} catch (error: any) {
		await logger.error('[Google Places] Globalny błąd synchronizacji:', error.message || error)
	}
}
