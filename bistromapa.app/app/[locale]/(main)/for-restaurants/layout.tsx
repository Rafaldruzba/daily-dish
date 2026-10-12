import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

/**
 * Panel użytkownika (profil, ulubione, panel właściciela, panel admina) jest prywatny —
 * bez tego layoutu strona nie miała ŻADNYCH metadata, więc nic nie blokowało indeksacji.
 * Strona jest komponentem klienckim ('use client'), dlatego metadata musi iść z layoutu.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: 'Metadata' })

	return {
		title: t('panelTitle'),
		robots: {
			index: false,
			follow: false,
		},
	}
}

export default function ForRestaurantsLayout({ children }: { children: React.ReactNode }) {
	return children
}
