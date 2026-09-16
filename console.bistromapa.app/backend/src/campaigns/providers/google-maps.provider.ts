import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { ProviderNotConfiguredError, type LeadSearchParams, type LeadSourceProvider, type RawLead } from '../lead-source'

interface PlacesSearchResponse {
	places?: {
		displayName?: { text?: string }
		formattedAddress?: string
		nationalPhoneNumber?: string
		websiteUri?: string
		id?: string
	}[]
	nextPageToken?: string
}

/**
 * Oficjalne Places API (Text Search) — bez scrapowania HTML (readme §19).
 * Klucz wyłącznie w backendzie; bez klucza źródło jest nieaktywne i kampania
 * kończy się kontrolowanym błędem, a nie cichym pustym wynikiem.
 */
@Injectable()
export class GoogleMapsProvider implements LeadSourceProvider {
	readonly source = 'GOOGLE_MAPS' as const

	private readonly logger = new Logger(GoogleMapsProvider.name)
	private readonly apiKey: string | undefined

	constructor(config: ConfigService) {
		this.apiKey = config.get<string>('GOOGLE_MAPS_API_KEY') || undefined
	}

	get configured(): boolean {
		return Boolean(this.apiKey)
	}

	async findLeads({ city, category, search, limit = 20 }: LeadSearchParams): Promise<RawLead[]> {
		if (!this.apiKey) {
			throw new ProviderNotConfiguredError(
				'Brak GOOGLE_MAPS_API_KEY w środowisku backendu — dodaj klucz Places API albo ustaw LEAD_SOURCE_PROVIDER=mock',
			)
		}

		const query = [search ?? category ?? 'restauracja', city].filter(Boolean).join(' ')
		const results: RawLead[] = []
		let pageToken: string | undefined

		// Places API zwraca max 20 wyników na stronę — dociągamy kolejne strony.
		while (results.length < limit) {
			const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
				method: 'POST',
				headers: {
					'content-type': 'application/json',
					'X-Goog-Api-Key': this.apiKey,
					'X-Goog-FieldMask':
						'places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.id,nextPageToken',
				},
				body: JSON.stringify({
					textQuery: query,
					languageCode: 'pl',
					regionCode: 'PL',
					pageSize: 20,
					...(pageToken ? { pageToken } : {}),
				}),
			})

			if (!response.ok) {
				const body = await response.text().catch(() => '')
				this.logger.error(`Places API ${response.status}: ${body.slice(0, 300)}`)
				throw new Error(`Places API zwróciło ${response.status}`)
			}

			const data = (await response.json()) as PlacesSearchResponse

			for (const place of data.places ?? []) {
				const name = place.displayName?.text
				if (!name) continue

				results.push({
					name,
					city: city ?? extractCity(place.formattedAddress),
					address: place.formattedAddress ?? null,
					phone: place.nationalPhoneNumber ?? null,
					website: place.websiteUri ?? null,
					nip: null, // Places API nie udostępnia NIP
					category: category ?? null,
					sourceUrl: place.id ? `https://www.google.com/maps/place/?q=place_id:${place.id}` : null,
				})
			}

			pageToken = data.nextPageToken
			if (!pageToken) break
		}

		return results.slice(0, limit)
	}
}

/** "ul. Krakowska 12, 05-500 Piaseczno, Polska" → "Piaseczno" (ostatnia część z kodem). */
function extractCity(address: string | undefined): string {
	if (!address) return ''

	const parts = address.split(',')
	for (const part of [...parts].reverse()) {
		const match = /\d{2}-\d{3}\s+(.+)/.exec(part.trim())
		if (match) return match[1].trim()
	}

	return parts[parts.length - 2]?.trim() ?? ''
}
