import { Mail, Phone, Plus } from 'lucide-react'
import Link from 'next/link'

import { LeadFilters } from '@/components/leads/LeadFilters'
import { LeadStatusSelect } from '@/components/leads/LeadStatusSelect'
import { Pagination } from '@/components/Pagination'
import { PageHeader } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'
import { formatDateTime, isOverdue } from '@/lib/format'
import type { Lead, Paginated } from '@/types'

type SearchParams = Record<string, string | string[] | undefined>

const FILTER_KEYS = ['search', 'status', 'city', 'category', 'source', 'followUp', 'sortBy', 'sortDir'] as const
const PAGE_SIZE = 20

function first(value: string | string[] | undefined): string | undefined {
	return Array.isArray(value) ? value[0] : value
}

function toQuery(params: Record<string, string | undefined>): string {
	const search = new URLSearchParams()

	for (const [key, value] of Object.entries(params)) {
		if (value) search.set(key, value)
	}

	return search.toString()
}

const COLUMNS: { key: string; label: string; sortable?: boolean; className?: string }[] = [
	{ key: 'name', label: 'Restauracja', sortable: true },
	{ key: 'city', label: 'Miasto', sortable: true },
	{ key: 'contact', label: 'Kontakt' },
	{ key: 'category', label: 'Kategoria' },
	{ key: 'source', label: 'Źródło' },
	{ key: 'status', label: 'Status', sortable: true },
	{ key: 'lastContactAt', label: 'Ostatni kontakt', sortable: true },
	{ key: 'nextFollowUpAt', label: 'Follow-up', sortable: true },
]

export default async function LeadsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
	const raw = await searchParams

	const filters: Record<string, string | undefined> = {}
	for (const key of FILTER_KEYS) {
		filters[key] = first(raw[key])
	}

	const page = Math.max(1, Number(first(raw.page) ?? '1') || 1)
	const data = await fetchOrLogin<Paginated<Lead>>(
		`/leads?${toQuery({ ...filters, page: String(page), limit: String(PAGE_SIZE) })}`,
	)

	const buildHref = (nextPage: number) =>
		`/leads?${toQuery({ ...filters, page: String(nextPage), limit: String(PAGE_SIZE) })}`

	const sortHref = (column: string) =>
		`/leads?${toQuery({
			...filters,
			page: '1',
			limit: String(PAGE_SIZE),
			sortBy: column,
			sortDir: filters.sortBy === column && filters.sortDir !== 'asc' ? 'asc' : 'desc',
		})}`

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Leady"
				subtitle="Potencjalne restauracje do pozyskania"
				action={
					<Link href="/leads/new" className="btn-primary">
						<Plus className="h-3.5 w-3.5" aria-hidden />
						Dodaj leada
					</Link>
				}
			/>

			<div className="mt-6">
				<LeadFilters values={filters} />
			</div>

			<div className="mt-2 overflow-x-auto">
				<table className="w-full min-w-[900px] border-collapse text-sm">
					<thead>
						<tr className="border-b border-stone-200">
							{COLUMNS.map((column) => (
								<th key={column.key} className="px-3 py-3 text-left">
									{column.sortable ? (
										<Link
											href={sortHref(column.key)}
											className="font-mono text-[10px] uppercase tracking-widest text-stone-400 transition hover:text-stone-900"
										>
											{column.label}
											{filters.sortBy === column.key && (filters.sortDir === 'asc' ? ' ↑' : ' ↓')}
										</Link>
									) : (
										<span className="font-mono text-[10px] uppercase tracking-widest text-stone-400">
											{column.label}
										</span>
									)}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.items.length === 0 && (
							<tr>
								<td colSpan={COLUMNS.length} className="px-3 py-10 text-center text-sm text-stone-400">
									Brak leadów dla wybranych filtrów.
								</td>
							</tr>
						)}

						{data.items.map((lead) => (
							<tr key={lead.id} className="border-b border-stone-100 align-top hover:bg-stone-50">
								<td className="px-3 py-3">
									<Link href={`/leads/${lead.id}`} className="font-bold hover:underline">
										{lead.name}
									</Link>
									{lead.contactPerson && (
										<p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
											{lead.contactPerson}
										</p>
									)}
								</td>
								<td className="px-3 py-3 text-stone-600">{lead.city}</td>
								<td className="px-3 py-3">
									<div className="flex flex-col gap-1">
										{lead.phone ? (
											<a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-stone-700 hover:underline">
												<Phone className="h-3 w-3 text-stone-400" aria-hidden />
												{lead.phone}
											</a>
										) : (
											<span className="text-stone-300">—</span>
										)}
										{lead.email ? (
											<a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-stone-700 hover:underline">
												<Mail className="h-3 w-3 text-stone-400" aria-hidden />
												{lead.email}
											</a>
										) : (
											<span className="text-stone-300">—</span>
										)}
									</div>
								</td>
								<td className="px-3 py-3 text-stone-600">{lead.category ?? '—'}</td>
								<td className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-stone-500">{lead.source}</td>
								<td className="px-3 py-3">
									<LeadStatusSelect leadId={lead.id} status={lead.status} />
								</td>
								<td className="px-3 py-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-stone-500">
									{formatDateTime(lead.lastContactAt)}
								</td>
								<td
									className={`px-3 py-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider ${
										isOverdue(lead.nextFollowUpAt) ? 'text-red-600' : 'text-stone-500'
									}`}
								>
									{formatDateTime(lead.nextFollowUpAt)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			<Pagination page={data.page} pages={data.pages} total={data.total} buildHref={buildHref} />
		</div>
	)
}
