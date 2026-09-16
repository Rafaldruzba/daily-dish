import { Injectable, Logger } from '@nestjs/common'

import type { LeadSearchParams, LeadSourceProvider, RawLead } from '../lead-source'

/**
 * Źródło deweloperskie — generuje dane wyłącznie lokalnie i oznacza je
 * source = OTHER, żeby nie było wątpliwości, że nie pochodzą z Google.
 */
@Injectable()
export class MockLeadSourceProvider implements LeadSourceProvider {
	readonly source = 'OTHER' as const
	readonly configured = true

	private readonly logger = new Logger(MockLeadSourceProvider.name)

	async findLeads({ city, category, search, limit = 20 }: LeadSearchParams): Promise<RawLead[]> {
		this.logger.warn('Używam MockLeadSourceProvider — dane są wyłącznie testowe')

		const base = search ?? category ?? 'restauracja'
		const cityName = city ?? 'Warszawa'
		const count = Math.max(0, Math.min(limit, 20))

		return Array.from({ length: count }, (_, index) => ({
			name: `${base} ${index + 1} (mock)`,
			city: cityName,
			address: `ul. Testowa ${index + 1}`,
			phone: `5001${String(index).padStart(5, '0')}`,
			website: null,
			nip: null,
			category: category ?? null,
			sourceUrl: null,
		}))
	}
}
