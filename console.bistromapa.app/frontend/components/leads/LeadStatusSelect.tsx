'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

import { LEAD_STATUSES } from '@/lib/constants'
import { STATUS_LABEL } from '@/lib/format'
import type { LeadStatus } from '@/types'

/** Szybka zmiana statusu z listy (readme §12) — bez wchodzenia w szczegóły. */
export function LeadStatusSelect({ leadId, status }: { leadId: string; status: LeadStatus }) {
	const router = useRouter()
	const [pending, startTransition] = useTransition()
	const [value, setValue] = useState<LeadStatus>(status)
	const [error, setError] = useState<string | null>(null)

	async function change(next: LeadStatus) {
		const previous = value
		setValue(next)
		setError(null)

		const response = await fetch(`/api/leads/${leadId}/status`, {
			method: 'PUT',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ status: next }),
		})
		const payload = await response.json().catch(() => null)

		if (!response.ok || payload?.success !== true) {
			setValue(previous)
			setError(payload?.error?.message ?? 'Nie udało się zmienić statusu')
			return
		}

		startTransition(() => router.refresh())
	}

	return (
		<div>
			<select
				aria-label="Zmień status"
				value={value}
				disabled={pending}
				onChange={(event) => void change(event.target.value as LeadStatus)}
				className="border border-stone-200 bg-white px-2 py-1 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50"
			>
				{LEAD_STATUSES.map((option) => (
					<option key={option} value={option}>
						{STATUS_LABEL[option]}
					</option>
				))}
			</select>
			{error && <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-red-600">{error}</p>}
		</div>
	)
}
