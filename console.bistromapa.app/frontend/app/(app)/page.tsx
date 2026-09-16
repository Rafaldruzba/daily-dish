import { Phone } from 'lucide-react'
import Link from 'next/link'

import { PageHeader, SectionCard, StatCard, StatusBadge } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { DashboardStats } from '@/types'

export default async function DashboardPage() {
	const stats = await fetchOrLogin<DashboardStats>('/stats')

	const { leads, followUps, onboarding } = stats
	const status = (key: string) => leads.byStatus[key] ?? 0

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Dashboard"
				subtitle={`Leady: ${leads.total}`}
				action={
					<Link href="/leads/new" className="btn-primary">
						Dodaj leada
					</Link>
				}
			/>

			<div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
				<StatCard label="Wszystkie leady" value={leads.total} />
				<StatCard label="Nowe" value={status('NEW')} />
				<StatCard label="Do kontaktu" value={status('CONTACTED') + status('CALL_BACK')} />
				<StatCard label="Zainteresowani" value={status('INTERESTED')} tone="good" />
				<StatCard label="Zaakceptowani" value={status('ACCEPTED')} tone="good" />
				<StatCard label="Odrzuceni" value={status('DECLINED')} />
				<StatCard label="Follow-up dzisiaj" value={followUps.today} />
				<StatCard label="Zaległe follow-upy" value={followUps.overdue} tone={followUps.overdue > 0 ? 'danger' : 'default'} />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
				<StatCard label="Konta oczekujące na utworzenie" value={onboarding.pending} />
				<StatCard
					label="Błędy automatyzacji"
					value={onboarding.errors}
					tone={onboarding.errors > 0 ? 'danger' : 'default'}
				/>
				<StatCard label="Follow-upy w tym tygodniu" value={followUps.upcoming} />
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard
					title="Follow-up dzisiaj"
					action={
						<Link href="/leads?followUp=today" className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900">
							Wszystkie
						</Link>
					}
				>
					{stats.todayFollowUps.length === 0 ? (
						<p className="py-4 text-sm text-stone-400">Brak follow-upów na dziś.</p>
					) : (
						<ul className="divide-y divide-stone-100">
							{stats.todayFollowUps.map((item) => (
								<li key={item.id} className="flex items-center justify-between gap-3 py-3">
									<div className="min-w-0">
										<Link href={`/leads/${item.lead?.id}`} className="truncate text-sm font-bold hover:underline">
											{item.lead?.name}
										</Link>
										<p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
											{item.lead?.city} · {formatDateTime(item.scheduledAt)}
										</p>
									</div>
									{item.lead?.phone && (
										<a href={`tel:${item.lead.phone}`} className="btn-secondary shrink-0 px-2 py-1">
											<Phone className="h-3.5 w-3.5" aria-hidden />
											Zadzwoń
										</a>
									)}
								</li>
							))}
						</ul>
					)}
				</SectionCard>

				<SectionCard
					title="Zaległe follow-upy"
					action={
						<Link href="/leads?followUp=overdue" className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900">
							Wszystkie
						</Link>
					}
				>
					{stats.overdueFollowUps.length === 0 ? (
						<p className="py-4 text-sm text-stone-400">Nic nie zalega.</p>
					) : (
						<ul className="divide-y divide-stone-100">
							{stats.overdueFollowUps.map((item) => (
								<li key={item.id} className="flex items-center justify-between gap-3 py-3">
									<div className="min-w-0">
										<Link href={`/leads/${item.lead?.id}`} className="truncate text-sm font-bold hover:underline">
											{item.lead?.name}
										</Link>
										<p className="font-mono text-[10px] uppercase tracking-wider text-red-600">
											Termin: {formatDateTime(item.scheduledAt)}
										</p>
									</div>
									{item.lead?.phone && (
										<a href={`tel:${item.lead.phone}`} className="btn-secondary shrink-0 px-2 py-1">
											<Phone className="h-3.5 w-3.5" aria-hidden />
											Zadzwoń
										</a>
									)}
								</li>
							))}
						</ul>
					)}
				</SectionCard>
			</div>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<SectionCard title="Ostatnie leady">
					{stats.recentLeads.length === 0 ? (
						<p className="py-4 text-sm text-stone-400">Baza jest pusta — dodaj pierwszego leada.</p>
					) : (
						<ul className="divide-y divide-stone-100">
							{stats.recentLeads.map((lead) => (
								<li key={lead.id} className="flex items-center justify-between gap-3 py-3">
									<div className="min-w-0">
										<Link href={`/leads/${lead.id}`} className="truncate text-sm font-bold hover:underline">
											{lead.name}
										</Link>
										<p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
											{lead.city} · {lead.source}
										</p>
									</div>
									<StatusBadge status={lead.status} />
								</li>
							))}
						</ul>
					)}
				</SectionCard>

				<SectionCard title="Ostatnie kontakty">
					{stats.recentInteractions.length === 0 ? (
						<p className="py-4 text-sm text-stone-400">Brak zapisanych kontaktów.</p>
					) : (
						<ul className="divide-y divide-stone-100">
							{stats.recentInteractions.map((interaction) => (
								<li key={interaction.id} className="py-3">
									<p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
										{interaction.type} · {formatDateTime(interaction.createdAt)}
									</p>
									<Link href={`/leads/${interaction.lead.id}`} className="text-sm font-bold hover:underline">
										{interaction.lead.name}
									</Link>
									{interaction.content && (
										<p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{interaction.content}</p>
									)}
								</li>
							))}
						</ul>
					)}
				</SectionCard>
			</div>
		</div>
	)
}
