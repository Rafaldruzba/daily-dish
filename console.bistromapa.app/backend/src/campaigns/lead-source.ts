/**
 * Interfejs źródła leadów (readme §19-20) — pozwala podmienić Google Maps
 * na CSV, ręczne dodawanie czy inne źródło bez zmian w logice kampanii.
 */
export interface RawLead {
	name: string
	city: string
	address?: string | null
	phone?: string | null
	website?: string | null
	nip?: string | null
	category?: string | null
	sourceUrl?: string | null
}

export interface LeadSearchParams {
	city?: string
	category?: string
	search?: string
	limit?: number
}

export interface LeadSourceProvider {
	/** Wartość zapisywana w Lead.source (readme §22). */
	readonly source: 'GOOGLE_MAPS' | 'CSV' | 'MANUAL' | 'OTHER'
	readonly configured: boolean
	findLeads(params: LeadSearchParams): Promise<RawLead[]>
}

export class ProviderNotConfiguredError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'ProviderNotConfiguredError'
	}
}
