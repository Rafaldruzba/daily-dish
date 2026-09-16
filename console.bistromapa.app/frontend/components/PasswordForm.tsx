'use client'

import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

export function PasswordForm() {
	const [currentPassword, setCurrentPassword] = useState('')
	const [newPassword, setNewPassword] = useState('')
	const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)
	const [busy, setBusy] = useState(false)

	async function submit(event: React.FormEvent) {
		event.preventDefault()
		setBusy(true)
		setMessage(null)

		try {
			const response = await fetch('/api/auth/password', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ currentPassword, newPassword }),
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setMessage({ tone: 'error', text: body?.error?.message ?? 'Nie udało się zmienić hasła' })
				return
			}

			setCurrentPassword('')
			setNewPassword('')
			setMessage({ tone: 'ok', text: 'Hasło zmienione' })
		} finally {
			setBusy(false)
		}
	}

	return (
		<form onSubmit={submit} className="card">
			<h2 className="label-mono">Zmiana hasła</h2>

			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
				<div>
					<label htmlFor="currentPassword" className="label-mono">
						Obecne hasło
					</label>
					<input
						id="currentPassword"
						type="password"
						required
						value={currentPassword}
						onChange={(event) => setCurrentPassword(event.target.value)}
						className="field mt-1"
					/>
				</div>
				<div>
					<label htmlFor="newPassword" className="label-mono">
						Nowe hasło (min. 12 znaków)
					</label>
					<input
						id="newPassword"
						type="password"
						required
						minLength={12}
						value={newPassword}
						onChange={(event) => setNewPassword(event.target.value)}
						className="field mt-1"
					/>
				</div>
			</div>

			{message && (
				<p
					className={`mt-3 border px-3 py-2 font-mono text-[10px] uppercase tracking-wider ${
						message.tone === 'ok'
							? 'border-emerald-200 bg-emerald-50 text-emerald-700'
							: 'border-red-200 bg-red-50 text-red-700'
					}`}
				>
					{message.text}
				</p>
			)}

			<button type="submit" disabled={busy} className="btn-primary mt-4">
				{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
				Zmień hasło
			</button>
		</form>
	)
}
