import type { NextFunction, Request, Response } from 'express'

import { test, assert, section } from './harness'

import { slugify } from '../src/lib/slug.js'
import { isValidNip } from '../src/lib/helper/isValidNip.js'
import { buildAllowedOrigins, isOriginAllowed } from '../src/lib/cors.js'
import { requireServiceToken } from '../src/middleware/service-token.js'
import { requireAdmin } from '../src/middleware/auth.js'

// ────────────────────────────────────────────────────────────────────────────
section('Slug (lib/slug)')

test('slugify — sprowadza do małych liter', () => {
	assert.equal(slugify('Warszawa'), 'warszawa')
})

test('slugify — zamienia spacje na myślniki', () => {
	assert.equal(slugify('Kuchnia włoska'), 'kuchnia-wloska')
})

test('slugify — usuwa polskie znaki diakrytyczne', () => {
	assert.equal(slugify('Łódź'), 'lodz')
	assert.equal(slugify('Zażółć gęślą jaźń'), 'zazolc-gesla-jazn')
})

test('slugify — przycina białe znaki', () => {
	assert.equal(slugify('  Piaseczno  '), 'piaseczno')
})

test('slugify — wiele spacji daje jeden myślnik', () => {
	assert.equal(slugify('Pizza    Roma'), 'pizza-roma')
})

test('slugify — usuwa znaki specjalne', () => {
	assert.equal(slugify('Hello!@#$World'), 'helloworld')
})

test('slugify — nie zostawia myślników na brzegach', () => {
	assert.equal(slugify('-abc-'), 'abc')
})

test('slugify — nie zostawia podwójnych myślników', () => {
	assert.equal(slugify('a--b'), 'a-b')
})

test('slugify — pusty tekst daje pusty slug', () => {
	assert.equal(slugify(''), '')
})

// ────────────────────────────────────────────────────────────────────────────
section('Walidacja NIP (lib/helper/isValidNip)')

test('isValidNip — akceptuje NIP z poprawną sumą kontrolną', () => {
	assert.equal(isValidNip('1234563218'), true)
})

test('isValidNip — ignoruje myślniki i spacje', () => {
	assert.equal(isValidNip('123-456-32-18'), true)
	assert.equal(isValidNip('123 456 32 18'), true)
})

test('isValidNip — odrzuca błędną cyfrę kontrolną', () => {
	assert.equal(isValidNip('1234563219'), false)
})

test('isValidNip — odrzuca złą długość', () => {
	assert.equal(isValidNip('123456789'), false)
	assert.equal(isValidNip('12345678901'), false)
})

test('isValidNip — odrzuca znaki inne niż cyfry', () => {
	assert.equal(isValidNip('abcdefghij'), false)
})

test('isValidNip — odrzuca pustą wartość', () => {
	assert.equal(isValidNip(''), false)
})

test('isValidNip — odrzuca NIP, gdy suma mod 11 wynosi 10', () => {
	// Wagi dają 5*2 = 10, a 10 % 11 === 10 — algorytm mówi, że taki NIP nie istnieje
	assert.equal(isValidNip('0200000000'), false)
})

// ────────────────────────────────────────────────────────────────────────────
section('CORS (lib/cors)')

test('CORS: dopuszcza własną domenę', () => {
	assert.equal(isOriginAllowed('https://bistromapa.app'), true)
})

test('CORS: dopuszcza subdomeny własnej domeny', () => {
	assert.equal(isOriginAllowed('https://www.bistromapa.app'), true)
	assert.equal(isOriginAllowed('https://console.bistromapa.app'), true)
	assert.equal(isOriginAllowed('https://staging.bistromapa.app'), true)
	assert.equal(isOriginAllowed('https://api.bistromapa.app'), true)
})

test('CORS: dopuszcza localhost na dowolnym porcie (dev)', () => {
	assert.equal(isOriginAllowed('http://localhost:3001'), true)
	assert.equal(isOriginAllowed('http://localhost:3000'), true)
	assert.equal(isOriginAllowed('http://localhost'), true)
})

test('CORS: dopuszcza podglądy Railway', () => {
	assert.equal(isOriginAllowed('https://bistromapa-production-abc.up.railway.app'), true)
})

test('CORS: brak originu jest dozwolony (wywołanie server-to-server)', () => {
	assert.equal(isOriginAllowed(undefined), true)
})

test('CORS: odrzuca obcą domenę', () => {
	assert.equal(isOriginAllowed('https://evil.com'), false)
})

test('CORS: odrzuca domenę łudząco podobną do naszej', () => {
	assert.equal(isOriginAllowed('https://notbistromapa.app'), false)
})

test('CORS: odrzuca naszą domenę jako subdomenę obcej', () => {
	assert.equal(isOriginAllowed('https://bistromapa.app.evil.com'), false)
})

test('CORS: normalizuje końcowy ukośnik w originie', () => {
	assert.equal(isOriginAllowed('https://bistromapa.app/'), true)
})

test('buildAllowedOrigins — zawiera stałe wpisy projektowe', () => {
	const origins = buildAllowedOrigins(undefined)

	assert.ok(origins.includes('https://bistromapa.app'))
	assert.ok(origins.includes('https://console.bistromapa.app'))
})

test('buildAllowedOrigins — rozdziela FRONTEND_URL po przecinku', () => {
	const origins = buildAllowedOrigins('https://a.example.com, https://b.example.com')

	assert.ok(origins.includes('https://a.example.com'))
	assert.ok(origins.includes('https://b.example.com'))
})

