'use client'

import {
	AlertTriangle,
	Check,
	Clock,
	Flag,
	Loader2,
	Mail,
	MessageSquare,
	Phone,
	Scale,
	Star,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

import { CONSENT_STATUSES, INTERACTION_TYPES, LEAD_STATUSES } from '@/lib/constants'
import {
	CONSENT_LABEL,
	ONBOARDING_LABEL,
	STATUS_DOT,
	STATUS_LABEL,
	formatDateTime,
	toDateTimeLocal,
} from '@/lib/format'
import { SendEmailPanel } from './SendEmailPanel'
import type { DuplicateMatch, Interaction, InteractionType, LeadDetail, LeadStatus, OnboardingStatus } from '@/types'

const ONBOARDING_STEPS: OnboardingStatus[] = [
	'NOT_STARTED',
	'CREATE_QUEUED',
	'ACCOUNT_CREATED',
	'INVITATION_SENT',
	'ACTIVATED',
]

export function LeadDetailView({ lead }: { lead: LeadDetail }) {
	const router = useRouter()
	const [panel, setPanel] = useState<'status' | 'followUp' | 'consent' | 'merge' | 'email' | null>(null)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function call(path: string, init: RequestInit): Promise<boolean> {
		setBusy(true)
		setError(null)

		try {
			const response = await fetch(path, {
				headers: { 'content-type': 'application/json' },
				...init,
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Operacja nie powiodła się')
				return false
			}

			router.refresh()
			return true
		} finally {
			setBusy(false)
		}
	}

	const toggle = (next: typeof panel) => setPanel((current) => (current === next ? null : next))
	const onboardingIndex = ONBOARDING_STEPS.indexOf(lead.onboardingStatus)

	return (
		<div className="p-6 md:p-8">
			<div className="flex items-center justify-between">
				<span className="label-mono">BistroMapa Console</span>
				<Link href="/leads" className="font-mono text-xs uppercase tracking-widest text-stone-400 transition hover:text-stone-900">
					← Leady
				</Link>
			</div>

			<header className="mt-6 flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="flex items-center gap-2 font-serif text-3xl font-black tracking-tight">
						{lead.name}
						{lead.status === 'INTERESTED' && <Star className="h-5 w-5 fill-stone-900 text-stone-900" aria-hidden />}
					</h1>
					<p className="mt-1 text-sm text-stone-500">
						{lead.city}
						{lead.address ? ` · ${lead.address}` : ''}
						{lead.contactPerson ? ` · ${lead.contactPerson}` : ''}
					</p>
				</div>
				<div className="flex items-center gap-2 border border-stone-300 bg-white px-3 py-2">
					<span className={`h-2 w-2 rounded-full ${STATUS_DOT[lead.status]}`} />
					<span className="font-mono text-xs uppercase tracking-widest">{STATUS_LABEL[lead.status]}</span>
				</div>
			</header>

			<div className="mt-5 flex flex-wrap gap-x-8 gap-y-2 border-y border-stone-200 py-3 font-mono text-xs uppercase tracking-wider text-stone-400">
				<span className="flex items-center gap-2">
					<Phone className="h-3.5 w-3.5" aria-hidden />
					Próby kontaktu: <strong className="text-stone-900">{lead.contactAttempts}</strong>
				</span>
				<span className="flex items-center gap-2">
					<Clock className="h-3.5 w-3.5" aria-hidden />
					Ostatni kontakt: <strong className="text-stone-900">{formatDateTime(lead.lastContactAt)}</strong>
				</span>
				<span className="flex items-center gap-2">
					<Flag className="h-3.5 w-3.5" aria-hidden />
					Źródło: <strong className="text-stone-900">{lead.source}</strong>
				</span>
			</div>

			<section className="mt-6 flex flex-wrap gap-2">
				{lead.phone && (
					<a href={`tel:${lead.phone}`} className="btn-primary">
						<Phone className="h-3.5 w-3.5" aria-hidden />
						Zadzwoń
					</a>
				)}
				<button type="button" onClick={() => toggle('email')} className="btn-secondary">
					<Mail className="h-3.5 w-3.5" aria-hidden />
					Wyślij email
				</button>
				{lead.email && (
					<a href={`mailto:${lead.email}`} className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900">
						otwórz w kliencie poczty
					</a>
				)}
				<button type="button" onClick={() => toggle('status')} className="btn-secondary">
					<Flag className="h-3.5 w-3.5" aria-hidden />
					Zmień status
				</button>
				<button type="button" onClick={() => toggle('followUp')} className="btn-secondary">
					<Clock className="h-3.5 w-3.5" aria-hidden />
					Ustaw follow-up
				</button>
				<button type="button" onClick={() => toggle('consent')} className="btn-secondary">
					<Check className="h-3.5 w-3.5" aria-hidden />
					Zgody
				</button>
			</section>

			{error && (
				<p className="mt-4 border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs uppercase tracking-wider text-red-700">
					{error}
				</p>
			)}

			<div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
				<div className="space-y-6 lg:col-span-2">
					<section className="card">
						<h2 className="label-mono">Dane kontaktowe</h2>
						<dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
							<Detail label="Telefon" value={lead.phone} href={lead.phone ? `tel:${lead.phone}` : undefined} />
							<Detail label="Email" value={lead.email} href={lead.email ? `mailto:${lead.email}` : undefined} />
							<Detail label="Strona" value={lead.website} href={lead.website ? `https://${lead.website.replace(/^https?:\/\//, '')}` : undefined} />
							<Detail label="NIP" value={lead.nip} />
							<Detail label="Adres" value={lead.address ? `${lead.address}, ${lead.city}` : lead.city} />
							<Detail label="Kategoria" value={lead.category} />
							<Detail label="Osoba kontaktowa" value={lead.contactPerson} />
							<Detail label="Dodano" value={formatDateTime(lead.createdAt)} />
						</dl>
					</section>

					<InteractionPanel leadId={lead.id} onDone={() => router.refresh()} />

					{panel === 'email' && <SendEmailPanel lead={lead} onClose={() => setPanel(null)} />}

					<section className="card">
						<h2 className="label-mono">Historia kontaktów</h2>
						{lead.interactions.length === 0 ? (
							<p className="mt-3 text-sm text-stone-400">Brak zapisanych kontaktów.</p>
						) : (
							<ol className="mt-4 divide-y divide-stone-100">
								{lead.interactions.map((item) => (
									<InteractionRow key={item.id} interaction={item} />
								))}
							</ol>
						)}
					</section>
				</div>

				<div className="space-y-6">
					<section className="card">
						<h2 className="label-mono">Status</h2>
						<p className="mt-3 flex items-center gap-2 font-serif text-2xl font-black">
							<span className={`h-2.5 w-2.5 rounded-full ${STATUS_DOT[lead.status]}`} />
							{STATUS_LABEL[lead.status]}
						</p>

						{panel === 'status' ? (
							<div className="mt-4 grid grid-cols-1 gap-2">
								{LEAD_STATUSES.map((status: LeadStatus) => (
									<button
										key={status}
										type="button"
										disabled={busy || status === lead.status}
										onClick={async () => {
											const ok = await call(`/api/leads/${lead.id}/status`, {
												method: 'PUT',
												body: JSON.stringify({ status }),
											})
											if (ok) setPanel(null)
										}}
										className="btn-secondary justify-start disabled:opacity-40"
									>
										<span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
										{STATUS_LABEL[status]}
									</button>
								))}
							</div>
						) : (
							<button type="button" onClick={() => toggle('status')} className="btn-secondary mt-4 w-full justify-center">
								Zmień status
							</button>
						)}
					</section>

					<section className="card">
						<h2 className="label-mono">Follow-up</h2>
						<p className="mt-3 font-serif text-xl font-bold">{formatDateTime(lead.nextFollowUpAt)}</p>

						{panel === 'followUp' && (
							<FollowUpForm
								leadId={lead.id}
								initial={toDateTimeLocal(lead.nextFollowUpAt)}
								onSaved={() => {
									setPanel(null)
									router.refresh()
								}}
							/>
						)}

						{lead.followUps.length > 0 && (
							<ul className="mt-4 space-y-2 border-t border-stone-100 pt-4">
								{lead.followUps.map((item) => (
									<li key={item.id} className="flex items-center justify-between gap-2">
										<span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider">
											<Check className={`h-3.5 w-3.5 ${item.completed ? 'text-stone-900' : 'text-stone-300'}`} aria-hidden />
											<span className={item.completed ? 'text-stone-400 line-through' : 'text-stone-700'}>
												{formatDateTime(item.scheduledAt)}
											</span>
										</span>
										{!item.completed && (
											<button
												type="button"
												disabled={busy}
												onClick={() =>
													void call(`/api/follow-ups/${item.id}`, {
														method: 'PUT',
														body: JSON.stringify({ completed: true }),
													})
												}
												className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900"
											>
												Zamknij
											</button>
										)}
									</li>
								))}
							</ul>
						)}
					</section>

					<section className="card">
						<h2 className="label-mono">Onboarding</h2>
						<ul className="mt-3 space-y-2">
							{ONBOARDING_STEPS.map((step, index) => {
								const done = lead.onboardingStatus !== 'ERROR' && onboardingIndex >= index

								return (
									<li key={step} className="flex items-center gap-2">
										<span
											className={`flex h-4 w-4 items-center justify-center border ${
												done ? 'border-stone-900 bg-stone-900 text-white' : 'border-stone-300 text-transparent'
											}`}
										>
											<Check className="h-3 w-3" aria-hidden />
										</span>
										<span className={`font-mono text-[10px] uppercase tracking-wider ${done ? 'text-stone-900' : 'text-stone-400'}`}>
											{ONBOARDING_LABEL[step]}
										</span>
									</li>
								)
							})}
						</ul>

						{lead.onboardingStatus === 'ERROR' && (
							<p className="mt-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-red-600">
								<AlertTriangle className="h-3.5 w-3.5" aria-hidden />
								Błąd onboardingu — wymaga ponowienia
							</p>
						)}
					</section>

					<ConsentCard
						lead={lead}
						open={panel === 'consent'}
						busy={busy}
						onToggle={() => toggle('consent')}
						onSave={async (payload) => {
							const ok = await call(`/api/leads/${lead.id}/consent`, {
								method: 'PUT',
								body: JSON.stringify(payload),
							})
							if (ok) setPanel(null)
						}}
					/>

					<MergeCard
						lead={lead}
						open={panel === 'merge'}
						busy={busy}
						onToggle={() => toggle('merge')}
						onMerge={(sourceLeadId) =>
							call(`/api/leads/${lead.id}/merge`, {
								method: 'POST',
								body: JSON.stringify({ sourceLeadId }),
							})
						}
					/>
				</div>
			</div>

			{lead.notes && (
				<section className="card mt-6">
					<h2 className="label-mono">Notatki</h2>
					<p className="mt-3 whitespace-pre-line text-sm text-stone-600">{lead.notes}</p>
				</section>
			)}
		</div>
	)
}

function Detail({ label, value, href }: { label: string; value: string | null; href?: string }) {
	return (
		<div>
			<dt className="label-mono">{label}</dt>
			<dd className="mt-1 font-medium">
				{value ? (
					href ? (
						<a href={href} className="hover:underline">
							{value}
						</a>
					) : (
						value
					)
				) : (
					<span className="text-stone-300">—</span>
				)}
			</dd>
		</div>
	)
}

function InteractionRow({ interaction }: { interaction: Interaction }) {
	return (
		<li className="flex gap-4 py-4">
			<span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-stone-200 bg-[#fdfdfd]">
				{interaction.type === 'PHONE' && <Phone className="h-4 w-4 text-stone-600" aria-hidden />}
				{interaction.type === 'EMAIL' && <Mail className="h-4 w-4 text-stone-600" aria-hidden />}
				{(interaction.type === 'SMS' || interaction.type === 'NOTE') && (
					<MessageSquare className="h-4 w-4 text-stone-600" aria-hidden />
				)}
				{interaction.type === 'OTHER' && <Flag className="h-4 w-4 text-stone-600" aria-hidden />}
			</span>
			<div className="min-w-0">
				<p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
					{interaction.type} · {formatDateTime(interaction.createdAt)}
				</p>
				{interaction.contactPerson && <p className="mt-1 text-sm font-bold">{interaction.contactPerson}</p>}
				{interaction.content && <p className="mt-1 whitespace-pre-line text-sm text-stone-600">{interaction.content}</p>}
			</div>
		</li>
	)
}

function InteractionPanel({ leadId, onDone }: { leadId: string; onDone: () => void }) {
	const [type, setType] = useState<InteractionType>('PHONE')
	const [content, setContent] = useState('')
	const [contactPerson, setContactPerson] = useState('')
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function submit(event: React.FormEvent) {
		event.preventDefault()
		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/interactions', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					leadId,
					type,
					...(content.trim() ? { content } : {}),
					...(contactPerson.trim() ? { contactPerson } : {}),
				}),
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się zapisać')
				return
			}

			setContent('')
			setContactPerson('')
			onDone()
		} finally {
			setBusy(false)
		}
	}

	return (
		<form onSubmit={submit} className="card">
			<h2 className="label-mono">Zapisz kontakt</h2>
			<p className="mt-2 text-sm text-stone-500">
				Historia kontaktów jest tylko dopisywana — nie da się jej nadpisać.
			</p>

			<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<select value={type} onChange={(event) => setType(event.target.value as InteractionType)} className="field">
					{INTERACTION_TYPES.map((option) => (
						<option key={option} value={option}>
							{option}
						</option>
					))}
				</select>
				<input
					value={contactPerson}
					onChange={(event) => setContactPerson(event.target.value)}
					placeholder="Osoba kontaktowa"
					className="field sm:col-span-2"
				/>
			</div>

			<textarea
				rows={3}
				value={content}
				onChange={(event) => setContent(event.target.value)}
				placeholder="Czego dotyczyła rozmowa…"
				className="field mt-3"
			/>

			{error && <p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-red-600">{error}</p>}

			<button type="submit" disabled={busy} className="btn-primary mt-3">
				{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Check className="h-3.5 w-3.5" aria-hidden />}
				Zapisz
			</button>
		</form>
	)
}

