import { describe, it } from 'node:test'
import assert from 'node:assert'
import { normalizeFacebookUrl, scrapeBatch } from '../src/services/scraper.service.js'
import { parseMenu } from '../src/services/menu-parser.service.js'

/* ---------- pomocnicze: dni tygodnia liczone z dzisiejszej daty ---------- */

const DAYS_PL = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota']
const DAYS_EN = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const todayIdx = DAYS_EN.indexOf(
	new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Warsaw', weekday: 'long' }).format(new Date()),
)
const TODAY = DAYS_PL[todayIdx]
const TOMORROW = DAYS_PL[(todayIdx + 1) % 7]

const daysAgo = (n: number) => new Date(Date.now() - n * 864e5)
const names = (text: string, publishedAt: Date | null = new Date()) =>
	parseMenu(text, publishedAt).dishes.map(d => d.name)

/* ---------- normalizeFacebookUrl ---------- */

describe('normalizeFacebookUrl', () => {
	it('zamienia facebook.com na www.facebook.com', () => {
		assert.strictEqual(normalizeFacebookUrl('https://facebook.com/page'), 'https://www.facebook.com/page')
	})

	it('zamienia m.facebook.com na www.facebook.com', () => {
		assert.strictEqual(normalizeFacebookUrl('https://m.facebook.com/page'), 'https://www.facebook.com/page')
	})

	it('trimuje spacje', () => {
		assert.strictEqual(normalizeFacebookUrl('  https://facebook.com/page  '), 'https://www.facebook.com/page')
	})

	it('usuwa parametry śledzące', () => {
		assert.strictEqual(
			normalizeFacebookUrl('https://www.facebook.com/page?ref=abc&fbclid=x'),
			'https://www.facebook.com/page',
		)
	})

	it('zachowuje id w profile.php', () => {
		assert.strictEqual(
			normalizeFacebookUrl('https://www.facebook.com/profile.php?id=100063561281726&ref=x'),
			'https://www.facebook.com/profile.php?id=100063561281726',
		)
	})

	it('rzuca błąd dla pustego i nieprawidłowego adresu', () => {
		assert.throws(() => normalizeFacebookUrl(''))
		assert.throws(() => normalizeFacebookUrl('to nie jest url'))
	})

	it('rzuca błąd dla innej domeny i innego protokołu', () => {
		assert.throws(() => normalizeFacebookUrl('https://example.com/page'))
		assert.throws(() => normalizeFacebookUrl('https://facebook.com.evil.com/page'))
		assert.throws(() => normalizeFacebookUrl('ftp://facebook.com/page'))
	})
})

/* ---------- parseMenu ---------- */

describe('parseMenu', () => {
	it('wyciąga dania z posta z nagłówkiem dzisiejszego dnia', () => {
		const text = `${TODAY} 😄\n\n➡️Krem dyniowy z grzankami\n➡️Kotlet schabowy / ziemniaki / mizeria\n\nSerdecznie zapraszamy.`
		const menu = parseMenu(text, new Date())

		assert.strictEqual(menu.appliesToday, true)
		assert.deepStrictEqual(
			menu.dishes.map(d => d.name),
			['Krem dyniowy z grzankami', 'Kotlet schabowy / ziemniaki / mizeria'],
		)
	})

	it('rozpoznaje kategorię zupy', () => {
		const menu = parseMenu(`${TODAY}\n➡️Krem dyniowy z grzankami\n➡️Kotlet schabowy`, new Date())
		assert.strictEqual(menu.dishes[0].category, 'zupa')
		assert.strictEqual(menu.dishes[1].category, 'danie_glowne')
	})

	it('pomija szum ("Serdecznie zapraszamy", godziny)', () => {
		const text = `${TODAY}\n➡️Pierogi ruskie\nSerdecznie zapraszamy!\n➡️Czynne w godzinach 12-18`
		assert.deepStrictEqual(names(text), ['Pierogi ruskie'])
	})

	it('wyciąga cenę dania', () => {
		const menu = parseMenu(`${TODAY}\n➡️Pierogi ruskie 22 zł`, new Date())
		assert.strictEqual(menu.dishes[0].name, 'Pierogi ruskie')
		assert.strictEqual(menu.dishes[0].price, 22)
	})

	it('wyciąga cenę zestawu z osobnej linii', () => {
		const menu = parseMenu(`${TODAY}\n➡️Pierogi ruskie\nZestaw 29 zł`, new Date())
		assert.strictEqual(menu.setPrice, 29)
		assert.deepStrictEqual(
			menu.dishes.map(d => d.name),
			['Pierogi ruskie'],
		)
	})

	it('odrzuca menu, które jest na inny dzień niż dzisiejszy', () => {
		const menu = parseMenu(`${TOMORROW}\n➡️Gulasz wieprzowy`, new Date())
		assert.strictEqual(menu.appliesToday, false)
		assert.deepStrictEqual(menu.dishes, [])
	})

	it('z menu tygodniowego bierze tylko dzisiejszy dzień', () => {
		const text = DAYS_PL.map((day, i) => `${day}\n➡️Gulasz numer ${i}`).join('\n\n')
		assert.deepStrictEqual(names(text), [`Gulasz numer ${todayIdx}`])
	})

	it('post bez nagłówków: świeży przechodzi', () => {
		const menu = parseMenu('➡️Pierogi ruskie\n➡️Barszcz czerwony', new Date())
		assert.strictEqual(menu.appliesToday, true)
		assert.strictEqual(menu.dishes.length, 2)
	})

	it('post bez nagłówków: sprzed kilku dni jest odrzucany', () => {
		const menu = parseMenu('➡️Pierogi ruskie\n➡️Barszcz czerwony', daysAgo(3))
		assert.strictEqual(menu.appliesToday, false)
		assert.deepStrictEqual(menu.dishes, [])
	})

	it('post bez nagłówków i bez daty: nie odrzuca', () => {
		assert.strictEqual(parseMenu('➡️Pierogi ruskie', null).appliesToday, true)
	})

	it('nie zwraca duplikatów', () => {
		assert.deepStrictEqual(names(`${TODAY}\n➡️Pierogi ruskie\n➡️Pierogi ruskie`), ['Pierogi ruskie'])
	})

	it('post bez dań zwraca pustą listę', () => {
		assert.deepStrictEqual(names('Dziękujemy za wspaniały weekend, do zobaczenia!'), [])
	})
})

