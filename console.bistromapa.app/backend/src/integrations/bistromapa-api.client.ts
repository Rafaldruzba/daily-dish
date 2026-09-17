import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

export class IntegrationNotConfiguredError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'IntegrationNotConfiguredError'
	}
}

export interface OnboardingPayload {
	name: string
	city: string
	address?: string | null
	phone?: string | null
	email: string
	category?: string | null
	contactPerson?: string | null
}

export interface OnboardingResult {
	restaurantId: string
	userId: string
}

/**
 * Klient głównego backendu BistroMapy (readme §33-34).
 *
 * Rozmawia wyłącznie z wewnętrznym routerem `/api/crm/*` po stronie BistroMapy,
 * autoryzowanym wspólnym sekretem BISTRO_API_TOKEN. Ten router świadomie nie
 * omija moderacji: tworzy lokal w statusie PENDING, a widoczność ustawia moderator.
 */
@Injectable()
export class BistroMapaApiClient {
	private static readonly ONBOARDING_PATH = '/crm/onboarding'
	private static readonly ACTIVATE_PATH = '/crm/activate'

	private readonly logger = new Logger(BistroMapaApiClient.name)
	private readonly baseUrl?: string
	private readonly token?: string

	constructor(config: ConfigService) {
		this.baseUrl = config.get<string>('BISTRO_API_URL')?.replace(/\/$/, '') || undefined
		this.token = config.get<string>('BISTRO_API_TOKEN') || undefined
	}

	get configured(): boolean {
		return Boolean(this.baseUrl && this.token)
	}

	async createRestaurantWithOwner(payload: OnboardingPayload): Promise<OnboardingResult> {
		this.assertConfigured()

		const response = await fetch(`${this.baseUrl}${BistroMapaApiClient.ONBOARDING_PATH}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${this.token}`,
			},
			body: JSON.stringify(payload),
		})

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			this.logger.error(`Onboarding ${response.status}: ${body.slice(0, 300)}`)

			if (response.status === 503) {
				throw new IntegrationNotConfiguredError(
					'BistroMapa API nie ma ustawionego BISTRO_API_TOKEN — integracja CRM jest wyłączona po jej stronie',
				)
			}

			// 4xx to błąd danych (np. e-mail już istnieje) — pokazujemy go w logach automatyzacji.
			throw new Error(`BistroMapa API zwróciło ${response.status}: ${extractMessage(body)}`)
		}

		const data = (await response.json()) as Partial<OnboardingResult>

		if (!data.restaurantId || !data.userId) {
			throw new Error('Odpowiedź onboardingu nie zawiera restaurantId/userId')
		}

		return { restaurantId: data.restaurantId, userId: data.userId }
	}

	/** Aktywacja konta właściciela restauracji — ustawia hasło przez bezpieczne wywołanie server-to-server (readme §24). */
	async activateUserAccount(userId: string, password: string): Promise<void> {
		this.assertConfigured()

		const response = await fetch(`${this.baseUrl}${BistroMapaApiClient.ACTIVATE_PATH}`, {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				authorization: `Bearer ${this.token}`,
			},
			body: JSON.stringify({ userId, password }),
		})

		if (!response.ok) {
			const body = await response.text().catch(() => '')
			this.logger.error(`Activate ${response.status}: ${body.slice(0, 300)}`)
			throw new Error(`BistroMapa API zwróciło ${response.status}: ${extractMessage(body)}`)
		}
	}

	private assertConfigured(): void {
		if (!this.configured) {
			throw new IntegrationNotConfiguredError(
				'Brak BISTRO_API_URL / BISTRO_API_TOKEN w środowisku backendu — integracja z BistroMapą nie jest jeszcze podłączona',
			)
		}
	}
}

/** Wyciąga `message` z odpowiedzi błędu BistroMapy, żeby log automatyzacji był czytelny. */
function extractMessage(body: string): string {
	try {
		const parsed = JSON.parse(body) as { message?: string }
		return parsed.message ?? body.slice(0, 200)
	} catch {
		return body.slice(0, 200) || 'brak treści odpowiedzi'
	}
}
