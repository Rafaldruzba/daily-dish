import { stripDiacritics, warsawDay } from '../lib/text.js'

export type DishCategory = 'zupa' | 'przystawka' | 'salatka' | 'danie_glowne' | 'deser' | 'napoj' | 'inne'

export interface ParsedDish {
	name: string
	category: DishCategory
	price?: number
}

export interface ParsedMenu {
	appliesToday: boolean // czy menu dotyczy dzisiejszego dnia
	dishes: ParsedDish[]
	setPrice?: number // cena zestawu, jeśli podana osobno
}

/* ---------- stałe ---------- */

const PRICE_RE = /(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:zł|zl|pln|,-)/i
const NOISE_RE =
	/zapraszamy|serdecznie|godzin|otwarte|tel\.|ul\.|rezerwac|dostaw|życzymy|smacznego|obserwuj|polub|więcej informacji|wyświetl więcej/i
const BULLET_RE = /^\s*(?:[-–—•·*▪►→➡➤✔✅🔸🔹▶]|[\p{Extended_Pictographic}])+\s*/u

const SOUP_RE = /zup|krem |rosół|barszcz|żurek|bulion|chłodnik/i
const SALAD_RE = /sałat|surówk/i

// Etykieta + separator ("Zupa: pomidorowa", "Zupa dnia - pomidorowa"): etykieta mówi o kategorii.
// Dłuższe warianty muszą być przed krótszymi.
const NAME_LABEL_RE = /^\s*(zupa dnia|zupy|zupa|sałatka|deser|przystawka)\s*[:\-–—]\s*/i
const NAME_LABELS: Record<string, { category: DishCategory; prefix?: string; has?: RegExp }> = {
	'zupa dnia': { category: 'zupa', prefix: 'Zupa', has: SOUP_RE },
	zupy: { category: 'zupa', prefix: 'Zupa', has: SOUP_RE },
	zupa: { category: 'zupa', prefix: 'Zupa', has: SOUP_RE },
	sałatka: { category: 'salatka', prefix: 'Sałatka', has: SALAD_RE },
	deser: { category: 'deser' },
	przystawka: { category: 'przystawka' },
}

// Etykiety czysto techniczne – nigdy nie są częścią nazwy dania (separator opcjonalny).
const PURE_LABEL_RE = /^\s*(drugie danie|danie główne|danie dnia|zestaw dnia|zestaw|propozycja)\b\s*[:\-–—]?\s*/i
const MAIN_LABELS = ['drugie danie', 'danie główne', 'danie dnia']

// Linia zaczynająca się od takiego słowa jest kandydatem na danie nawet bez wypunktowania.
const STARTS_WITH_LABEL_RE =
	/^\s*(zupa|zupy|sałatka|deser|przystawka|drugie danie|danie główne|danie dnia|zestaw|propozycja)\b/i

// indeks = dzień tygodnia (0 = niedziela)
const DAY_STEMS = ['niedziel', 'poniedzial', 'wtorek', 'srod', 'czwartek', 'piatek', 'sobot']
const DAY_LINE_RES = DAY_STEMS.map(
	stem => new RegExp(`^(?:(?:menu|oferta|lunch|danie dnia|dzis|dzisiaj)\\s*)?(?:na\\s+|w\\s+)?${stem}\\w*\\b`),
)
const EN_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

/* ---------- dni ---------- */

const weekdayIndex = (d: Date) =>
	EN_DAYS.indexOf(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', weekday: 'long' }).format(d))

const daysBetween = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 864e5)

