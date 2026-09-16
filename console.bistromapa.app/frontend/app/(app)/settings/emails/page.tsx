import Link from 'next/link'

import { TemplateEditor } from '@/components/emails/TemplateEditor'
import { PageHeader } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { EmailLogEntry, EmailTemplate, Paginated } from '@/types'

export default async function EmailSettingsPage() {
	const [templates, logs] = await Promise.all([
		fetchOrLogin<EmailTemplate[]>('/email/templates'),
		fetchOrLogin<Paginated<EmailLogEntry>>('/email/logs?limit=20'),
	])

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Szablony emaili"
				subtitle="Treści trzymamy w bazie — nic nie jest zahardkodowane w komponentach"
				action={
					<Link href="/settings" className="btn-secondary">
						← Ustawienia
					</Link>
				}
			/>

			{templates.length === 0 && (
				<p className="mt-6 card text-sm text-stone-500">
					Brak szablonów. Uruchom <code className="bg-stone-100 px-1">npm run seed</code> w backendzie, żeby załadować domyślne.
				</p>
			)}

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				{templates.map((template) => (
					<TemplateEditor key={template.id} template={template} />
				))}
			</div>

			<section className="card mt-6">
				<h2 className="label-mono">Ostatnie wysyłki ({logs.total})</h2>

				<div className="mt-4 overflow-x-auto">
					<table className="w-full min-w-[700px] border-collapse text-sm">
						<thead>
							<tr className="border-b border-stone-200">
								{['Data', 'Do', 'Temat', 'Lead', 'Status', 'Błąd'].map((label) => (
									<th key={label} className="px-3 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-stone-400">
										{label}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{logs.items.length === 0 && (
								<tr>
									<td colSpan={6} className="px-3 py-10 text-center text-sm text-stone-400">
										Nic jeszcze nie wysłano.
									</td>
								</tr>
							)}

							{logs.items.map((log) => (
								<tr key={log.id} className="border-b border-stone-100">
									<td className="px-3 py-3 whitespace-nowrap font-mono text-[10px] uppercase tracking-wider text-stone-500">
										{formatDateTime(log.sentAt)}
									</td>
									<td className="px-3 py-3 text-stone-600">{log.to}</td>
									<td className="px-3 py-3 text-stone-600">{log.subject}</td>
									<td className="px-3 py-3">
										{log.lead ? (
											<Link href={`/leads/${log.lead.id}`} className="hover:underline">
												{log.lead.name}
											</Link>
										) : (
											<span className="text-stone-300">—</span>
										)}
									</td>
									<td className={`px-3 py-3 font-mono text-[10px] uppercase tracking-wider ${log.status === 'ERROR' ? 'text-red-600' : 'text-emerald-700'}`}>
										{log.status}
									</td>
									<td className="max-w-[280px] px-3 py-3 text-xs text-red-600">{log.error ?? '—'}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	)
}
