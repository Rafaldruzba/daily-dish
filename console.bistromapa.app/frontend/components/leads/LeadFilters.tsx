import { Search } from 'lucide-react'
import Link from 'next/link'

import { LEAD_SOURCES, LEAD_STATUSES } from '@/lib/constants'
import { STATUS_LABEL } from '@/lib/format'

export interface LeadFilterValues {
	search?: string
	status?: string
	city?: string
	category?: string
	source?: string
	followUp?: string
	sortBy?: string
	sortDir?: string
}

/** Filtry jako zwykły formularz GET — działa bez JS i bez stanu po stronie klienta. */
export function LeadFilters({ values }: { values: LeadFilterValues }) {
	return (
		<form method="get" action="/leads" className="flex flex-wrap items-end gap-3 border-b border-stone-200 pb-5">
			<div className="min-w-[220px] flex-1">
				<label htmlFor="search" className="label-mono">
					Szukaj
				</label>
				<div className="relative mt-1">
					<Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" aria-hidden />
					<input
						id="search"
						name="search"
						defaultValue={values.search ?? ''}
						placeholder="Nazwa, miasto, telefon, email…"
						className="field pl-9"
					/>
				</div>
			</div>

			<div>
				<label htmlFor="status" className="label-mono">
					Status
				</label>
				<select id="status" name="status" defaultValue={values.status ?? ''} className="field mt-1">
					<option value="">Wszystkie</option>
					{LEAD_STATUSES.map((status) => (
						<option key={status} value={status}>
							{STATUS_LABEL[status]}
						</option>
					))}
				</select>
			</div>

			<div>
				<label htmlFor="city" className="label-mono">
					Miasto
				</label>
				<input id="city" name="city" defaultValue={values.city ?? ''} className="field mt-1 w-36" />
			</div>

			<div>
				<label htmlFor="source" className="label-mono">
					Źródło
				</label>
				<select id="source" name="source" defaultValue={values.source ?? ''} className="field mt-1">
					<option value="">Wszystkie</option>
					{LEAD_SOURCES.map((source) => (
						<option key={source} value={source}>
							{source}
						</option>
					))}
				</select>
			</div>

			<div>
				<label htmlFor="followUp" className="label-mono">
					Follow-up
				</label>
				<select id="followUp" name="followUp" defaultValue={values.followUp ?? ''} className="field mt-1">
					<option value="">Wszystkie</option>
					<option value="overdue">Zaległe</option>
					<option value="today">Dzisiaj</option>
					<option value="week">Najbliższy tydzień</option>
					<option value="none">Bez terminu</option>
				</select>
			</div>

			{values.sortBy && <input type="hidden" name="sortBy" value={values.sortBy} />}
			{values.sortDir && <input type="hidden" name="sortDir" value={values.sortDir} />}

			<button type="submit" className="btn-primary">
				Filtruj
			</button>
			<Link href="/leads" className="btn-secondary">
				Wyczyść
			</Link>
		</form>
	)
}
