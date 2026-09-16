'use client'

import { AlertTriangle, Check, FileUp, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { LEAD_SOURCES } from '@/lib/constants'
import type { ImportPreview, ImportTargetField } from '@/types'

const FIELD_LABELS: Record<ImportTargetField, string> = {
	name: 'Nazwa restauracji',
	city: 'Miasto',
	address: 'Adres',
	phone: 'Telefon',
	email: 'Email',
	website: 'Strona WWW',
	nip: 'NIP',
	category: 'Kategoria',
	contactPerson: 'Osoba kontaktowa',
	notes: 'Notatka',
}

const FIELDS = Object.keys(FIELD_LABELS) as ImportTargetField[]

export function ImportWizard() {
	const router = useRouter()
	const [preview, setPreview] = useState<ImportPreview | null>(null)
	const [mapping, setMapping] = useState<Record<string, string | null>>({})
	const [force, setForce] = useState(false)
	const [source, setSource] = useState('CSV')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [result, setResult] = useState<{ created: number; skipped: number; failed: number } | null>(null)

	async function upload(file: File) {
		setBusy(true)
		setError(null)
		setResult(null)

		try {
			const formData = new FormData()
			formData.append('file', file)

			const response = await fetch('/api/import/preview', { method: 'POST', body: formData })
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się odczytać pliku')
				return
			}

			const data = body.data as ImportPreview
			setPreview(data)
			setMapping(data.mapping)
		} finally {
			setBusy(false)
		}
	}

	async function commit() {
		if (!preview) return

		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/import/commit', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ importId: preview.importId, mapping, force, source }),
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Import nie powiódł się')
				return
			}

			setResult(body.data as { created: number; skipped: number; failed: number })
			setPreview(null)
			router.refresh()
		} finally {
			setBusy(false)
		}
	}

	return (
		<div className="mt-6 space-y-6">
			<section className="card">
				<h2 className="label-mono">1. Wgraj plik CSV lub XLSX</h2>
				<p className="mt-2 text-sm text-stone-500">
					Nic nie trafia do bazy na tym etapie — najpierw zobaczysz podgląd, mapowanie kolumn i duplikaty.
				</p>

				<label className="mt-4 flex cursor-pointer items-center gap-2 border border-dashed border-stone-300 px-4 py-6 text-sm text-stone-500 transition hover:border-stone-900">
					<FileUp className="h-4 w-4" aria-hidden />
					{busy ? 'Przetwarzanie…' : 'Wybierz plik .csv / .xlsx'}
					<input
						type="file"
						accept=".csv,.xlsx,.xls"
						className="hidden"
						onChange={(event) => {
							const file = event.target.files?.[0]
							if (file) void upload(file)
						}}
					/>
				</label>

				{error && (
					<p className="mt-3 border border-red-200 bg-red-50 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-red-700">
						{error}
					</p>
				)}

				{result && (
					<div className="mt-3 border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
						Zaimportowano {result.created}, pominięto duplikaty: {result.skipped}, błędne wiersze: {result.failed}.{' '}
						<Link href="/leads" className="underline">
							Zobacz leady
						</Link>
					</div>
				)}
			</section>

			{preview && (
				<>
					<section className="card">
						<h2 className="label-mono">2. Mapowanie kolumn</h2>
						<p className="mt-2 text-sm text-stone-500">
							Wykryliśmy {preview.totalRows} wierszy, {preview.validRows} poprawnych. Popraw mapowanie, jeśli coś się nie zgadza.
						</p>

						<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
							{FIELDS.map((field) => (
								<div key={field}>
									<span className="label-mono">{FIELD_LABELS[field]}</span>
									<select
										value={mapping[field] ?? ''}
										onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value || null }))}
										className="field mt-1"
									>
										<option value="">— pomiń —</option>
										{preview.headers.map((header) => (
											<option key={header} value={header}>
												{header}
											</option>
										))}
									</select>
								</div>
							))}
						</div>
					</section>

					<section className="card">
						<h2 className="label-mono">3. Podgląd danych</h2>
						<div className="mt-4 overflow-x-auto">
							<table className="w-full min-w-[700px] border-collapse text-xs">
								<thead>
									<tr className="border-b border-stone-200">
										{preview.headers.map((header) => (
											<th key={header} className="px-2 py-2 text-left font-mono text-[10px] uppercase tracking-widest text-stone-400">
												{header}
											</th>
										))}
									</tr>
								</thead>
								<tbody>
									{preview.sampleRows.map((row, index) => (
										<tr key={index} className="border-b border-stone-100">
											{preview.headers.map((header) => (
												<td key={header} className="px-2 py-2 text-stone-600">
													{row[header]}
												</td>
											))}
										</tr>
									))}
								</tbody>
							</table>
						</div>
					</section>

					<section className="card">
						<h2 className="label-mono">4. Walidacja i duplikaty</h2>

						<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
							<p className="font-mono text-xs uppercase tracking-wider text-stone-500">
								Wiersze: <strong className="text-stone-900">{preview.totalRows}</strong>
							</p>
							<p className="font-mono text-xs uppercase tracking-wider text-stone-500">
								Błędne: <strong className="text-red-600">{preview.issues.length}</strong>
							</p>
							<p className="font-mono text-xs uppercase tracking-wider text-stone-500">
								Duplikaty: <strong className="text-amber-600">{preview.duplicates.length}</strong>
							</p>
						</div>

						{preview.issues.length > 0 && (
							<ul className="mt-4 max-h-48 space-y-1 overflow-y-auto border border-red-100 bg-red-50 p-3">
								{preview.issues.slice(0, 50).map((issue) => (
									<li key={issue.row} className="font-mono text-[10px] uppercase tracking-wider text-red-700">
										Wiersz {issue.row}: {issue.errors.join(', ')}
									</li>
								))}
							</ul>
						)}

						{preview.duplicates.length > 0 && (
							<div className="mt-4 border border-amber-200 bg-amber-50 p-3">
								<p className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-amber-800">
									<AlertTriangle className="h-3.5 w-3.5" aria-hidden />
									Możliwe duplikaty (pierwsze 50)
								</p>
								<ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
									{preview.duplicates.slice(0, 50).map((duplicate, index) => (
										<li key={index} className="font-mono text-[10px] uppercase tracking-wider text-stone-600">
											{duplicate.name} ({duplicate.city}) → już istnieje jako „{duplicate.duplicateOf}” [{duplicate.reasons.join(', ')}]
										</li>
									))}
								</ul>
							</div>
						)}

						{preview.truncated && (
							<p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-stone-400">
								Plik jest duży — duplikaty sprawdziliśmy dla pierwszych 500 wierszy; przy imporcie każdy wiersz i tak jest weryfikowany.
							</p>
						)}

						<div className="mt-5 flex flex-wrap items-center gap-4">
							<label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-stone-600">
								<input type="checkbox" checked={force} onChange={(event) => setForce(event.target.checked)} />
								Dodaj mimo duplikatów
							</label>

							<label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-stone-600">
								Źródło
								<select value={source} onChange={(event) => setSource(event.target.value)} className="border border-stone-300 bg-white px-2 py-1">
									{LEAD_SOURCES.map((option) => (
										<option key={option} value={option}>
											{option}
										</option>
									))}
								</select>
							</label>

							<button type="button" onClick={() => void commit()} disabled={busy} className="btn-primary">
								{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
								Importuj {preview.totalRows} wierszy
							</button>

							<button type="button" onClick={() => setPreview(null)} className="btn-secondary">
								Anuluj
							</button>
						</div>
					</section>
				</>
			)}
		</div>
	)
}
