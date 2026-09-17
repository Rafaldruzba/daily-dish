import Link from 'next/link'

import { RetryLeadButton, RunCycleButton } from '@/components/automation/AutomationActions'
import { PageHeader, StatCard } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { AutomationLogEntry, AutomationStatus, Paginated } from '@/types'

export default async function AutomationPage() {
	const [status, logs] = await Promise.all([
		fetchOrLogin<AutomationStatus>('/automation/status'),
		fetchOrLogin<Paginated<AutomationLogEntry>>('/automation/logs?limit=50'),
	])

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Automatyzacja"
				subtitle="Onboarding zaakceptowanych leadów — każde przejście jest idempotentne i ma ponowienia"
				action={<RunCycleButton />}
			/>

			<div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard label="Oczekują na utworzenie" value={status.leads.pending} />
				<StatCard label="W kolejce" value={status.leads.queued} />
				<StatCard label="Błędy" value={status.leads.errors} tone={status.leads.errors > 0 ? 'danger' : 'default'} />
				<StatCard label="Aktywowane" value={status.leads.activated} tone="good" />
			</div>

			<section className="card mt-6">
				<h2 className="label-mono">Integracje</h2>
				<ul className="mt-3 space-y-2 text-sm">
					<li className="flex items-center gap-2">
						<span className={`h-2 w-2 rounded-full ${status.integrationConfigured ? 'bg-emerald-600' : 'bg-amber-500'}`} />
						API BistroMapy:{' '}
						{status.integrationConfigured ? (
							<span className="text-stone-600">skonfigurowane</span>
						) : (
							<span className="text-stone-600">
								brak <code className="bg-stone-100 px-1">BISTRO_API_URL</code> /{' '}
								<code className="bg-stone-100 px-1">BISTRO_API_TOKEN</code> — konta nie zostaną utworzone, a leady
								zostaną w statusie ERROR
							</span>
						)}
					</li>
					<li className="flex items-center gap-2">
						<span className={`h-2 w-2 rounded-full ${status.emailConfigured ? 'bg-emerald-600' : 'bg-amber-500'}`} />
						Resend: {status.emailConfigured ? <span className="text-stone-600">skonfigurowane</span> : <span className="text-stone-600">brak RESEND_API — zaproszenia nie wyjdą</span>}
					</li>
				</ul>
			</section>

			<section className="card mt-6">
				<h2 className="label-mono">Logi automatyzacji ({logs.total})</h2>

				<div className="mt-4 overflow-x-auto">
					<table className="w-full min-w-[800px] border-collapse text-sm">
						<thead>
							<tr className="border-b border-stone-200">
								{['Data', 'Lead', 'Akcja', 'Status', 'Błąd', 'Czas', 'Próba', ''].map((label) => (
									<th key={label} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-stone-400">
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{logs.items.length === 0 && (
								<tr>
									<td colSpan={8} className="px-3 py-10 text-center text-sm text-stone-400">
										Brak wpisów — automatyzacja nie była jeszcze uruchamiana.
									</td>
								</tr>
							)}

							{logs.items.map((entry) => (
								<tr key={entry.id} className="border-b border-stone-100">
									<td className="px-3 py-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-stone-500">
										{formatDateTime(entry.createdAt)}
									</td>
									<td className="px-3 py-3">
										{entry.lead ? (
											<Link href={`/leads/${entry.lead.id}`} className="hover:underline">
												{entry.lead.name}
											</Link>
										) : (
											<span className="text-stone-300">—</span>
										)}
									</td>
									<td className="px-3 py-3 font-mono text-[10px] uppercase tracking-wider text-stone-600">{entry.action}</td>
									<td className={`px-3 py-3 font-mono text-[10px] uppercase tracking-wider ${entry.status === 'ERROR' ? 'text-red-600' : 'text-emerald-700'}`}>
										{entry.status}
									</td>
									<td className="max-w-[280px] px-3 py-3 text-xs text-red-600">{entry.error ?? '—'}</td>
									<td className="px-3 py-3 font-mono text-[10px] text-stone-500">
										{entry.durationMs === null ? '—' : `${entry.durationMs} ms`}
									</td>
									<td className="px-3 py-3 font-mono text-[10px] text-stone-500">{entry.attempt}</td>
									<td className="px-3 py-3">{entry.status === 'ERROR' && entry.lead && <RetryLeadButton leadId={entry.lead.id} />}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
