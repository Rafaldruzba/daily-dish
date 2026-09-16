'use client'

import { Loader2, LockKeyhole } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function LoginForm({ next }: { next: string }) {
	const router = useRouter()
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState<string | null>(null)
	const [pending, setPending] = useState(false)

	async function submit(event: React.FormEvent<HTMLFormElement>) {
		event.preventDefault()
		setError(null)
		setPending(true)

		try {
			const response = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ email, password }),
			})
			const payload = await response.json().catch(() => null)

			if (!response.ok || payload?.success !== true) {
				setError(payload?.error?.message ?? 'Nie udało się zalogować')
				return
			}

			router.replace(next)
			router.refresh()
		} catch {
			setError('Brak połączenia z API')
		} finally {
			setPending(false)
		}
	}

	return (
		<main className="flex min-h-screen items-center justify-center bg-[#fdfdfd] p-6">
			<form onSubmit={submit} className="w-full max-w-sm border border-stone-200 bg-white p-8 shadow-sm">
				<div className="flex items-center gap-2">
					<LockKeyhole className="h-4 w-4 text-stone-400" aria-hidden />
					<span className="font-mono text-xs uppercase tracking-widest text-stone-400">Dostęp tylko dla obsługi</span>
				</div>

				<h1 className="mt-3 font-serif text-3xl font-black tracking-tight">
					BistroMapa
					<span className="ml-2 font-mono text-xs uppercase tracking-widest text-stone-400">Console</span>
				</h1>

				<div className="mt-8 space-y-4">
					<div>
						<label htmlFor="email" className="label-mono">
							Email
						</label>
						<input
							id="email"
							type="email"
							autoComplete="username"
							required
							value={email}
							onChange={(event) => setEmail(event.target.value)}
							className="field mt-1"
						/>
					</div>

					<div>
						<label htmlFor="password" className="label-mono">
							Hasło
						</label>
						<input
							id="password"
							type="password"
							autoComplete="current-password"
							required
							value={password}
							onChange={(event) => setPassword(event.target.value)}
							className="field mt-1"
						/>
					</div>
				</div>

				{error && (
					<p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs uppercase tracking-wider text-red-700">
						{error}
					</p>
				)}

				<button type="submit" disabled={pending} className="btn-primary mt-6 w-full justify-center">
					{pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
					{pending ? 'Logowanie…' : 'Zaloguj się'}
				</button>
			</form>
		</main>
	)
}