/** Czy linia to nagłówek dnia ("Piątek 😄", "Menu na czwartek 09.10")? Zwraca indeks dnia albo null. */
function dayOfLine(line: string): number | null {
	if (PRICE_RE.test(line)) return null

	const norm = stripDiacritics(line)
		.replace(/[^a-z0-9\s]/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()

	if (norm.length === 0 || norm.length > 40) return null

	for (let i = 0; i < DAY_LINE_RES.length; i++) if (DAY_LINE_RES[i].test(norm)) return i
	return null
}

/** Dzieli treść posta na sekcje według nagłówków dni. */
function splitByDay(lines: string[]): Map<number, string[]> {
	const sections = new Map<number, string[]>()
	let current: number | null = null

	for (const line of lines) {
		const day = dayOfLine(line)
		if (day !== null) {
			current = day
			if (!sections.has(day)) sections.set(day, [])
			continue
		}
		if (current !== null) sections.get(current)!.push(line)
	}
	return sections
}

/* ---------- dania ---------- */

const validPrice = (p: number): number | undefined => (p > 0 && p < 1000 ? Math.round(p * 100) / 100 : undefined)

function guessCategory(name: string): DishCategory {
	if (SOUP_RE.test(name)) return 'zupa'
	if (SALAD_RE.test(name)) return 'salatka'
	if (/deser|ciast|sernik|lody|szarlotk|naleśnik|tiramisu/i.test(name)) return 'deser'
	if (/kompot|lemoniad|herbat|kaw/i.test(name)) return 'napoj'
	return 'danie_glowne'
}

/** Usuwa etykietę z początku linii i, jeśli ją rozpoznała, zwraca kategorię. */
function stripLabel(text: string): { name: string; category?: DishCategory } {
	const named = text.match(NAME_LABEL_RE)
	if (named) {
		const def = NAME_LABELS[named[1].toLowerCase()]
		const rest = text.slice(named[0].length).trim()
		if (!rest) return { name: '' }

		// "Zupa: pomidorowa" -> "Zupa pomidorowa" (chyba że nazwa sama mówi, że to zupa, np. "Krem dyniowy")
		const name = def.prefix && def.has && !def.has.test(rest) ? `${def.prefix} ${rest}` : rest
		return { name, category: def.category }
	}

	const pure = text.match(PURE_LABEL_RE)
	if (pure) {
		return {
			name: text.slice(pure[0].length).trim(),
			category: MAIN_LABELS.includes(pure[1].toLowerCase()) ? 'danie_glowne' : undefined,
		}
	}

	return { name: text }
}

function extractDishes(lines: string[]): { dishes: ParsedDish[]; setPrice?: number } {
	const dishes: ParsedDish[] = []
	const seen = new Set<string>()
	let setPrice: number | undefined

	for (const rawLine of lines) {
		const line = rawLine.replace(/[\uFE0F\u200D]/g, '').trim()
		if (!line || NOISE_RE.test(line)) continue

		const priceMatch = line.match(PRICE_RE)
		if (!BULLET_RE.test(line) && !STARTS_WITH_LABEL_RE.test(line) && !priceMatch) continue

		const price = priceMatch ? validPrice(parseFloat(priceMatch[1].replace(',', '.'))) : undefined

		const cleaned = line
			.replace(BULLET_RE, '')
			.replace(PRICE_RE, '')
			.replace(/[\p{Extended_Pictographic}]/gu, '')
			.replace(/\s+/g, ' ')
			.replace(/^[\s\-–:]+|[\s\-–:]+$/g, '')
			.trim()

		const { name: rawName, category: labelCategory } = stripLabel(cleaned)
		const name = rawName.replace(/^[\s\-–:]+|[\s\-–:]+$/g, '').trim()

		// linia zawiera tylko cenę (np. "Zestaw 29 zł") -> cena zestawu
		if (name.length < 4) {
			if (price && !setPrice) setPrice = price
			continue
		}

		const key = name.toLowerCase()
		if (seen.has(key)) continue
		seen.add(key)

		dishes.push({ name: name.slice(0, 150), category: labelCategory ?? guessCategory(name), price })
	}

	return { dishes: dishes.slice(0, 25), setPrice }
}

/* ---------- parser ---------- */

export function parseMenu(text: string, publishedAt: Date | null): ParsedMenu {
	const now = new Date()
	const today = warsawDay(now)
	const postDay = publishedAt ? warsawDay(publishedAt) : null
	const lines = text.split('\n')
	const sections = splitByDay(lines)

	// Post bez nagłówków dni: ufamy dacie publikacji.
	if (sections.size === 0) {
		const appliesToday = postDay ? postDay === today : true
		return appliesToday ? { appliesToday, ...extractDishes(lines) } : { appliesToday, dishes: [] }
	}

	// Post z nagłówkami dni: bierzemy tylko sekcję z dzisiejszego dnia tygodnia.
	const todayLines = sections.get(weekdayIndex(now))
	const maxAgeDays = sections.size > 1 ? 7 : 1 // menu tygodniowe żyje dłużej niż jednodniowe
	const age = postDay ? daysBetween(postDay, today) : 0
	const appliesToday = Boolean(todayLines) && age >= 0 && age <= maxAgeDays

	return appliesToday ? { appliesToday, ...extractDishes(todayLines!) } : { appliesToday, dishes: [] }
}