function FollowUpForm({ leadId, initial, onSaved }: { leadId: string; initial: string; onSaved: () => void }) {
	const [value, setValue] = useState(initial)
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)

	async function submit(event: React.FormEvent) {
		event.preventDefault()
		setBusy(true)
		setError(null)

		try {
			const response = await fetch('/api/follow-ups', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ leadId, scheduledAt: new Date(value).toISOString() }),
			})
			const body = await response.json().catch(() => null)

			if (!response.ok || body?.success !== true) {
				setError(body?.error?.message ?? 'Nie udało się ustawić follow-upu')
				return
			}

			onSaved()
		} finally {
			setBusy(false)
		}
	}

	return (
		<form onSubmit={submit} className="mt-4 space-y-2">
			<input
				type="datetime-local"
				required
				value={value}
				onChange={(event) => setValue(event.target.value)}
				className="field"
			/>
			{error && <p className="font-mono text-[10px] uppercase tracking-wider text-red-600">{error}</p>}
			<button type="submit" disabled={busy} className="btn-primary w-full justify-center">
				<Check className="h-3.5 w-3.5" aria-hidden />
				Zapisz termin
			</button>
		</form>
	)
}

function ConsentCard({
	lead,
	open,
	busy,
	onToggle,
	onSave,
}: {
	lead: LeadDetail
	open: boolean
	busy: boolean
	onToggle: () => void
	onSave: (payload: { consentStatus: string; consentSource?: string; consentNotes?: string }) => Promise<void>
}) {
	const [consentStatus, setConsentStatus] = useState(lead.consentStatus ?? 'PENDING')
	const [consentSource, setConsentSource] = useState(lead.consentSource ?? '')
	const [consentNotes, setConsentNotes] = useState(lead.consentNotes ?? '')

	return (
		<section className="card">
			<h2 className="label-mono">Zgody</h2>
			<p className="mt-3 font-serif text-xl font-bold">
				{lead.consentStatus ? CONSENT_LABEL[lead.consentStatus] ?? lead.consentStatus : 'Brak danych'}
			</p>
			<p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-stone-400">
				{lead.consentSource ? `${lead.consentSource} · ` : ''}
				{formatDateTime(lead.consentAt)}
			</p>

			{open ? (
				<div className="mt-4 space-y-2">
					<select
						value={consentStatus}
						onChange={(event) => setConsentStatus(event.target.value as typeof consentStatus)}
						className="field"
					>
						{CONSENT_STATUSES.map((status) => (
							<option key={status} value={status}>
								{CONSENT_LABEL[status]}
							</option>
						))}
					</select>
					<input
						value={consentSource}
						onChange={(event) => setConsentSource(event.target.value)}
						placeholder="Źródło zgody (np. rozmowa telefoniczna)"
						className="field"
					/>
					<textarea
						rows={2}
						value={consentNotes}
						onChange={(event) => setConsentNotes(event.target.value)}
						placeholder="Notatka z rozmowy"
						className="field"
					/>
					<button
						type="button"
						disabled={busy}
						onClick={() =>
							void onSave({
								consentStatus,
								...(consentSource.trim() ? { consentSource } : {}),
								...(consentNotes.trim() ? { consentNotes } : {}),
							})
						}
						className="btn-primary w-full justify-center"
					>
						<Check className="h-3.5 w-3.5" aria-hidden />
						Zapisz zgodę
					</button>
				</div>
			) : (
				<button type="button" onClick={onToggle} className="btn-secondary mt-4 w-full justify-center">
					Zaktualizuj zgodę
				</button>
			)}
		</section>
	)
}

