/**
 * Wspólna obsługa zapisów (POST/PUT) z panelu.
 *
 * Powód istnienia: gdy odpowiedź wraca z pustym ciałem (zdarza się, gdy przed
 * backendem stoi proxy/CDN, które gubi treść), `response.json()` rzuca, a panel
 * pokazywał generyczny błąd „nie udało się". Wyglądał identycznie jak odrzucenie
 * przez serwer, więc użytkownik ponawiał — i powstawały duplikaty, mimo że
 * pierwszy zapis się utrwalił.
 *
 * Ten klient rozdziela trzy różne sytuacje:
 *  - żądanie nie dotarło (brak połączenia) → bezpiecznie ponowić,
 *  - żądanie dotarło, ale odpowiedź nie wróciła w całości → operacja prawdopodobnie
 *    się UDAŁA, więc nie ponawiamy bez sprawdzenia,
 *  - serwer świadomie odrzucił → pokazujemy jego komunikat.
 */

export class ApiSaveError extends Error {
	/** HTTP status, jeśli odpowiedź w ogóle dotarła. */
	readonly status?: number
	/** true = operacja mogła się udać; nie ponawiaj bez odświeżenia widoku. */
	readonly uncertain: boolean

	constructor(message: string, options: { status?: number; uncertain?: boolean } = {}) {
		super(message)
		this.name = 'ApiSaveError'
		this.status = options.status
		this.uncertain = options.uncertain ?? false
	}
}

interface ApiEnvelope<T> {
	success: boolean
	data?: T
	error?: { message?: string; statusCode?: number }
}

/**
 * Wysyła JSON i zwraca `data` z koperty `{ success, data }`.
 * Rzuca `ApiSaveError` z komunikatem gotowym do pokazania użytkownikowi.
 */
export async function sendJson<T>(path: string, init: RequestInit & { method: 'POST' | 'PUT' | 'DELETE' }): Promise<T> {
	let response: Response

	try {
		response = await fetch(path, {
			...init,
			headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
		})
	} catch {
		throw new ApiSaveError('Brak połączenia z serwerem — operacja nie została wykonana.')
	}

	const raw = await response.text().catch(() => '')

	// Puste ciało. Przy 2xx żądanie zostało przetworzone, więc zapis najpewniej się udał.
	if (raw.trim() === '') {
		if (response.ok) {
			throw new ApiSaveError(
				`Serwer przyjął żądanie (HTTP ${response.status}), ale odpowiedź wróciła pusta — operacja prawdopodobnie się udała. Odśwież stronę i sprawdź, zanim spróbujesz ponownie.`,
				{ status: response.status, uncertain: true },
			)
		}

		throw new ApiSaveError(`Serwer zwrócił HTTP ${response.status} bez treści odpowiedzi.`, {
			status: response.status,
		})
	}

	let payload: ApiEnvelope<T>

	try {
		payload = JSON.parse(raw) as ApiEnvelope<T>
	} catch {
		// Nie-JSON: najczęściej strona błędu wstawiona przez proxy zamiast odpowiedzi API.
		throw new ApiSaveError(`Serwer zwrócił nieczytelną odpowiedź (HTTP ${response.status}).`, {
			status: response.status,
			uncertain: response.ok,
		})
	}

	if (!response.ok || payload.success !== true) {
		throw new ApiSaveError(payload.error?.message ?? `Operacja nie powiodła się (HTTP ${response.status}).`, {
			status: response.status,
		})
	}

	return payload.data as T
}

/** Wysyła FormData (upload) — ta sama obsługa błędów, bez nagłówka content-type. */
export async function sendForm<T>(path: string, formData: FormData): Promise<T> {
	let response: Response

	try {
		response = await fetch(path, { method: 'POST', body: formData })
	} catch {
		throw new ApiSaveError('Brak połączenia z serwerem — operacja nie została wykonana.')
	}

	const raw = await response.text().catch(() => '')

	if (raw.trim() === '') {
		throw new ApiSaveError(`Serwer zwrócił pustą odpowiedź (HTTP ${response.status}).`, {
			status: response.status,
			uncertain: response.ok,
		})
	}

	let payload: ApiEnvelope<T>
	try {
		payload = JSON.parse(raw) as ApiEnvelope<T>
	} catch {
		throw new ApiSaveError(`Serwer zwrócił nieczytelną odpowiedź (HTTP ${response.status}).`, {
			status: response.status,
		})
	}

	if (!response.ok || payload.success !== true) {
		throw new ApiSaveError(payload.error?.message ?? `Operacja nie powiodła się (HTTP ${response.status}).`, {
			status: response.status,
		})
	}

	return payload.data as T
}
