const SESSION_COOKIE = 'crm_session'

/** Adres API dla wywołań po stronie serwera; w przeglądarce idziemy przez własny origin. */
const SERVER_API_URL = process.env.API_URL ?? 'http://localhost:3002/api'

export interface ApiErrorBody {
	message: string
	statusCode: number
	details?: unknown
}

export class ApiError extends Error {
	constructor(
		readonly status: number,
		message: string,
		readonly details?: unknown,
	) {
		super(message)
		this.name = 'ApiError'
	}
}

async function forwardSessionCookie(headers: Headers): Promise<void> {
	// Import dynamiczny, żeby ten sam moduł działał też w komponencie klienckim.
	const { cookies } = await import('next/headers')
	const store = await cookies()
	const token = store.get(SESSION_COOKIE)?.value

	if (token) headers.set('cookie', `${SESSION_COOKIE}=${token}`)
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
	const isServer = typeof window === 'undefined'
	const base = isServer ? SERVER_API_URL : '/api'

	const headers = new Headers(init.headers)
	headers.set('accept', 'application/json')

	const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData
	if (init.body && !isFormData && !headers.has('content-type')) {
		headers.set('content-type', 'application/json')
	}

	if (isServer) await forwardSessionCookie(headers)

	const response = await fetch(`${base}${path}`, {
		...init,
		headers,
		cache: 'no-store',
	})

	const payload = (await response.json().catch(() => null)) as
		| { success: true; data: T }
		| { success: false; error: ApiErrorBody }
		| null

	if (!response.ok || !payload || payload.success === false) {
		const error = payload && payload.success === false ? payload.error : undefined
		throw new ApiError(
			response.status,
			error?.message ?? 'Nie udało się wykonać żądania',
			error?.details,
		)
	}

	return payload.data
}

export function jsonBody(data: unknown): RequestInit {
	return { body: JSON.stringify(data) }
}

/**
 * Zamiana danych z Prisma (Date) na czysty JSON przed przekazaniem do
 * komponentu klienckiego — trzymamy się jednego typu: ISO string.
 */
export function serialize<T>(value: unknown): T {
	return JSON.parse(JSON.stringify(value)) as T
}

/**
 * Dla stron serwerowych: gdy sesja wygasła, backend zwraca 401 — wtedy
 * przekierowujemy na logowanie zamiast pokazywać błąd 500.
 */
export async function fetchOrLogin<T>(path: string, init: RequestInit = {}): Promise<T> {
	try {
		return await apiFetch<T>(path, init)
	} catch (error) {
		if (error instanceof ApiError && error.status === 401) {
			const { redirect } = await import('next/navigation')
			redirect('/login')
		}

		throw error
	}
}
