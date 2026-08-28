import { chromium } from 'playwright'

export interface ScrapeResult {
	name: string
	description?: string
	price?: number
	imageUrl?: string
	sourceUrl?: string
	sourcePostId?: string
	publishedAt?: Date
}

/**
 * Konwertuje link na lżejszą, mobilną wersję Facebooka m.facebook.com
 */
function getMobileUrl(url: string): string {
	let cleanUrl = url.trim()
	if (cleanUrl.includes('www.facebook.com')) {
		return cleanUrl.replace('www.facebook.com', 'm.facebook.com')
	}
	if (!cleanUrl.includes('m.facebook.com') && cleanUrl.includes('facebook.com')) {
		return cleanUrl.replace('facebook.com', 'm.facebook.com')
	}
	return cleanUrl
}

/**
 * Główna funkcja skrapująca fanpage restauracji za pomocą Playwright
 */
export async function scrapeFacebookPage(
	restaurantName: string,
	facebookUrl: string
): Promise<ScrapeResult | null> {
	console.log(`🔎 [Playwright Scraper] Rozpoczynam skrapowanie dla: ${restaurantName} (URL: ${facebookUrl})`)

	const mobileUrl = getMobileUrl(facebookUrl)
	const browser = await chromium.launch({
		headless: true,
		args: [
			'--no-sandbox',
			'--disable-setuid-sandbox',
			'--disable-gl-drawing-for-tests',
			'--disable-gpu',
		],
	})

	try {
		const context = await browser.newContext({
			userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 3,
			isMobile: true,
			hasTouch: true,
		})

		const page = await context.newPage()

		// Agresywna optymalizacja: blokujemy ciężkie zasoby i skrypty reklamowe
		await page.route('**/*', route => {
			const type = route.request().resourceType()
			if (['image', 'stylesheet', 'font', 'media', 'websocket'].includes(type)) {
				route.abort()
			} else {
				route.continue()
			}
		})

		// Udajemy się na mobilną wersję profilu
		await page.goto(mobileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

		// Próbujemy zamknąć ewentualne banery cookie lub logowania, jeśli się pojawią
		try {
			const closeCookieBtn = page.locator('button:has-text("Zgadzam się"), button:has-text("Zaakceptuj"), button:has-text("OK")').first()
			if (await closeCookieBtn.isVisible()) {
				await closeCookieBtn.click()
			}
		} catch (e) {
			// Ignorujemy błędy zamknięcia banera cookies
		}

		// Delikatne przewinięcie, aby załadować pierwsze posty
		await page.evaluate(() => window.scrollBy(0, 400))
		await page.waitForTimeout(1500)

		// Pobieramy teksty postów
		// Na m.facebook.com posty są najczęściej umieszczane w tagach article lub div[data-story-key]
		const postsLocator = page.locator('article, div[data-story-key], div._5rgt, div._5pat').first()
		if (await postsLocator.count() === 0) {
			console.warn(`⚠️ [Playwright Scraper] Nie znaleziono kontenerów postów na stronie dla: ${restaurantName}`)
			await browser.close()
			return null
		}

		// Pobieramy pierwszy post i wyciągamy z niego tekst
		// Na wersji mobilnej treść posta jest najczęściej w kontenerze z klasą _5rgt lub _5g-3
		const postElement = postsLocator.first()
		const postText = await postElement.innerText()

		if (!postText || postText.trim().length < 5) {
			console.warn(`⚠️ [Playwright Scraper] Pusty lub zbyt krótki tekst posta dla: ${restaurantName}`)
			await browser.close()
			return null
		}

		console.log(`🤖 [Playwright Scraper] Wykryto treść najnowszego posta:\n"${postText.substring(0, 100)}..."`)

		// Sprawdzamy czy post zawiera wymagane słowa kluczowe (np. "Danie dnia!", "Dziś polecamy")
		const lowerText = postText.toLowerCase()
		const hasKeywords = ['danie dnia', 'lunch', 'zestaw', 'menu', 'dzisiaj', 'dziś', 'dzis', 'polecamy', 'obiad'].some(keyword => lowerText.includes(keyword))

		if (!hasKeywords) {
			console.log(`ℹ️ [Playwright Scraper] Post nie zawiera słów kluczowych dania dnia. Pomijam.`)
			await browser.close()
			return null
		}

		// Wyciągamy ID posta z linków lub atrybutów jeśli są dostępne
		let postId = `post_${Date.now()}`
		try {
			const storyKey = await postElement.getAttribute('data-story-key')
			if (storyKey) postId = storyKey
		} catch (e) {
			// Ignorujemy błędy pobierania ID
		}

		// Pobieramy obrazek (jeśli jest dostępny)
		let imageUrl: string | undefined = undefined
		try {
			// Szukamy tagu img wewnątrz elementu posta
			const imgLocator = postElement.locator('img').first()
			if (await imgLocator.count() > 0) {
				const src = await imgLocator.getAttribute('src')
				if (src && src.startsWith('http')) imageUrl = src
			}
		} catch (e) {
			// Ignorujemy błędy obrazka
		}

		await browser.close()

		return {
			name: postText.substring(0, 80).replace(/\n/g, ' ') + '...', // Nazwa jako fragment posta
			description: postText,
			imageUrl,
			sourceUrl: facebookUrl,
			sourcePostId: postId,
			publishedAt: new Date()
		}

	} catch (err: any) {
		console.error(`❌ [Playwright Scraper] Wyjątek podczas skrapowania ${restaurantName}:`, err.message || err)
		await browser.close()
		return null
	}
}