test('buildAllowedOrigins — usuwa końcowy ukośnik z env', () => {
	const origins = buildAllowedOrigins('https://moja-domena.pl/')

	assert.ok(origins.includes('https://moja-domena.pl'), 'wklejony URL często kończy się slashem')
	assert.ok(!origins.includes('https://moja-domena.pl/'))
})

test('buildAllowedOrigins — pusta zmienna nie psuje listy', () => {
	const origins = buildAllowedOrigins('')

	assert.ok(origins.includes('https://bistromapa.app'))
	assert.ok(!origins.includes(''), 'pusty wpis nie może trafić na listę')
})

test('CORS: domena z FRONTEND_URL jest dopuszczana', () => {
	assert.equal(isOriginAllowed('https://moja-domena.pl', 'https://moja-domena.pl/'), true)
})

test('CORS: domena spoza FRONTEND_URL jest odrzucana', () => {
	assert.equal(isOriginAllowed('https://cos-innego.pl', 'https://moja-domena.pl'), false)
})

// ────────────────────────────────────────────────────────────────────────────
section('Token serwisowy CRM (middleware/service-token)')

function fakeRes() {
	const captured: { status?: number; body?: unknown } = {}

	const res = {
		status(code: number) {
			captured.status = code
			return res
		},
		json(payload: unknown) {
			captured.body = payload
			return res
		},
	}

	return { res: res as unknown as Response, captured }
}

function fakeReq(authorization?: string): Request {
	return { headers: authorization ? { authorization } : {} } as unknown as Request
}

test('requireServiceToken — bez ustawionego BISTRO_API_TOKEN zwraca 503', () => {
	const previousToken = process.env.BISTRO_API_TOKEN
	const previousError = console.error

	delete process.env.BISTRO_API_TOKEN
	// Middleware celowo loguje tu błąd — wyciszamy, żeby nie wyglądało to jak awaria testu
	console.error = () => {}

	try {
		const { res, captured } = fakeRes()
		let passed = false
		requireServiceToken(fakeReq('Bearer cokolwiek'), res, (() => {
			passed = true
		}) as NextFunction)

		assert.equal(passed, false, 'nie może przepuścić żądania')
		assert.equal(captured.status, 503, 'brak konfiguracji to błąd serwera, nie klienta')
	} finally {
		console.error = previousError

		if (previousToken === undefined) delete process.env.BISTRO_API_TOKEN
		else process.env.BISTRO_API_TOKEN = previousToken
	}
})

test('requireServiceToken — odrzuca brak nagłówka autoryzacji', () => {
	const previous = process.env.BISTRO_API_TOKEN
	process.env.BISTRO_API_TOKEN = 'tajny-token'

	try {
		const { res, captured } = fakeRes()
		let passed = false
		requireServiceToken(fakeReq(), res, (() => {
			passed = true
		}) as NextFunction)

		assert.equal(passed, false)
		assert.equal(captured.status, 401)
	} finally {
		if (previous === undefined) delete process.env.BISTRO_API_TOKEN
		else process.env.BISTRO_API_TOKEN = previous
	}
})

test('requireServiceToken — odrzuca błędny token', () => {
	const previous = process.env.BISTRO_API_TOKEN
	process.env.BISTRO_API_TOKEN = 'tajny-token'

	try {
		const { res, captured } = fakeRes()
		let passed = false
		requireServiceToken(fakeReq('Bearer inny-token'), res, (() => {
			passed = true
		}) as NextFunction)

		assert.equal(passed, false)
		assert.equal(captured.status, 401)
	} finally {
		if (previous === undefined) delete process.env.BISTRO_API_TOKEN
		else process.env.BISTRO_API_TOKEN = previous
	}
})

test('requireServiceToken — przepuszcza poprawne Bearer', () => {
	const previous = process.env.BISTRO_API_TOKEN
	process.env.BISTRO_API_TOKEN = 'tajny-token'

	try {
		const { res, captured } = fakeRes()
		let passed = false
		requireServiceToken(fakeReq('Bearer tajny-token'), res, (() => {
			passed = true
		}) as NextFunction)

		assert.equal(passed, true, 'poprawny token musi przepuścić żądanie')
		assert.equal(captured.status, undefined, 'nie może wysyłać odpowiedzi przy sukcesie')
	} finally {
		if (previous === undefined) delete process.env.BISTRO_API_TOKEN
		else process.env.BISTRO_API_TOKEN = previous
	}
})

// ────────────────────────────────────────────────────────────────────────────
section('Uprawnienia administratora (middleware/auth)')

test('requireAdmin — odrzuca żądanie bez zalogowanego użytkownika', () => {
	const { res, captured } = fakeRes()
	let passed = false

	requireAdmin({} as Request, res, (() => {
		passed = true
	}) as NextFunction)

	assert.equal(passed, false)
	assert.equal(captured.status, 403)
})

test('requireAdmin — odrzuca konto bez roli ADMIN', () => {
	const { res, captured } = fakeRes()
	let passed = false
	const req = { user: { id: '1', email: 'a@b.pl', role: 'OWNER' } } as unknown as Request

	requireAdmin(req, res, (() => {
		passed = true
	}) as NextFunction)

	assert.equal(passed, false)
	assert.equal(captured.status, 403)
})

test('requireAdmin — przepuszcza administratora', () => {
	const { res } = fakeRes()
	let passed = false
	const req = { user: { id: '1', email: 'a@b.pl', role: 'ADMIN' } } as unknown as Request

	requireAdmin(req, res, (() => {
		passed = true
	}) as NextFunction)

	assert.equal(passed, true)
})
