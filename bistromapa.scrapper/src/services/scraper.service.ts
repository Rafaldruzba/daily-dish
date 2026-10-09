import { ApifyClient } from 'apify-client'
import { MENU_KEYWORDS } from '../data/words.js'
import { stripDiacritics, warsawDay } from '../lib/text.js'
import { parseMenu, type ParsedMenu } from './menu-parser.service.js'

/** Tyle lokali wchodzi do jednego runu Apify. */
export const MAX_RESTAURANTS_PER_RUN = 25

const ACTOR_ID = process.env.APIFY_ACTOR || 'apify/facebook-posts-scraper'
const POSTS_PER_PAGE = 2
const MAX_POST_AGE_DAYS = 7
const DEBUG = ['1', 'true'].includes(process.env.APIFY_DEBUG ?? '')

const client = new ApifyClient({ token: process.env.APIFY_TOKEN })

type Item = Record<string, any>

/* ---------- typy ---------- */

export interface RestaurantInput {
	id: string
	name: string
	facebookUrl: string
}

export interface PostResult {
	sourcePostId: string
	sourceUrl?: string
	imageUrl?: string
	publishedAt: string // ISO
	menu: ParsedMenu
}

export interface RestaurantResult {
	id: string
	status: 'ok' | 'no_post' | 'not_menu' | 'error'
	message?: string
	post?: PostResult
}

/* ---------- słowa kluczowe ---------- */

const KEYWORDS = MENU_KEYWORDS.map(stripDiacritics)

const hasMenuKeywords = (text: string) => {
	const normalized = stripDiacritics(text)
	return KEYWORDS.some(k => normalized.includes(k))
}

/* ---------- adresy stron ---------- */

export function normalizeFacebookUrl(url: string): string {
	const clean = url.trim()
	let parsed: URL
	try {
		parsed = new URL(clean)
	} catch {
		throw new Error(`Nieprawidłowy adres Facebooka: ${clean}`)
	}
	if (!/^https?:$/.test(parsed.protocol)) throw new Error('Nieobsługiwany protokół URL')
	if (!/(^|\.)facebook\.com$/.test(parsed.hostname)) throw new Error(`To nie jest adres Facebooka: ${clean}`)

	parsed.hostname = 'www.facebook.com'

	// profile.php?id=123 wymaga parametru id, pozostałe parametry usuwamy
	const id = parsed.pathname.includes('profile.php') ? parsed.searchParams.get('id') : null
	parsed.search = id ? `?id=${id}` : ''
	parsed.hash = ''
	return parsed.toString()
}

/** Klucze, po których dopasowujemy posty zwrócone przez aktora do naszych lokali. */
function pageKeys(url: unknown): string[] {
	if (typeof url !== 'string') return []
	try {
		const u = new URL(url)
		const keys = new Set<string>()
		const first = u.pathname.split('/').filter(Boolean)[0]?.toLowerCase()

		if (first && !['people', 'pages', 'p', 'profile.php', 'permalink.php', 'groups'].includes(first)) keys.add(first)

		const id = u.searchParams.get('id')
		if (id) keys.add(id)
		for (const m of u.pathname.matchAll(/\d{8,}/g)) keys.add(m[0])

		return [...keys]
	} catch {
		return []
	}
}

function itemKeys(item: Item): string[] {
	const keys = new Set<string>([...pageKeys(item.facebookUrl), ...pageKeys(item.url)])
	if (item.pageName) keys.add(String(item.pageName).toLowerCase())
	if (item.user?.id) keys.add(String(item.user.id))
	return [...keys]
}

/* ---------- pola z aktora ---------- */

const pickText = (i: Item): string => String(i.text ?? i.post_text ?? i.message ?? '').trim()

const pickUrl = (i: Item): string | undefined => {
	const u = i.postUrl ?? i.post_url ?? i.url
	return typeof u === 'string' && u.startsWith('http') ? u : undefined
}

const pickId = (i: Item): string | undefined => {
	const id = i.postId ?? i.post_id ?? i.id
	return id != null ? String(id) : undefined
}

function pickDate(i: Item): Date | null {
	const raw = i.time ?? i.timestamp ?? i.publishedAt ?? i.created_time ?? i.date
	if (raw == null) return null
	const d = typeof raw === 'number' ? new Date(raw < 1e12 ? raw * 1000 : raw) : new Date(raw)
	return Number.isNaN(d.getTime()) ? null : d
}

/** Jedno zdjęcie posta (pierwsze sensowne). */
function pickImage(i: Item): string | undefined {
	const media: unknown[] = Array.isArray(i.media) ? i.media : []

	for (const m of media) {
		const candidates: unknown[] =
			typeof m === 'string'
				? [m]
				: [
						(m as Item)?.photo_image?.uri,
						(m as Item)?.image?.uri,
						(m as Item)?.url,
						(m as Item)?.uri,
						(m as Item)?.thumbnail,
					]

		for (const c of candidates) if (typeof c === 'string' && c.startsWith('https://')) return c
	}

	const single = i.imageUrl ?? i.image ?? i.thumbnail
	return typeof single === 'string' && single.startsWith('https://') ? single : undefined
}

