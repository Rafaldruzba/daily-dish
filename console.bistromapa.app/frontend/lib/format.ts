import type { LeadStatus, OnboardingStatus } from '@/types'

/**
 * Formatowanie deterministyczne (bez strefy czasowej i Intl) — data z serwera
 * renderuje się tak samo na serwerze i w przeglądarce, bez błędów hydracji.
 */
export function formatDateTime(value: string | null | undefined): string {
	if (!value) return '—'

	const [date, time = ''] = value.split('T')
	const [year, month, day] = date.split('-')

	return `${day}.${month}.${year}${time ? ` ${time.slice(0, 5)}` : ''}`
}

export function formatDate(value: string | null | undefined): string {
	if (!value) return '—'

	const [date] = value.split('T')
	const [year, month, day] = date.split('-')

	return `${day}.${month}.${year}`
}

/** Wartość dla <input type="datetime-local">. */
export function toDateTimeLocal(value: string | null | undefined): string {
	return value ? value.slice(0, 16) : ''
}

/** Zamiana czasu lokalnego z formularza na ISO (UTC) dla API. */
export function fromDateTimeLocal(value: string): string {
	return new Date(value).toISOString()
}

export const STATUS_LABEL: Record<LeadStatus, string> = {
	NEW: 'Nowy',
	CONTACTED: 'Kontakt podjęty',
	NO_RESPONSE: 'Brak odpowiedzi',
	CALL_BACK: 'Oddzwonić',
	INTERESTED: 'Zainteresowany',
	ACCEPTED: 'Zaakceptowany',
	DECLINED: 'Odrzucony',
}

export const STATUS_DOT: Record<LeadStatus, string> = {
	NEW: 'bg-stone-300',
	CONTACTED: 'bg-stone-500',
	NO_RESPONSE: 'bg-amber-500',
	CALL_BACK: 'bg-sky-500',
	INTERESTED: 'bg-violet-500',
	ACCEPTED: 'bg-emerald-600',
	DECLINED: 'bg-red-600',
}

export const ONBOARDING_LABEL: Record<OnboardingStatus, string> = {
	NOT_STARTED: 'Nie rozpoczęto',
	CREATE_QUEUED: 'W kolejce',
	ACCOUNT_CREATED: 'Konto utworzone',
	INVITATION_SENT: 'Zaproszenie wysłane',
	ACTIVATED: 'Aktywowane',
	ERROR: 'Błąd',
}

export const CONSENT_LABEL: Record<string, string> = {
	GIVEN: 'Udzielona',
	DENIED: 'Odmowa',
	PENDING: 'Oczekuje',
}

export function isOverdue(value: string | null | undefined): boolean {
	if (!value) return false

	return new Date(value).getTime() < Date.now()
}
