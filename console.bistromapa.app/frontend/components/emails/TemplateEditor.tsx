'use client'

import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

import type { EmailTemplate } from '@/types'

export function TemplateEditor({ template }: { template: EmailTemplate }) {
	const [subject, setSubject] = useState(template.subject)
	const [body, setBody] = useState(template.body)
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

	async function save() {
		setBusy(true)
		setMessage(null)

		try {
			const response = await fetch(`/api/email/templates/${template.id}`, {
				method: 'PUT',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ subject, body }),
			})
			const payload = await response.json().catch(() => null)

			if (!response.ok || payload?.success !== true) {
				setMessage({ tone: 'error', text: payload?.error?.message ?? 'Nie udało się zapisać szablonu' })
				return
			}

			setMessage({ tone: 'ok', text: 'Zapisano' })
		} finally {
			setBusy(false)
		}
	}

	return (
		<section className="card">
			<div className="flex items-center justify-between">
				<h2 className="label-mono">
					{template.name} <span className="text-stone-300">({template.key})</span>
				</h2>
				{message && (
					<span className={`font-mono text-[10px] uppercase tracking-wider ${message.tone === 'ok' ? 'text-emerald-700' : 'text-red-600'}`}>
						{message.text}
					</span>
				)}
			</div>

			<input value={subject} onChange={(event) => setSubject(event.target.value)} className="field mt-4 font-medium" />

			<textarea rows={10} value={body} onChange={(event) => setBody(event.target.value)} className="field mt-3 font-mono text-xs" />

			<p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-stone-400">
				Zmienne: {'{{name}}'} {'{{city}}'} {'{{address}}'} {'{{phone}}'} {'{{contactPerson}}'} {'{{website}}'} {'{{activationUrl}}'}
			</p>

			<button type="button" disabled={busy} onClick={() => void save()} className="btn-primary mt-3">
				{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
				Zapisz szablon
			</button>
		</section>
	)
}