const isFresh = (d: Date | null) => !d || (Date.now() - d.getTime()) / 864e5 <= MAX_POST_AGE_DAYS

/* ---------- Apify ---------- */

/** Jeden run aktora dla wszystkich podanych stron. */
async function runApify(urls: string[]): Promise<Item[]> {
	const since = warsawDay(new Date(Date.now() - MAX_POST_AGE_DAYS * 864e5))
	const timeoutSecs = 60 + urls.length * 6

	const run = await client
		.actor(ACTOR_ID)
		.call(
			{ startUrls: urls.map(url => ({ url })), resultsLimit: POSTS_PER_PAGE, onlyPostsNewerThan: since },
			{ waitSecs: timeoutSecs, timeout: timeoutSecs },
		)

	if (run.status !== 'SUCCEEDED') throw new Error(`Run Apify ${run.id} zakończył się statusem ${run.status}`)

	const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: urls.length * POSTS_PER_PAGE * 3 })
	console.log(`[Scraper] Run ${run.id}: ${urls.length} stron -> ${items.length} postów`)

	if (DEBUG && items[0]) console.log('[Scraper][DEBUG] Pierwszy element:', JSON.stringify(items[0]).slice(0, 1500))
	return items as Item[]
}

/* ---------- jeden lokal ---------- */

function extractMenu(r: RestaurantInput, items: Item[]): RestaurantResult {
	const posts = items
		.map(item => ({ item, date: pickDate(item), text: pickText(item) }))
		.filter(p => p.text.length >= 10 && isFresh(p.date))
		.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))
		.slice(0, POSTS_PER_PAGE)

	if (posts.length === 0) return { id: r.id, status: 'no_post', message: 'Brak świeżych postów' }

	for (const p of posts) {
		if (!hasMenuKeywords(p.text)) continue

		const menu = parseMenu(p.text, p.date)
		if (!menu.appliesToday || menu.dishes.length === 0) continue

		const imageUrl = pickImage(p.item)
		console.log(`✅ [Scraper] ${r.name}: ${menu.dishes.length} dań | zdjęcie: ${imageUrl ? 'tak' : 'BRAK'}`)

		return {
			id: r.id,
			status: 'ok',
			post: {
				sourcePostId: pickId(p.item) ?? `hash_${stripDiacritics(p.text).length}_${p.date?.getTime() ?? 0}`,
				sourceUrl: pickUrl(p.item),
				imageUrl,
				publishedAt: (p.date ?? new Date()).toISOString(),
				menu,
			},
		}
	}

	console.log(`[Scraper] ${r.name}: brak dzisiejszego menu w ${posts.length} ostatnich postach`)
	return { id: r.id, status: 'not_menu', message: 'Brak dzisiejszego menu dnia w ostatnich postach' }
}

/* ---------- główna funkcja ---------- */

/** Scrapuje do 25 lokali jednym runem Apify. */
export async function scrapeBatch(restaurants: RestaurantInput[]): Promise<RestaurantResult[]> {
	const results = new Map<string, RestaurantResult>()
	const valid: Array<RestaurantInput & { pageUrl: string }> = []

	for (const r of restaurants) {
		try {
			valid.push({ ...r, pageUrl: normalizeFacebookUrl(r.facebookUrl) })
		} catch (e) {
			results.set(r.id, { id: r.id, status: 'error', message: (e as Error).message })
		}
	}

	if (valid.length > 0) {
		try {
			const items = await runApify([...new Set(valid.map(r => r.pageUrl))])

			// posty pogrupowane po kluczach strony
			const byKey = new Map<string, Item[]>()
			for (const item of items) {
				for (const key of itemKeys(item)) {
					if (!byKey.has(key)) byKey.set(key, [])
					byKey.get(key)!.push(item)
				}
			}

			for (const r of valid) {
				const unique = new Map<string, Item>()
				for (const key of pageKeys(r.pageUrl)) {
					for (const item of byKey.get(key) ?? []) {
						unique.set(pickId(item) ?? pickUrl(item) ?? JSON.stringify(item).slice(0, 80), item)
					}
				}
				results.set(r.id, extractMenu(r, [...unique.values()]))
			}
		} catch (e) {
			console.error('❌ [Scraper] Błąd runu Apify:', (e as Error).message)
			for (const r of valid) results.set(r.id, { id: r.id, status: 'error', message: 'Błąd pobierania z Apify' })
		}
	}

	return restaurants.map(r => results.get(r.id) ?? { id: r.id, status: 'error' as const, message: 'Brak wyniku' })
}
