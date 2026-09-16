import { Plus } from 'lucide-react'
import Link from 'next/link'

import { PageHeader } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'
import { formatDate } from '@/lib/format'
import type { Campaign, Paginated } from '@/types'

const STATUS_STYLE: Record<string, string> = {
	RUNNING: 'text-sky-600',
	PAUSED: 'text-amber-600',
	COMPLETED: 'text-emerald-700',
}

export default async function CampaignsPage() {
	const data = await fetchOrLogin<Paginated<Campaign>>('/campaigns?limit=50')

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Kampanie"
				subtitle="Pozyskiwanie leadów z podziałem na zadania (miasto × kategoria)"
				action={
					<Link href="/campaigns/new" className="btn-primary">
						<Plus className="h-3.5 w-3.5" aria-hidden />
						Nowa kampania
					</Link>
				}
			/>

			<div className="mt-6 overflow-x-auto">
				<table className="w-full min-w-[700px] border-collapse text-sm">
					<thead>
						<tr className="border-b border-stone-200">
							{['Kampania', 'Region', 'Kategoria', 'Zadania', 'Status', 'Utworzono'].map((label) => (
								<th key={label} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-stone-400">
									{label}
								</th>
							))}
						</tr>
					</thead>
					<tbody>
						{data.items.length === 0 && (
							<tr>
								<td colSpan={6} className="px-3 py-10 text-center text-sm text-stone-400">
									Nie ma jeszcze żadnej kampanii.
								</td>
							</tr>
						)}

						{data.items.map((campaign) => (
							<tr key={campaign.id} className="border-b border-stone-100 hover:bg-stone-50">
								<td className="px-3 py-3">
									<Link href={`/campaigns/${campaign.id}`} className="font-bold hover:underline">
										{campaign.name}
									</Link>
								</td>
								<td className="px-3 py-3 text-stone-600">{campaign.region ?? '—'}</td>
								<td className="px-3 py-3 text-stone-600">{campaign.category ?? '—'}</td>
								<td className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-stone-500">
									{campaign._count?.jobs ?? 0}
								</td>
								<td className={`px-3 py-3 font-mono text-[10px] uppercase tracking-wider ${STATUS_STYLE[campaign.status] ?? ''}`}>
									{campaign.status}
								</td>
								<td className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-stone-500">
									{formatDate(campaign.createdAt)}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
