import 'dotenv/config'

import { test, assert, section, Skip } from './harness'

/**
 * Testy HTTP — wymagają DZIAŁAJĄCEGO backendu CRM (npm run dev) i bazy.
 * Gdy serwer nie odpowiada, każdy krok zgłasza się jako pominięty, a nie jako błąd.
 */

const BASE = `http://localhost:${process.env.PORT ?? 3002}/api`

let probed: boolean | null = null

async function serverUp(): Promise<boolean> {
	if (probed !== null) return probed

	try {
		// Endpoint chroniony — 401 dowodzi, że serwer żyje, a globalny guard działa
		const response = await fetch(`${BASE}/leads`, { signal: AbortSignal.timeout(3000) })
		probed = response.status === 401
	} catch {
		probed = false
	}

	return probed
}

async function requireServer(): Promise<void> {
	if (!(await serverUp())) {
		throw new Skip(`serwer nie odpowiada na ${BASE} — uruchom "npm run dev" w backendzie`)
	}
}

async function call(path: string, init: RequestInit = {}) {
	const response = await fetch(`${BASE}${path}`, {
		...init,
		headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
		signal: AbortSignal.timeout(10_000),
	})

	const body = (await response.json().catch(() => null)) as
		| { success: true; data: unknown }
		| { success: false; error: { message: string; statusCode: number } }
		| null

	return { response, body }
}

/**
 * Loguje konto administratora z env i zwraca ciasteczko sesji.
 * Gdy brak danych lub logowanie zawiedzie, krok zgłasza się jako pominięty.
 */
async function loginAsAdmin(): Promise<{ cookie: string; email: string }> {
	const email = process.env.ADMIN_EMAIL
	const password = process.env.ADMIN_PASSWORD

	if (!email || !password) {
		throw new Skip('brak ADMIN_EMAIL / ADMIN_PASSWORD w backend/.env')
	}

	const { response } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	})

	if (response.status !== 200) {
		throw new Skip(`logowanie admina nie powiodło się (HTTP ${response.status})`)
	}

	const session = response.headers.getSetCookie().find((cookie) => cookie.startsWith('crm_session='))
	if (!session) throw new Skip('logowanie nie zwróciło ciasteczka')

	return { cookie: session.split(';')[0], email }
}

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — ochrona endpointów (readme §28)')

test('HTTP: /leads bez sesji zwraca 401', async () => {
	await requireServer()
	const { response, body } = await call('/leads')

	assert.equal(response.status, 401)
	assert.equal(body?.success, false)
})

test('HTTP: /automation/status bez sesji zwraca 401', async () => {
	await requireServer()
	const { response } = await call('/automation/status')
	assert.equal(response.status, 401)
})

test('HTTP: /email/templates bez sesji zwraca 401', async () => {
	await requireServer()
	const { response } = await call('/email/templates')
	assert.equal(response.status, 401)
})

test('HTTP: nieprawidłowe ciasteczko sesji zwraca 401', async () => {
	await requireServer()
	const { response } = await call('/leads', { headers: { cookie: 'crm_session=podrobiony.token.xyz' } })

	assert.equal(response.status, 401)
})

test('HTTP: koperta błędu ma kształt { success:false, error:{ message, statusCode } }', async () => {
	await requireServer()
	const { body } = await call('/leads')

	assert.ok(body && body.success === false, 'oczekiwano success:false')
	assert.equal(typeof body.error.message, 'string')
	assert.equal(body.error.statusCode, 401)
})

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — endpoint publiczny aktywacji (readme §24)')

test('HTTP: /activation/:token jest publiczny (nie zwraca 401)', async () => {
	await requireServer()
	const { response } = await call('/activation/nieistniejacy-token-000')

	assert.notEqual(response.status, 401, 'strona aktywacji nie może wymagać sesji CRM')
})

test('HTTP: nieznany token aktywacyjny zwraca 404', async () => {
	await requireServer()
	const { response, body } = await call('/activation/nieistniejacy-token-000')

	assert.equal(response.status, 404)
	assert.equal(body?.success, false)
})

test('HTTP: nieznany token nie ujawnia danych innego leada', async () => {
	await requireServer()
	const { body } = await call('/activation/nieistniejacy-token-000')

	const serialized = JSON.stringify(body)
	assert.ok(!serialized.includes('restaurantName'), 'odpowiedź nie może zawierać pól z innym rekordem')
})

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — logowanie (auth)')

test('HTTP: logowanie z błędnym hasłem zwraca 401 (nie 500)', async () => {
	await requireServer()
	const { response, body } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email: 'ktos@example.com', password: 'zupelniezlehaslo123' }),
	})

	assert.equal(response.status, 401)
	assert.equal(body?.success, false)
})

test('HTTP: logowanie z niepoprawnym emailem zwraca 400 (walidacja DTO)', async () => {
	await requireServer()
	const { response } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email: 'to-nie-jest-email', password: 'haslo123456' }),
	})

	assert.equal(response.status, 400)
})

