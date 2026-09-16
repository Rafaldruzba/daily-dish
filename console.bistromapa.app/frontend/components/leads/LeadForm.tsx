'use client'

import { AlertTriangle, Loader2, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { LEAD_SOURCES } from '@/lib/constants'
import type { DuplicateMatch } from '@/types'

interface FormState {
	name: string
	city: string
	address: string
	phone: string
	email: string
	website: string
	nip: string
	category: string
	contactPerson: string
	source: string
	notes: string
}

const EMPTY: FormState = {
	name: '',
	city: '',
	address: '',
	phone: '',
	email: '',
	website: '',
	nip: '',
	category: '',
	contactPerson: '',
	source: 'MANUAL',
	notes: '',
}

export function LeadForm() {
	const router = useRouter()
	const [form, setForm] = useState<FormState>(EMPTY)
	const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([])
	const [error, setError] = useState<string | null>(null)
	const [checking, setChecking] = useState(false)
	const [saving, setSaving] = useState(false)

	const set = (key: keyof FormState) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
		setForm((current) => ({ ...current, [key]: event.target.value }))

	function payload() {
		// Puste pola nie lecą do API — walidacja DTO odrzuca np. pusty email.
		return Object.fromEntries(Object.entries(form).filter(([, value]) => value.trim() !== ''))
	}

	async function checkDuplicates() {
		if (!form.name.trim() || !form.city.trim()) {
			setError('Podaj nazwę i miasto, żeby sprawdzić duplikaty')
			return
		}

		setChecking(true)
		setError(null)

		try {
			const search = new URLSearchParams({ name: form.name, city: form.city })
			if (form.phone) search.set('phone', form.phone)
			if (form.email) search.set('email', form.email)
			if (form.website) search.set('website', form.website)
			if (form.nip) search.set('nip', form.nip)

			const response = await fetch(`/api/leads/duplicates?${search.toString()}`)
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się sprawdzić duplikatów')
				return
			}

			setDuplicates(body.data as DuplicateMatch[])
		} finally {
			setChecking(false)
		}
	}

	async function save(force: boolean) {
		setSaving(true)
		setError(null)

		try {
			const response = await fetch('/api/leads', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ ...payload(), force }),
			})
			const body = await response.json().catch(() => null)

			// 409 = backend znalazł duplikaty i czeka na decyzję (readme §16).
			if (response.status === 409) {
				setDuplicates((body?.error?.details?.duplicates ?? []) as DuplicateMatch[])
				return
			}

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się zapisać leada')
				return
			}

			router.push(`/leads/${body.data.lead.id}`)
			router.refresh()
		} finally {
			setSaving(false)
		}
	}

	return (
		<form
			onSubmit={(event) => {
				event.preventDefault()
				void save(false)
			}}
			className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3"
		>
			<div className="card lg:col-span-2">
				<h2 className="label-mono">Dane restauracji</h2>

				<div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
					<Field label="Nazwa restauracji" required>
						<input required value={form.name} onChange={set('name')} className="field mt-1" />
					</Field>
					<Field label="Miasto" required>
						<input required value={form.city} onChange={set('city')} className="field mt-1" />
					</Field>
					<Field label="Adres">
						<input value={form.address} onChange={set('address')} className="field mt-1" />
					</Field>
					<Field label="Telefon">
						<input value={form.phone} onChange={set('phone')} className="field mt-1" />
					</Field>
					<Field label="Email">
						<input type="email" value={form.email} onChange={set('email')} className="field mt-1" />
					</Field>
					<Field label="Strona WWW">
						<input value={form.website} onChange={set('website')} className="field mt-1" />
					</Field>
					<Field label="NIP">
						<input value={form.nip} onChange={set('nip')} className="field mt-1" />
					</Field>
					<Field label="Kategoria">
						<input value={form.category} onChange={set('category')} className="field mt-1" placeholder="pizzeria, sushi…" />
					</Field>
					<Field label="Osoba kontaktowa">
						<input value={form.contactPerson} onChange={set('contactPerson')} className="field mt-1" />
					</Field>
					<Field label="Źródło">
						<select value={form.source} onChange={set('source')} className="field mt-1">
							{LEAD_SOURCES.map((source) => (
								<option key={source} value={source}>
									{source}
								</option>
							))}
						</select>
					</Field>
				</div>

				<div className="mt-4">
					<Field label="Notatka">
						<textarea rows={4} value={form.notes} onChange={set('notes')} className="field mt-1" />
					</Field>
				</div>
			</div>

			<div className="space-y-4">
				<div className="card">
					<h2 className="label-mono">Zapisz</h2>
					<p className="mt-2 text-sm text-stone-500">
						Przed zapisem sprawdzamy duplikaty. Nic nie trafi do bazy bez Twojej decyzji.
					</p>

					{error && (
						<p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-red-700">
							{error}
						</p>
					)}

					<div className="mt-4 flex flex-col gap-2">
						<button type="submit" disabled={saving} className="btn-primary justify-center">
							{saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
							Zapisz leada
						</button>
						<button type="button" onClick={() => void checkDuplicates()} disabled={checking} className="btn-secondary justify-center">
							<Search className="h-3.5 w-3.5" aria-hidden />
							{checking ? 'Sprawdzanie…' : 'Sprawdź duplikaty'}
						</button>
					</div>
				</div>

				{duplicates.length > 0 && (
					<div className="card border-amber-300 bg-amber-50">
						<h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-amber-800">
							<AlertTriangle className="h-4 w-4" aria-hidden />
							Możliwe duplikaty
						</h2>

						<ul className="mt-3 space-y-3">
							{duplicates.map((duplicate) => (
								<li key={duplicate.id} className="border border-amber-200 bg-white p-3">
									<Link href={`/leads/${duplicate.id}`} className="text-sm font-bold hover:underline">
										{duplicate.name}
									</Link>
									<p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
										{duplicate.city}
										{duplicate.phone ? ` · ${duplicate.phone}` : ''}
									</p>
									<p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-amber-700">
										Zgodne: {duplicate.reasons.join(', ')}
									</p>
									<Link href={`/leads/${duplicate.id}`} className="mt-2 inline-block font-mono text-[10px] uppercase tracking-widest text-stone-500 underline">
										Otwórz i scal
									</Link>
								</li>
							))}
						</ul>

						<div className="mt-4 flex flex-col gap-2">
							<button type="button" onClick={() => void save(true)} disabled={saving} className="btn-primary justify-center">
								Dodaj mimo wszystko
							</button>
							<Link href="/leads" className="btn-secondary justify-center">
								Pomiń
							</Link>
						</div>
					</div>
				)}
			</div>
		</form>
	)
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
	return (
		<div>
			<span className="label-mono">
				{label}
				{required && <span className="ml-1 text-red-600">*</span>}
			</span>
			{children}
		</div>
	)
}
