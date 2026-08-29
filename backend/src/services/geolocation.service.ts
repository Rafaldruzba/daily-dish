import axios from 'axios'
import redisClient from '../lib/redis.js'
import logger from './logger.service.js'

interface NominatimResult {
	lat: string
	lon: string
	display_name: string
}

interface GoogleGeocodeResult {
	results: Array<{
		geometry: {
			location: {
				lat: number
				lng: number
			}
		}
	}>
	status: string
}

/**
 * Geocodes an address or city, using Redis caching, Google Geocoding API (if key available),
 * or falls back to Nominatim (OpenStreetMap).
 */
export async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
	const cacheKey = `geo:cache:${city.toLowerCase().trim()}`
	const startTime = performance.now()

	// 1. Try reading from Redis cache first
	if (redisClient.isOpen) {
		try {
			const cached = await redisClient.get(cacheKey)
			if (cached) {
				const coords = JSON.parse(cached)
				const duration = (performance.now() - startTime).toFixed(2)
				console.log(`⚡ [Geo Cache] Hit dla "${city}": lat=${coords.lat}, lon=${coords.lon} (Czas: ${duration}ms)`)
				return coords
			}
		} catch (err) {
			console.error('❌ Geocoding cache read error:', err)
		}
	}

	let coords: { lat: number; lon: number } | null = null
	let provider = 'Nominatim'

	try {
		const googleApiKey = process.env.GOOGLE_MAPS_API_KEY

		if (googleApiKey) {
			provider = 'Google Geocoding'
			// Use Google Geocoding API
			const response = await axios.get<GoogleGeocodeResult>('https://maps.googleapis.com/maps/api/geocode/json', {
				params: {
					address: city,
					key: googleApiKey,
				},
			})

			if (response.data && response.data.status === 'OK' && response.data.results.length > 0) {
				const { lat, lng } = response.data.results[0].geometry.location
				coords = { lat, lon: lng }
			} else {
				console.warn(`⚠️ Google Geocoding status dla "${city}": ${response.data.status}`)
			}
		} else {
			// Fallback to OSM Nominatim
			const response = await axios.get<NominatimResult[]>('https://nominatim.openstreetmap.org/search', {
				params: {
					q: city,
					format: 'json',
					limit: 1,
					email: 'app.bistromapa@gmail.com', // policy contact email
				},
				headers: {
					'User-Agent': 'DailyDishLocatorAppSystemLodzGastronomy/2.0 (contact: app.bistromapa@gmail.com)',
				},
			})

			if (response.data && response.data.length > 0) {
				const { lat, lon } = response.data[0]
				coords = { lat: parseFloat(lat), lon: parseFloat(lon) }
			}
		}

		// Validate coordinates to ensure correctness (Poland or general coordinate sanity checks)
		if (coords && !isNaN(coords.lat) && !isNaN(coords.lon)) {
			// Save to cache for 7 days
			if (redisClient.isOpen) {
				try {
					await redisClient.set(cacheKey, JSON.stringify(coords), { EX: 7 * 24 * 3600 })
				} catch (err) {
					console.error('❌ Geocoding cache write error:', err)
				}
			}

			const duration = (performance.now() - startTime).toFixed(2)
			// await logger.info(`Udana geolokalizacja "${city}" za pomocą ${provider}. Lat: ${coords.lat}, Lon: ${coords.lon} (Czas: ${duration}ms)`)
			return coords
		}

		await logger.warn(`Nie udało się znaleźć koordynatów dla adresu: "${city}" przy użyciu ${provider}`)
		return null
	} catch (error: any) {
		const duration = (performance.now() - startTime).toFixed(2)
		await logger.error(
			`Błąd geolokalizacji dla "${city}" przy użyciu ${provider} (Czas: ${duration}ms)`,
			error.message || error,
		)
		return null
	}
}
