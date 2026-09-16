import Link from 'next/link'
import { notFound } from 'next/navigation'

import { JobActions, RunCampaignButton } from '@/components/campaigns/JobActions'
import { PageHeader, StatCard } from '@/components/ui'
import { ApiError, fetchOrLogin } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { Campaign } from '@/types'

const JOB_STATUS_STYLE: Record<string, string> = {
	PENDING: 'text-stone-500',
	RUNNING: 'text-sky-600',
	COMPLETED: 'text-emerald-700',
	ERROR: 'text-red-600',
}

export default async function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	try {
		const campaign = await fetchOrLogin<Campaign>(`/campaigns/${id}`)
		const summary = campaign.summary

		return (
			<div className="p-6 md:p-8">
				<PageHeader
					title={campaign.name}
					subtitle={[campaign.region, campaign.category, `Status: ${campaign.status}`].filter(Boolean).join(' · ')}
					action={
						<div className="flex items-center gap-2">
							<RunCampaignButton campaignId={campaign.id} />
							<Link href="/campaigns" className="btn-secondary">
								← Kampanie
							</Link>
						</div>
					}
				/>

				<div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
					<StatCard label="Znalezione" value={summary?.resultsFound ?? 0} />
					<StatCard label="Nowe leady" value={summary?.newLeads ?? 0} tone="good" />
					<StatCard label="Duplikaty" value={summary?.duplicates ?? 0} tone="warn" />
					<StatCard label="Do przetworzenia" value={summary?.pending ?? 0} />
				</div>

				<div className="mt-6 overflow-x-auto">
					<table className="w-full min-w-[900px] border-collapse text-sm">
						<thead>
							<tr className="border-b border-stone-200">
								{['Miasto', 'Kategoria', 'Fraza', 'Limit', 'Status', 'Znalezione', 'Nowe', 'Duplikaty', 'Błąd', 'Akcje'].map((label) => (
									<th key={label} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-stone-400">
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{(campaign.jobs ?? []).map((job) => (
								<tr key={job.id} className="border-b border-stone-100 align-top">
									<td className="px-3 py-3 font-medium">{job.city ?? '—'}</td>
									<td className="px-3 py-3 text-stone-600">{job.category ?? '—'}</td>
									<td className="px-3 py-3 text-stone-600">{job.search ?? '—'}</td>
									<td className="px-3 py-3 font-mono text-[10px] text-stone-500">{job.limit}</td>
									<td className={`px-3 py-3 font-mono text-[10px] uppercase tracking-wider ${JOB_STATUS_STYLE[job.status] ?? ''}`}>
										{job.status}
										{job.retryCount > 0 && <span className="ml-1 text-stone-400">(próba {job.retryCount + 1})</span>}
									</td>
									<td className="px-3 py-3 font-mono text-[10px] text-stone-600">{job.resultsFound}</td>
									<td className="px-3 py-3 font-mono text-[10px] text-emerald-700">{job.newLeads}</td>
									<td className="px-3 py-3 font-mono text-[10px] text-amber-600">{job.duplicates}</td>
									<td className="max-w-[240px] px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-red-600">
										{job.errorMsg ?? '—'}
										{job.completedAt && (
											<div className="text-stone-400">{formatDateTime(job.completedAt)}</div>
										)}
									</td>
									<td className="px-3 py-3">
										<JobActions jobId={job.id} status={job.status} />
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		)
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) notFound()
		throw error
	}
}
