'use client'

import { Loader2, Play, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import type { CampaignJobStatus } from '@/types'

export function JobActions({ jobId, status }: { jobId: string; status: CampaignJobStatus }) {
	const router = useRouter()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function run(path: string) {
		setBusy(true)
		setError(null)

		try {
			const response = await fetch(path, { method: 'POST' })
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się uruchomić zadania')
				return
			}

			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="flex flex-col gap-1">
			<div className="flex gap-2">
				{(status === 'PENDING' || status === 'ERROR') && (
					<button type="button" disabled={busy} onClick={() => void run(`/api/campaign-jobs/${jobId}/${status === 'ERROR' ? 'retry' : 'run'}`)} className="btn-secondary px-2 py-1">
						{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : status === 'ERROR' ? <RotateCcw className="h-3.5 w-3.5" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
						{status === 'ERROR' ? 'Ponów' : 'Uruchom'}
					</button>
				)}
				{status === 'COMPLETED' && (
					<button type="button" disabled={busy} onClick={() => void run(`/api/campaign-jobs/${jobId}/retry`)} className="btn-secondary px-2 py-1">
						<RotateCcw className="h-3.5 w-3.5" aria-hidden />
						Powtórz
					</button>
				)}
			</div>
			{error && <p className="font-mono text-[10px] uppercase tracking-wider text-red-600">{error}</p>}
		</div>
	)
}

export function RunCampaignButton({ campaignId }: { campaignId: string }) {
	const router = useRouter()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function run() {
		setBusy(true)
		setError(null)

		try {
			const response = await fetch(`/api/campaigns/${campaignId}/run`, { method: 'POST' })
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się uruchomić kampanii')
				return
			}

			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div>
			<button type="button" disabled={busy} onClick={() => void run()} className="btn-primary">
				{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
				Uruchom oczekujące zadania
			</button>
			{error && <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-red-600">{error}</p>}
		</div>
	)
}
