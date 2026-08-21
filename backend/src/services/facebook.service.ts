import { ApifyClient } from 'apify-client'
import { GREETING_PATTERNS } from '../data/words.js'

const client = new ApifyClient({
	token: process.env.APIFY_API_TOKEN,
})

export interface FacebookDishResult {
	name: string
	description?: string
	price?: number
	imageUrl?: string
	sourceUrl?: string
	sourcePostId?: string
	publishedAt?: Date
}

const DISH_KEYWORDS = [
	'danie dnia',
	'lunch',
	'zestaw',
	'menu',
	'dzisiaj',
	'dziś',
	'dzis',
	'polecamy',
	'zupa',
	'drugie danie',
	'dzień dobry',
	'poniedziałek',
	'wtorek',
	'środa',
	'czwartek',
	'piątek',
	'sobota',
	'niedziela',
	'obiad',
	'propozycja',
]

// Zwroty, które należy zignorować przy ustalaniu NAZWY dania
// const GREETING_PATTERNS = ['dzień dobry', 'witajcie', 'cześć', 'hej', 'witam', 'smacznego', 'zapraszamy', 'Danie dnia', 'Danie dnia!', 'Polecamy', 'Dziś polecamy', 'Dzisiaj polecamy']

export async function fetchRestaurantDish(restaurant: {
	id: string
	name: string
	facebookUrl: string | null
}): Promise<FacebookDishResult | null> {
	if (!restaurant.facebookUrl) {
		console.log(`⚠️ ${restaurant.name}: brak adresu Facebook`)
		return null
	}

	console.log(`🔎 Sprawdzam Facebook restauracji: ${restaurant.name}`)

	try {
		const run = await client.actor('apify/facebook-posts-scraper').call({
			startUrls: [{ url: restaurant.facebookUrl }],
			resultsLimit: 5,
		})

		const { items } = await client.dataset(run.defaultDatasetId).listItems()

		if (!items || items.length === 0) {
			console.log(`❌ Nie znaleziono postów dla: ${restaurant.name}`)
			return null
		}

		const todayStr = new Date().toLocaleDateString('sv-SE')

		// 1. Szukamy posta z dzisiaj ze słowami kluczowymi
		let todayPost = items.find((post: any) => {
			const rawText = (post.text || post.message || post.postText || '').toLowerCase()
			const postDateRaw = post.time || post.timestamp || post.date
			const postDateStr = postDateRaw ? new Date(postDateRaw).toLocaleDateString('sv-SE') : null

			return postDateStr === todayStr && DISH_KEYWORDS.some(keyword => rawText.includes(keyword))
		}) as Record<string, any> | undefined

		// 2. Fallback: jakikolwiek dzisiejszy post
		if (!todayPost) {
			todayPost = items.find((post: any) => {
				const postDateRaw = post.time || post.timestamp || post.date
				const postDateStr = postDateRaw ? new Date(postDateRaw).toLocaleDateString('sv-SE') : null
				return postDateStr === todayStr
			}) as Record<string, any> | undefined
		}

		if (!todayPost) {
			console.log(`ℹ️ Brak dzisiejszego posta dla: ${restaurant.name}`)
			return null
		}

		const postText: string = todayPost.text || todayPost.message || todayPost.postText || ''
		const textLines = postText
			.split('\n')
			.map(line => line.trim())
			.filter(line => line.length > 0)

		// Odcedzamy nagłówki/powitania (np. "Dzień dobry! 😊"), aby nie stały się nazwą dania
		const dishLines = textLines.filter(line => {
			const lowerLine = line.toLowerCase()
			const isGreeting = GREETING_PATTERNS.some(g => lowerLine.startsWith(g) && lowerLine.length < 35)
			return !isGreeting
		})

		// Nazwa to pierwsza linia PO powitaniu (lub pierwsza linia posta, jeśli filtr usunąłby wszystko)
		const parsedName = (dishLines[0] || textLines[0] || 'Danie Dnia').substring(0, 255)

		// Opis to wszystkie pozostałe linie
		const remainingLines = textLines.filter(line => line !== parsedName)
		const parsedDescription = remainingLines.length > 0 ? remainingLines.join('\n') : undefined

		// Szukanie ceny (np. "35 zł", "35PLN", "35,00 zł")
		const priceMatch = postText.match(/(\d+[\.,]?\d*)\s*(zł|zl|pln)/i)
		const parsedPrice = priceMatch ? parseFloat(priceMatch[1].replace(',', '.')) : undefined

		const rawImageUrl =
			todayPost.mediaUrl ||
			todayPost.imageUrl ||
			(Array.isArray(todayPost.images) && todayPost.images[0]) ||
			(Array.isArray(todayPost.media) && todayPost.media[0]?.url) ||
			(Array.isArray(todayPost.media) && todayPost.media[0]?.photoUrl) ||
			(Array.isArray(todayPost.attachedMedia) && todayPost.attachedMedia[0]?.photoUrl) ||
			(Array.isArray(todayPost.attachments) && todayPost.attachments[0]?.media?.image?.src) ||
			undefined

		// Walidacja: odrzucamy linki będące podstronami HTML Facebooka (np. /photo/, /permalink), które przeglądarka blokuje polityką CORS (ERR_BLOCKED_BY_RESPONSE)
		// Dopuszczamy wyłącznie bezpośrednie adresy CDN do plików graficznych (np. fbcdn.net, scontent)
		const imageUrl = (rawImageUrl && typeof rawImageUrl === 'string' && !rawImageUrl.includes('facebook.com/') && !rawImageUrl.includes('/photo') && !rawImageUrl.includes('/permalink'))
			? rawImageUrl
			: undefined

		return {
			name: parsedName,
			description: parsedDescription,
			price: parsedPrice,
			imageUrl: imageUrl,
			sourceUrl: todayPost.url || restaurant.facebookUrl,
			sourcePostId: todayPost.id || todayPost.postId || undefined,
			publishedAt: todayPost.time ? new Date(todayPost.time) : new Date(),
		}
	} catch (error) {
		console.error(`❌ Błąd podczas skrapowania ${restaurant.name}:`, error)
		return null
	}
}