function MergeCard({
	lead,
	open,
	busy,
	onToggle,
	onMerge,
}: {
	lead: LeadDetail
	open: boolean
	busy: boolean
	onToggle: () => void
	onMerge: (sourceLeadId: string) => Promise<boolean>
}) {
	const [candidates, setCandidates] = useState<DuplicateMatch[] | null>(null)
	const [loading, setLoading] = useState(false)

	async function findCandidates() {
		setLoading(true)

		try {
			const search = new URLSearchParams({ name: lead.name, city: lead.city })
			if (lead.phone) search.set('phone', lead.phone)
			if (lead.email) search.set('email', lead.email)
			if (lead.website) search.set('website', lead.website)
			if (lead.nip) search.set('nip', lead.nip)

			const response = await fetch(`/api/leads/duplicates?${search.toString()}`)
			const body = await response.json().catch(() => null)

			const found = (body?.data ?? []) as DuplicateMatch[]
			setCandidates(found.filter((candidate) => candidate.id !== lead.id))
		} finally {
			setLoading(false)
		}
	}

	return (
		<section className="card">
			<h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-400">
				<Scale className="h-3.5 w-3.5" aria-hidden />
				Scalanie duplikatów
			</h2>

			{open ? (
				<div className="mt-4 space-y-3">
					<button type="button" onClick={() => void findCandidates()} disabled={loading} className="btn-secondary w-full justify-center">
						{loading ? 'Szukam…' : 'Znajdź duplikaty'}
					</button>

					{candidates?.length === 0 && <p className="text-sm text-stone-400">Nie znaleziono innych leadów z tymi danymi.</p>}

					{candidates?.map((candidate) => (
						<div key={candidate.id} className="border border-stone-200 p-3">
							<p className="text-sm font-bold">{candidate.name}</p>
							<p className="font-mono text-[10px] uppercase tracking-wider text-stone-500">
								{candidate.city} · zgodne: {candidate.reasons.join(', ')}
							</p>
							<button
								type="button"
								disabled={busy}
								onClick={() => {
									const confirmed = window.confirm(
										`Scalić "${candidate.name}" do tego leada? Historia kontaktów i follow-upy przejdą tutaj, a drugi lead zostanie usunięty.`,
									)
									if (confirmed) void onMerge(candidate.id)
								}}
								className="mt-2 font-mono text-[10px] uppercase tracking-widest text-red-600 underline"
							>
								Scal do tego leada
							</button>
						</div>
					))}
				</div>
			) : (
				<button type="button" onClick={onToggle} className="btn-secondary mt-4 w-full justify-center">
					Sprawdź duplikaty
				</button>
			)}
		</section>
	)
}
