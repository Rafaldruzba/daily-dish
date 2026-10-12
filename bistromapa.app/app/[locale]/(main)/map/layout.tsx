import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { alternatesFor } from '@/lib/seo'

/**
 * Strona mapy jest komponentem klienckim ('use client'), więc metadata musi iść z layoutu.
 */
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params

	const t = await getTranslations('Metadata')

	return {
		title: t('mapTitle'),
		description: t('mapDescription'),
		alternates: alternatesFor('/map', locale),
	}
}

export default function MapLayout({ children }: { children: React.ReactNode }) {
	return children
}
