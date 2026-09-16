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
 * UWAGA: główny backend nie ma jeszcze endpointu onboardingu CRM — sprawdzone,
 * istnieją tylko endpointy moderacyjne /admin/*. Dlatego każde wywołanie kończy
 * się kontrolowanym błędem zamiast udawać sukces. Gdy po stronie BistroMapy
 * powstanie `POST /admin/crm/onboarding`, wystarczy potwierdzić ścieżkę i pola.
 */
@Injectable()
export class BistroMapaApiClient {
	/** TODO: potwierdzić docelową ścieżkę z zespołem BistroMapy. */
	private static readonly ONBOARDING_PATH = '/admin/crm/onboarding'

	private readonly logger = new Logger(BistroMapaApiClient.name)
	private readonly baseUrl?: string
	private readonly token?: string

	constructor(config: ConfigService) {
		this.baseUrl = config.get<string>('BISTRO_API_URL') || undefined
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

			if (response.status === 404) {
				throw new IntegrationNotConfiguredError(
					'Główny backend BistroMapy nie udostępnia jeszcze endpointu onboardingu CRM (TODO: POST /admin/crm/onboarding)',
				)
			}

			throw new Error(`BistroMapa API zwróciło ${response.status}`)
		}

		const data = (await response.json()) as Partial<OnboardingResult>

		if (!data.restaurantId || !data.userId) {
			throw new Error('Odpowiedź onboardingu nie zawiera restaurantId/userId')
		}

		return { restaurantId: data.restaurantId, userId: data.userId }
	}

	private assertConfigured(): void {
		if (!this.configured) {
			throw new IntegrationNotConfiguredError(
				'Brak BISTRO_API_URL / BISTRO_API_TOKEN w środowisku backendu — integracja z BistroMapą nie jest jeszcze podłączona',
			)
		}
	}
}
