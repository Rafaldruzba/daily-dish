import type { ReactNode } from 'react'

import { STATUS_DOT, STATUS_LABEL } from '@/lib/format'
import type { LeadStatus } from '@/types'

export function PageHeader({
	title,
	subtitle,
	action,
}: {
	title: string
	subtitle?: string
	action?: ReactNode
}) {
	return (
		<header className="flex flex-wrap items-end justify-between gap-4 border-b border-stone-200 pb-5">
			<div>
				<h1 className="font-serif text-3xl font-black tracking-tight">{title}</h1>
				{subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
			</div>
			{action}
		</header>
	)
}

export function StatCard({
	label,
	value,
	hint,
	tone = 'default',
}: {
	label: string
	value: number | string
	hint?: string
	tone?: 'default' | 'warn' | 'danger' | 'good'
}) {
	const toneClass =
		tone === 'danger' ? 'text-red-600' : tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-700' : 'text-stone-900'

	return (
		<div className="card">
			<h2 className="label-mono">{label}</h2>
			<p className={`mt-2 font-serif text-3xl font-black ${toneClass}`}>{value}</p>
			{hint && <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">{hint}</p>}
		</div>
	)
}

export function StatusBadge({ status }: { status: LeadStatus }) {
	return (
		<span className="inline-flex items-center gap-2 whitespace-nowrap border border-stone-200 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-wider">
			<span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
			{STATUS_LABEL[status]}
		</span>
	)
}

export function EmptyState({ children }: { children: ReactNode }) {
	return <p className="py-6 text-sm text-stone-400">{children}</p>
}

export function SectionCard({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
	return (
		<section className="card">
			<div className="flex items-center justify-between">
				<h2 className="label-mono">{title}</h2>
				{action}
			</div>
			<div className="mt-4">{children}</div>
		</section>
	)
}