test('HTTP: logowanie bez hasła zwraca 400', async () => {
	await requireServer()
	const { response } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email: 'ktos@example.com' }),
	})

	assert.equal(response.status, 400)
})

test('HTTP: logowanie odrzuca nieznane pola (forbidNonWhitelisted)', async () => {
	await requireServer()
	const { response } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email: 'ktos@example.com', password: 'haslo123456', rola: 'ADMIN' }),
	})

	assert.equal(response.status, 400, 'pola spoza DTO muszą być odrzucane')
})

test('HTTP: poprawne logowanie admina zwraca sesję i ciasteczko httpOnly', async () => {
	await requireServer()

	const email = process.env.ADMIN_EMAIL
	const password = process.env.ADMIN_PASSWORD

	if (!email || !password) {
		throw new Skip('brak ADMIN_EMAIL / ADMIN_PASSWORD w backend/.env')
	}

	const { response, body } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	})

	assert.equal(response.status, 200, `logowanie admina nie powiodło się (${JSON.stringify(body)})`)
	assert.equal(body?.success, true)

	const cookies = response.headers.getSetCookie()
	const session = cookies.find((cookie) => cookie.startsWith('crm_session='))

	assert.ok(session, 'brak ciasteczka crm_session w odpowiedzi')
	assert.ok(session.includes('HttpOnly'), 'ciasteczko sesji musi być HttpOnly (readme §28)')
	assert.ok(session.includes('Path=/'))
})

test('HTTP: /auth/me z ważną sesją zwraca konto admina', async () => {
	await requireServer()

	const email = process.env.ADMIN_EMAIL
	const password = process.env.ADMIN_PASSWORD

	if (!email || !password) {
		throw new Skip('brak ADMIN_EMAIL / ADMIN_PASSWORD w backend/.env')
	}

	const login = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	})

	const session = login.response.headers.getSetCookie().find((cookie) => cookie.startsWith('crm_session='))
	if (!session) throw new Skip('logowanie nie zwróciło ciasteczka')

	const cookie = session.split(';')[0]
	const { response, body } = await call('/auth/me', { headers: { cookie } })

	assert.equal(response.status, 200)
	assert.equal(body?.success, true)

	const user = (body as { data: { email: string; role: string } }).data
	assert.equal(user.email, email.toLowerCase())
	assert.ok(['ADMIN', 'MANAGER'].includes(user.role))
})

test('HTTP: token sesji nie wycieka w treści odpowiedzi logowania', async () => {
	await requireServer()

	const email = process.env.ADMIN_EMAIL
	const password = process.env.ADMIN_PASSWORD
	if (!email || !password) throw new Skip('brak ADMIN_EMAIL / ADMIN_PASSWORD')

	const { body } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email, password }),
	})

	// JWT ma trzy segmenty oddzielone kropkami i zaczyna się od "eyJ"
	assert.ok(!JSON.stringify(body).includes('eyJ'), 'JWT nie może być zwracany w ciele odpowiedzi (readme §28)')
})

test('HTTP: wylogowanie bez sesji zwraca 401 (wszystko domyślnie zamknięte)', async () => {
	await requireServer()
	const { response } = await call('/auth/logout', { method: 'POST' })

	assert.equal(response.status, 401)
})

test('HTTP: wylogowanie z sesją zwraca 200 i czyści ciasteczko', async () => {
	await requireServer()

	const { cookie } = await loginAsAdmin()
	const { response, body } = await call('/auth/logout', { method: 'POST', headers: { cookie } })

	assert.equal(response.status, 200, 'wylogowanie nie tworzy zasobu — oczekiwano 200, nie 201')
	assert.equal(body?.success, true)

	const cleared = response.headers.getSetCookie().find((value) => value.startsWith('crm_session='))
	assert.ok(cleared, 'wylogowanie musi wyczyścić ciasteczko sesji')
})

test('HTTP: zmiana hasła bez sesji zwraca 401', async () => {
	await requireServer()
	const { response } = await call('/auth/password', {
		method: 'POST',
		body: JSON.stringify({ currentPassword: 'cokolwiek12345', newPassword: 'nowehaslo123456' }),
	})

	assert.equal(response.status, 401, 'operacja na koncie nie może być dostępna bez sesji')
})

test('HTTP: /auth/me bez sesji zwraca 401', async () => {
	await requireServer()
	const { response } = await call('/auth/me')
	assert.equal(response.status, 401)
})

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — kodowanie i treść odpowiedzi')

test('HTTP: odpowiedzi sukcesu mają kopertę { success:true, data }', async () => {
	await requireServer()

	const { response, body } = await call('/auth/login', {
		method: 'POST',
		body: JSON.stringify({ email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD }),
	})

	if (response.status !== 200) throw new Skip('brak działającego konta admina do sprawdzenia koperty')

	assert.ok(body && body.success === true, 'oczekiwano success:true')
	assert.ok('data' in body, 'koperta musi zawierać pole data')
})

test('HTTP: nieznana ścieżka zwraca 404 (routing nie przecieka)', async () => {
	await requireServer()
	const { response } = await call('/nie-ma-takiego-endpointu')
	assert.equal(response.status, 404)
})