/* ---------- scrapeBatch (bez połączenia z Apify) ---------- */

describe('scrapeBatch', () => {
	it('dla pustej listy zwraca pustą tablicę', async () => {
		assert.deepStrictEqual(await scrapeBatch([]), [])
	})

	it('zwraca błąd dla nieprawidłowych adresów i zachowuje kolejność', async () => {
		const results = await scrapeBatch([
			{ id: 'a', name: 'Pusty', facebookUrl: '' },
			{ id: 'b', name: 'Inna domena', facebookUrl: 'https://example.com/page' },
		])

		assert.deepStrictEqual(
			results.map(r => [r.id, r.status]),
			[
				['a', 'error'],
				['b', 'error'],
			],
		)
	})
})

/* ---------- parseMenu: etykiety ("Zupa", "Deser" itd.) ---------- */

describe('parseMenu: etykiety', () => {
	const first = (text: string) => parseMenu(text, new Date()).dishes[0]

	it('"Zupa pomidorowa" bez dwukropka zostaje w całości', () => {
		const dish = first(`${TODAY}\n➡️Zupa pomidorowa`)
		assert.strictEqual(dish.name, 'Zupa pomidorowa')
		assert.strictEqual(dish.category, 'zupa')
	})

	it('linia z samym słowem "Zupa ..." działa też bez wypunktowania', () => {
		const dish = first(`${TODAY}\nZupa pomidorowa`)
		assert.strictEqual(dish.name, 'Zupa pomidorowa')
		assert.strictEqual(dish.category, 'zupa')
	})

	it('"Zupa: pomidorowa" daje "Zupa pomidorowa"', () => {
		const dish = first(`${TODAY}\n➡️Zupa: pomidorowa`)
		assert.strictEqual(dish.name, 'Zupa pomidorowa')
		assert.strictEqual(dish.category, 'zupa')
	})

	it('"Zupa dnia - pomidorowa" daje "Zupa pomidorowa"', () => {
		const dish = first(`${TODAY}\n➡️Zupa dnia - pomidorowa`)
		assert.strictEqual(dish.name, 'Zupa pomidorowa')
		assert.strictEqual(dish.category, 'zupa')
	})

	it('"Zupa dnia: Krem dyniowy" nie dubluje słowa zupa', () => {
		const dish = first(`${TODAY}\n➡️Zupa dnia: Krem dyniowy`)
		assert.strictEqual(dish.name, 'Krem dyniowy')
		assert.strictEqual(dish.category, 'zupa')
	})

	it('"Drugie danie: kotlet" wycina etykietę i ustawia danie główne', () => {
		const dish = first(`${TODAY}\n➡️Drugie danie: kotlet schabowy`)
		assert.strictEqual(dish.name, 'kotlet schabowy')
		assert.strictEqual(dish.category, 'danie_glowne')
	})

	it('"Sałatka grecka" bez dwukropka zostaje w całości', () => {
		const dish = first(`${TODAY}\n➡️Sałatka grecka`)
		assert.strictEqual(dish.name, 'Sałatka grecka')
		assert.strictEqual(dish.category, 'salatka')
	})

	it('"Deser: sernik" ustawia kategorię deser', () => {
		const dish = first(`${TODAY}\n➡️Deser: sernik z malinami`)
		assert.strictEqual(dish.name, 'sernik z malinami')
		assert.strictEqual(dish.category, 'deser')
	})

	it('pełne menu z etykietami i ceną zestawu', () => {
		const text = [TODAY, 'Zupa: pomidorowa', 'Drugie danie: kotlet schabowy', 'Zestaw 29 zł'].join('\n')
		const menu = parseMenu(text, new Date())

		assert.deepStrictEqual(
			menu.dishes.map(d => d.name),
			['Zupa pomidorowa', 'kotlet schabowy'],
		)
		assert.strictEqual(menu.setPrice, 29)
	})
})
