'use client'

import { Loader2, RotateCcw, Zap } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function RunCycleButton() {
	const router = useRouter()
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<string | null>(null)

	async function run() {
		setBusy(true)
		setMessage(null)

		try {
			const response = await fetch('/api/automation/run', { method: 'POST' })
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setMessage(body?.error?.message ?? 'Nie udało się uruchomić cyklu')
				return
			}

			setMessage(`Przetworzono ${body.data.processed} leadów`)
			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div>
			<button type="button" disabled={busy} onClick={() => void run()} className="btn-primary">
				{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Zap className="h-3.5 w-3.5" aria-hidden />}
				Uruchom cykl teraz
			</button>
			{message && <p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-stone-500">{message}</p>}
		</div>
	)
}

export function RetryLeadButton({ leadId }: { leadId: string }) {
	const router = useRouter()
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function retry() {
		setBusy(true)
		setError(null)

		try {
			const response = await fetch(`/api/automation/${leadId}/retry`, { method: 'POST' })
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Ponowienie nie powiodło się')
				return
			}

			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div>
			<button type="button" disabled={busy} onClick={() => void retry()} className="btn-secondary px-2 py-1">
				{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <RotateCcw className="h-3.5 w-3.5" aria-hidden />}
				Ponów
			</button>
			{error && <p className="mt-1 max-w-[200px] font-mono text-[10px] uppercase tracking-wider text-red-600">{error}</p>}
		</div>
	)
}
