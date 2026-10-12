import type { Metadata } from 'next'
import { alternatesFor } from '@/lib/seo'

/**
 * Strona mapy jest komponentem klienckim ('use client'), więc metadata musi iść z layoutu.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params

	return {
		title: 'Mapa restauracji',
		description:
			'Przeglądaj restauracje na mapie — sprawdź, co jest w pobliżu, i przejdź do menu, zdjęć i opinii w BistroMapa.',
		alternates: alternatesFor('/map', locale),
	}
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
	return children
}
