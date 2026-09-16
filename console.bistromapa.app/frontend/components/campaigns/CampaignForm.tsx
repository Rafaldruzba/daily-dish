'use client'

import { Loader2, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function CampaignForm() {
	const router = useRouter()
	const [name, setName] = useState('')
	const [region, setRegion] = useState('')
	const [category, setCategory] = useState('')
	const [search, setSearch] = useState('')
	const [cities, setCities] = useState('')
	const [limitPerJob, setLimitPerJob] = useState(50)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function submit(event: React.FormEvent) {
		event.preventDefault()
		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/campaigns', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					name,
					...(region.trim() ? { region } : {}),
					...(category.trim() ? { category } : {}),
					...(search.trim() ? { search } : {}),
					limitPerJob,
					cities: cities
						.split('\n')
						.map((city) => city.trim())
						.filter(Boolean),
				}),
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się utworzyć kampanii')
				return
			}

			router.push(`/campaigns/${body.data.id}`)
			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
			<div className="card space-y-4 lg:col-span-2">
				<h2 className="label-mono">Zakres kampanii</h2>

				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div>
						<label htmlFor="name" className="label-mono">
							Nazwa kampanii *
						</label>
						<input id="name" required value={name} onChange={(event) => setName(event.target.value)} className="field mt-1" placeholder="Pizzerie — Mazowieckie" />
					</div>
					<div>
						<label htmlFor="region" className="label-mono">
							Region
						</label>
						<input id="region" value={region} onChange={(event) => setRegion(event.target.value)} className="field mt-1" placeholder="Mazowieckie" />
					</div>
					<div>
						<label htmlFor="category" className="label-mono">
							Kategoria
						</label>
						<input id="category" value={category} onChange={(event) => setCategory(event.target.value)} className="field mt-1" placeholder="pizzeria" />
					</div>
					<div>
						<label htmlFor="search" className="label-mono">
							Fraza (opcjonalnie)
						</label>
						<input id="search" value={search} onChange={(event) => setSearch(event.target.value)} className="field mt-1" placeholder="pizza na wynos" />
					</div>
					<div>
						<label htmlFor="limit" className="label-mono">
							Limit na zadanie
						</label>
						<input
							id="limit"
							type="number"
							min={1}
							max={200}
							value={limitPerJob}
							onChange={(event) => setLimitPerJob(Number(event.target.value))}
							className="field mt-1"
						/>
					</div>
				</div>

				<div>
					<label htmlFor="cities" className="label-mono">
						Miasta — jedno na linię *
					</label>
					<textarea
						id="cities"
						required
						rows={8}
						value={cities}
						onChange={(event) => setCities(event.target.value)}
						className="field mt-1"
						placeholder={'Warszawa\nPiaseczno\nPruszków'}
					/>
					<p className="mt-2 text-sm text-stone-500">
						Każde miasto to osobne zadanie — kampanię można wznowić po błędzie, bez powtarzania całej pracy.
						Dla „całej Polski” wklej listę miast do oblecenia.
					</p>
				</div>
			</div>

			<div className="space-y-4">
				<div className="card">
					<h2 className="label-mono">Start</h2>
					<p className="mt-2 text-sm text-stone-500">
						Kampania powstaje w statusie RUNNING. Uruchomienie zadań robisz z jej szczegółów.
					</p>

					{error && (
						<p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-red-700">
							{error}
						</p>
					)}

					<button type="submit" disabled={busy} className="btn-primary mt-4 w-full justify-center">
						{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Play className="h-3.5 w-3.5" aria-hidden />}
						Utwórz kampanię
					</button>
				</div>
			</div>
		</form>
	)
}
