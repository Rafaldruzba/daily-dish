import 'dotenv/config'

import { test, assert, section, Skip } from './harness'

/**
 * Testy HTTP — wymagają DZIAŁAJĄCEGO backendu głównego (npm run dev) i bazy.
 * Gdy serwer nie odpowiada, każdy krok zgłasza się jako pominięty, a nie jako błąd.
 */

const BASE = `http://localhost:${process.env.PORT ?? 3000}/api`

let probed: boolean | null = null

async function serverUp(): Promise<boolean> {
	if (probed !== null) return probed

	try {
		const response = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(3000) })
		probed = response.ok
	} catch {
		probed = false
	}

	return probed
}

async function requireServer(): Promise<void> {
	if (!(await serverUp())) {
		throw new Skip(`serwer nie odpowiada na ${BASE} — uruchom "npm run dev" w bistromapa.api`)
	}
}

async function call(path: string, init: RequestInit = {}) {
	const response = await fetch(`${BASE}${path}`, {
		...init,
		headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
		signal: AbortSignal.timeout(10_000),
	})

	const body = (await response.json().catch(() => null)) as unknown

	return { response, body }
}

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — publiczne endpointy')

test('HTTP: /health odpowiada i zwraca success:true', async () => {
	await requireServer()
	const { response, body } = await call('/health')

	assert.equal(response.status, 200)
	assert.equal((body as { success: boolean }).success, true)
})

test('HTTP: /restaurants zwraca listę', async () => {
	await requireServer()
	const { response, body } = await call('/restaurants')

	assert.equal(response.status, 200)
	assert.ok(Array.isArray(body), 'katalog restauracji musi być tablicą')
})

test('HTTP: /seo/cities zwraca listę miast', async () => {
	await requireServer()
	const { response, body } = await call('/seo/cities')

	assert.equal(response.status, 200)
	assert.ok(Array.isArray(body))
})

test('HTTP: nieznana ścieżka nie zwraca 500', async () => {
	await requireServer()
	const { response } = await call('/nie-ma-takiego-endpointu')

	assert.ok(response.status < 500, `oczekiwano 4xx, otrzymano ${response.status}`)
})

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — CORS')

test('HTTP: własna domena dostaje nagłówek Access-Control-Allow-Origin', async () => {
	await requireServer()
	const { response } = await call('/health', { headers: { origin: 'https://bistromapa.app' } })

	assert.equal(response.headers.get('access-control-allow-origin'), 'https://bistromapa.app')
})

test('HTTP: obca domena nie dostaje nagłówka CORS', async () => {
	await requireServer()
	const { response } = await call('/health', { headers: { origin: 'https://evil.example.com' } })

	assert.equal(response.headers.get('access-control-allow-origin'), null, 'obcy origin nie może dostać dostępu')
})

test('HTTP: preflight z dozwolonego originu przechodzi', async () => {
	await requireServer()

	const response = await fetch(`${BASE}/restaurants`, {
		method: 'OPTIONS',
		headers: {
			origin: 'https://console.bistromapa.app',
			'access-control-request-method': 'GET',
		},
		signal: AbortSignal.timeout(10_000),
	})

	assert.equal(response.headers.get('access-control-allow-origin'), 'https://console.bistromapa.app')
})

test('HTTP: subdomena własnej domeny jest dopuszczona', async () => {
	await requireServer()
	const { response } = await call('/health', { headers: { origin: 'https://www.bistromapa.app' } })

	assert.equal(response.headers.get('access-control-allow-origin'), 'https://www.bistromapa.app')
})

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — wewnętrzne endpointy CRM (readme §33)')

test('HTTP: /crm/onboarding bez tokenu jest niedostępny', async () => {
	await requireServer()

	const { response, body } = await call('/crm/onboarding', {
		method: 'POST',
		body: JSON.stringify({ name: 'Test', city: 'Test', email: 'test@example.com' }),
	})

	// 503 = token nieustawiony po stronie serwera, 401 = token ustawiony, ale żądanie bez niego
	assert.ok(
		response.status === 401 || response.status === 503,
		`endpoint CRM nie może być publiczny (otrzymano ${response.status})`,
	)
	assert.equal((body as { success: boolean }).success, false)
})

test('HTTP: /crm/onboarding odrzuca błędny token', async () => {
	await requireServer()

	if (!process.env.BISTRO_API_TOKEN) {
		throw new Skip('BISTRO_API_TOKEN nieustawiony — serwer zwraca 503 zamiast 401')
	}

	const { response } = await call('/crm/onboarding', {
		method: 'POST',
		headers: { authorization: 'Bearer zupelnie-inny-token' },
		body: JSON.stringify({ name: 'Test', city: 'Test', email: 'test@example.com' }),
	})

	assert.equal(response.status, 401)
})

test('HTTP: /crm/onboarding z poprawnym tokenem odrzuca niepełne dane (400)', async () => {
	await requireServer()

	const token = process.env.BISTRO_API_TOKEN
	if (!token) throw new Skip('BISTRO_API_TOKEN nieustawiony')

	// Celowo niepełne dane: dowodzi, że token przechodzi, a walidacja działa —
	// i nie tworzy przy tym śmieciowych rekordów w bazie.
	const { response } = await call('/crm/onboarding', {
		method: 'POST',
		headers: { authorization: `Bearer ${token}` },
		body: JSON.stringify({}),
	})

	assert.equal(response.status, 400, 'poprawny token + brak danych powinno dać 400, nie 401')
})

test('HTTP: /crm/activate bez tokenu jest niedostępny', async () => {
	await requireServer()

	const { response } = await call('/crm/activate', {
		method: 'POST',
		body: JSON.stringify({ userId: 'x', password: 'haslo123456789' }),
	})

	assert.ok(
		response.status === 401 || response.status === 503,
		`endpoint CRM nie może być publiczny (otrzymano ${response.status})`,
	)
})

test('HTTP: /crm/activate z poprawnym tokenem odrzuca niepełne dane (400)', async () => {
	await requireServer()

	const token = process.env.BISTRO_API_TOKEN
	if (!token) throw new Skip('BISTRO_API_TOKEN nieustawiony')

	const { response } = await call('/crm/activate', {
		method: 'POST',
		headers: { authorization: `Bearer ${token}` },
		body: JSON.stringify({}),
	})

	assert.equal(response.status, 400)
})

test('HTTP: /crm/activate odrzuca hasło krótsze niż 12 znaków', async () => {
	await requireServer()

	const token = process.env.BISTRO_API_TOKEN
	if (!token) throw new Skip('BISTRO_API_TOKEN nieustawiony')

	const { response } = await call('/crm/activate', {
		method: 'POST',
		headers: { authorization: `Bearer ${token}` },
		body: JSON.stringify({ userId: '00000000-0000-0000-0000-000000000000', password: 'krotkie' }),
	})

	assert.equal(response.status, 400, 'słabe hasło musi być odrzucone przed dotknięciem bazy')
})

// ────────────────────────────────────────────────────────────────────────────
section('HTTP — sesja cząsteczkowa (token aktywacyjny)')

test('HTTP: /activation nie istnieje w tym backendzie (token zna tylko CRM)', async () => {
	await requireServer()
	const { response } = await call('/activation/cokolwiek')

	assert.equal(response.status, 404, 'backend główny nie może wystawiać weryfikacji tokenu — robi to CRM')
})
