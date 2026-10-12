'use client'

import { useEffect } from 'react'

/**
 * Ustawia atrybut lang na <html> zgodnie z aktywnym locale.
 *
 * <html> renderuje root layout (app/layout.tsx), który nie zna segmentu [locale] —
 * a przeniesienie <html> do app/[locale]/layout.tsx zerwałoby trasę 404, bo
 * app/not-found.tsx żyje nad [locale]. Dlatego lang domykamy tu, po hydracji.
 */
export function HtmlLang({ locale }: { locale: string }) {
	useEffect(() => {
		document.documentElement.lang = locale
	}, [locale])

	return null
}
