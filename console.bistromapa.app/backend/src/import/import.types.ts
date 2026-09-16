/** Pola docelowe importu i synonimy nagłówków (readme §15). */

export const IMPORT_TARGET_FIELDS = [
	'name',
	'city',
	'address',
	'phone',
	'email',
	'website',
	'nip',
	'category',
	'contactPerson',
	'notes',
] as const

export type ImportTargetField = (typeof IMPORT_TARGET_FIELDS)[number]

export const FIELD_LABELS: Record<ImportTargetField, string> = {
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

/** Rozpoznawanie kolumn po typowych nazwach (PL/EN) — użytkownik może to nadpisać. */
const SYNONYMS: Record<ImportTargetField, string[]> = {
	name: ['name', 'nazwa', 'restauracja', 'nazwa restauracji', 'firma', 'title', 'lokal'],
	city: ['city', 'miasto', 'miejscowosc', 'miejscowość', 'town'],
	address: ['address', 'adres', 'ulica', 'street'],
	phone: ['phone', 'telefon', 'tel', 'numer', 'phone number', 'telefon kontaktowy'],
	email: ['email', 'e-mail', 'mail', 'adres email'],
	website: ['website', 'www', 'strona', 'url', 'strona www', 'site'],
	nip: ['nip', 'vat', 'tax id'],
	category: ['category', 'kategoria', 'branza', 'branża', 'typ', 'kuchnia', 'cuisine'],
	contactPerson: ['contactperson', 'osoba kontaktowa', 'kontakt', 'contact', 'właściciel', 'wlasciciel'],
	notes: ['notes', 'notatka', 'notatki', 'uwagi', 'comment', 'komentarz'],
}

function normalizeHeader(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.replace(/[_\-.]+/g, ' ')
		.replace(/\s+/g, ' ')
}

export function detectMapping(headers: string[]): Record<ImportTargetField, string | null> {
	const normalized = headers.map((header) => ({ raw: header, key: normalizeHeader(header) }))
	const mapping = {} as Record<ImportTargetField, string | null>

	for (const field of IMPORT_TARGET_FIELDS) {
		const match = normalized.find((header) => SYNONYMS[field].includes(header.key))
		mapping[field] = match?.raw ?? null
	}

	return mapping
}

export interface ImportRow {
	[row: string]: string
}

export interface RowIssue {
	row: number
	errors: string[]
}

export interface ImportPreview {
	/** Identyfikator sparsowanego pliku trzymanego po stronie serwera (nie przesyłamy wierszy tam i z powrotem). */
	importId: string
	headers: string[]
	mapping: Record<ImportTargetField, string | null>
	totalRows: number
	sampleRows: ImportRow[]
	validRows: number
	issues: RowIssue[]
	duplicates: { row: number; name: string; city: string; duplicateOf: string; reasons: string[] }[]
	truncated: boolean
}

export interface ImportCommitResult {
	created: number
	skipped: number
	failed: number
}
