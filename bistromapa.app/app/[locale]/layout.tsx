import type { Metadata } from 'next'
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { getMessages, getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { alternatesFor, ogLocale } from '@/lib/seo'
import { HtmlLang } from '@/components/ui/HtmlLang'

// Pobieraj adres z zmiennych środowiskowych lub użyj produkcyjnego adresu domyślnie
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bistromapa.app'

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
	const { locale } = await params

	if (!hasLocale(routing.locales, locale)) {
		return {}
	}

	const t = await getTranslations({ locale, namespace: 'Metadata' })

	return {
		metadataBase: new URL(baseUrl),
		title: {
			default: t('homeTitle'),
			template: '%s | BistroMapa',
		},
		description: t('homeDescription'),
		alternates: alternatesFor('/', locale),
		openGraph: {
			locale: ogLocale(locale),
			alternateLocale: routing.locales.filter(l => l !== locale).map(ogLocale),
			url: `${baseUrl}/${locale}`,
			siteName: t('siteName'),
			title: t('homeTitle'),
			description: t('homeDescription'),
		},
	}
}

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ locale: string }>
}) {
	const { locale } = await params

	if (!hasLocale(routing.locales, locale)) {
		notFound()
	}

	const messages = await getMessages({ locale })

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<HtmlLang locale={locale} />
			{children}
		</NextIntlClientProvider>
	)
}
