'use client'

import { AlertTriangle, Check, Loader2, Mail, Send } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'

import { ApiSaveError, sendJson } from '@/lib/api-client'
import { apiFetch } from '@/lib/api'
import { TEMPLATE_VARIABLE_HINT, fillTemplate, leadVariables } from '@/lib/template'
import type { EmailTemplate, LeadDetail } from '@/types'

type Message = { tone: 'ok' | 'warn' | 'error'; text: string } | null

/**
 * Wysyłka maila do leada z szablonu (readme §23).
 *
 * Treść jest wypełniana danymi leada już w podglądzie i wysyłana w takiej postaci,
 * jaką widzi użytkownik — backend nie renderuje szablonu ponownie po cichu.
 */
export function SendEmailPanel({ lead, onClose }: { lead: LeadDetail; onClose?: () => void }) {
	const router = useRouter()

	const [templates, setTemplates] = useState<EmailTemplate[] | null>(null)
	const [loadError, setLoadError] = useState<string | null>(null)
	const [templateKey, setTemplateKey] = useState('')
	const [to, setTo] = useState(lead.email ?? '')
	const [subject, setSubject] = useState('')
	const [body, setBody] = useState('')
	const [busy, setBusy] = useState(false)
	const [message, setMessage] = useState<Message>(null)

	const variables = leadVariables(lead)

	const applyTemplate = useCallback(
		(template: EmailTemplate) => {
			setTemplateKey(template.key)
			setSubject(fillTemplate(template.subject, variables))
			setBody(fillTemplate(template.body, variables))
			setMessage(null)
		},
		// `variables` powstaje z leada przy każdym renderze — zależymy od pól, nie od obiektu
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[lead.name, lead.city, lead.address, lead.phone, lead.contactPerson, lead.email, lead.website],
	)

	useEffect(() => {
		let cancelled = false

		async function load() {
			try {
				const loaded = await apiFetch<EmailTemplate[]>('/email/templates')
				if (cancelled) return

				setTemplates(loaded)
				if (loaded.length > 0) applyTemplate(loaded[0])
			} catch (error) {
				if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Nie udało się pobrać szablonów')
			}
		}

		void load()

		return () => {
			cancelled = true
		}
	}, [applyTemplate])

	async function send(event: React.FormEvent) {
		event.preventDefault()
		setBusy(true)
		setMessage(null)

		try {
			const result = await sendJson<{ sent: boolean; to: string }>('/api/email/send', {
				method: 'POST',
				body: JSON.stringify({
					leadId: lead.id,
					templateKey,
					to: to.trim() || undefined,
					subject,
					body,
				}),
			})

			setMessage({ tone: 'ok', text: `Wysłano na ${result?.to ?? to}` })
			router.refresh()
		} catch (error) {
			if (error instanceof ApiSaveError) {
				setMessage({ tone: error.uncertain ? 'warn' : 'error', text: error.message })
			} else {
				setMessage({ tone: 'error', text: 'Nieoczekiwany błąd — spróbuj ponownie.' })
			}
		} finally {
			setBusy(false)
		}
	}

	const toneClass =
		message?.tone === 'ok'
			? 'border-emerald-200 bg-emerald-50 text-emerald-800'
			: message?.tone === 'warn'
				? 'border-amber-300 bg-amber-50 text-amber-800'
				: 'border-red-200 bg-red-50 text-red-700'

	return (
		<form onSubmit={send} className="card">
			<div className="flex items-center justify-between">
				<h2 className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-stone-400">
					<Mail className="h-3.5 w-3.5" aria-hidden />
					Wyślij email z szablonu
				</h2>
				{onClose && (
					<button type="button" onClick={onClose} className="font-mono text-[10px] uppercase tracking-widest text-stone-400 hover:text-stone-900">
						Zamknij
					</button>
				)}
			</div>

			{loadError && <p className={`mt-4 border px-3 py-2 font-mono text-[10px] uppercase tracking-wider ${toneClass}`}>{loadError}</p>}

			{templates !== null && templates.length === 0 && (
				<p className="mt-4 text-sm text-stone-500">
					Brak szablonów. Uruchom <code className="bg-stone-100 px-1">npm run seed</code> w backendzie, żeby załadować domyślne.
				</p>
			)}

			{templates !== null && templates.length > 0 && (
				<>
					<div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
						<div>
							<label htmlFor="emailTemplate" className="label-mono">
								Szablon
							</label>
							<select
								id="emailTemplate"
								value={templateKey}
								onChange={(event) => {
									const chosen = templates.find((item) => item.key === event.target.value)
									if (chosen) applyTemplate(chosen)
								}}
								className="field mt-1"
							>
								{templates.map((template) => (
									<option key={template.id} value={template.key}>
										{template.name}
									</option>
								))}
							</select>
						</div>

						<div>
							<label htmlFor="emailTo" className="label-mono">
								Odbiorca
							</label>
							<input
								id="emailTo"
								type="email"
								required
								value={to}
								onChange={(event) => setTo(event.target.value)}
								placeholder="adres@restauracja.pl"
								className="field mt-1"
							/>
						</div>
					</div>

					{!lead.email && (
						<p className="mt-3 flex items-start gap-2 border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
							<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
							Ten lead nie ma zapisanego adresu email — wpisz go ręcznie powyżej.
						</p>
					)}

					<div className="mt-3">
						<label htmlFor="emailSubject" className="label-mono">
							Temat
						</label>
						<input id="emailSubject" required value={subject} onChange={(event) => setSubject(event.target.value)} className="field mt-1" />
					</div>

					<div className="mt-3">
						<label htmlFor="emailBody" className="label-mono">
							Treść
						</label>
						<textarea id="emailBody" required rows={10} value={body} onChange={(event) => setBody(event.target.value)} className="field mt-1" />
					</div>

					<p className="mt-2 font-mono text-[10px] uppercase tracking-wider text-stone-400">
						Zmienne: {TEMPLATE_VARIABLE_HINT.map((name) => `{{${name}}}`).join(' ')}
					</p>

					{message && (
						<p className={`mt-3 border px-3 py-2 font-mono text-[10px] uppercase tracking-wider ${toneClass}`}>{message.text}</p>
					)}

					<button type="submit" disabled={busy} className="btn-primary mt-4">
						{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <Send className="h-3.5 w-3.5" aria-hidden />}
						Wyślij
					</button>

					<p className="mt-3 flex items-start gap-2 text-xs text-stone-500">
						<Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-stone-400" aria-hidden />
						Wysłanie zapisuje się w historii kontaktów leada i w logach wysyłki. Hasła nigdy nie wysyłamy mailem — do tego służy link aktywacyjny.
					</p>
				</>
			)}
		</form>
	)
}
