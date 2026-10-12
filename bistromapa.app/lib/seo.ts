import type { Metadata } from 'next'

export const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bistromapa.app'

export const LOCALES = ['pl', 'en'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'pl'

/** Tłumaczy kod locale (pl/en) na format Open Graph (pl_PL/en_US). */
export function ogLocale(locale: string): string {
	return locale === 'en' ? 'en_US' : 'pl_PL'
}

/**
 * Buduje canonical + hreflang dla danej ścieżki i locale.
 *
 * Aplikacja serwuje treść pod /{locale}/... (localePrefix: 'always'), więc canonical
 * MUSI zawierać prefiks — inaczej wskazuje adres, którego nie ma.
 * `path` podawaj bez prefiksu locale, np. '/restaurants/warszawa' albo '/'.
 */
export function alternatesFor(path: string, locale: string): Metadata['alternates'] {
	const clean = path === '/' ? '' : path.startsWith('/') ? path : `/${path}`

	const languages: Record<string, string> = {}
	for (const l of LOCALES) {
		languages[l] = `${BASE_URL}/${l}${clean}`
	}
	languages['x-default'] = `${BASE_URL}/${DEFAULT_LOCALE}${clean}`

	return {
		canonical: `${BASE_URL}/${locale}${clean}`,
		languages,
	}
}
