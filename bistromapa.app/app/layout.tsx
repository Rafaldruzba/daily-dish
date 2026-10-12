import type { Metadata, Viewport } from 'next'
import { GoogleAnalytics } from '@next/third-parties/google'
import { Providers } from './providers'
import './globals.css'

// Pobieraj adres z zmiennych środowiskowych lub użyj produkcyjnego adresu domyślnie
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bistromapa.app'

export const metadata: Metadata = {
	// Bez metadataBase względne adresy OG/ikonek nie mają poprawnego hosta
	metadataBase: new URL(baseUrl),
	title: {
		default: 'BistroMapa — Znajdź restaurację, sprawdź menu i opinie',
		template: '%s | BistroMapa',
	},
	description:
		'Znajdź najlepsze restauracje w Twojej okolicy. Sprawdź menu dnia, zdjęcia, opinie i informacje o lokalach. BistroMapa — Twój przewodnik kulinarny.',
	keywords: ['restauracje', 'menu', 'opinie', 'dostawa', 'jedzenie', 'polska', 'gastronomia'],
	authors: [{ name: 'BistroMapa' }],
	creator: 'BistroMapa',
	publisher: 'BistroMapa',
	applicationName: 'BistroMapa',
	alternates: {
		canonical: '/pl',
		languages: {
			pl: '/pl',
			en: '/en',
			'x-default': '/pl',
		},
	},
	robots: {
		index: true,
		follow: true,
		googleBot: {
			index: true,
			follow: true,
			'max-video-preview': -1,
			'max-image-preview': 'large',
			'max-snippet': -1,
		},
	},
	openGraph: {
		type: 'website',
		locale: 'pl_PL',
		alternateLocale: ['en_US'],
		url: baseUrl,
		siteName: 'BistroMapa',
		title: 'BistroMapa — Znajdź restaurację, sprawdź menu i opinie',
		description:
			'Znajdź najlepsze restauracje w Twojej okolicy. Sprawdź menu dnia, zdjęcia, opinie i informacje o lokalach.',
		// Obraz OG pochodzi z app/opengraph-image.tsx (konwencja plikowa Next)
	},
	twitter: {
		card: 'summary_large_image',
		title: 'BistroMapa — Znajdź restaurację',
		description: 'Sprawdź menu, zdjęcia i opinie o restauracjach w Twojej okolicy.',
	},
	icons: {
		icon: '/favicon.svg',
		shortcut: '/favicon.svg',
		// apple-touch-icon generuje app/apple-icon.tsx
	},
	// manifest podłącza się automatycznie z app/manifest.ts (/manifest.webmanifest)
}

export const viewport: Viewport = {
	themeColor: '#0c0c0c',
	width: 'device-width',
	initialScale: 1,
	maximumScale: 5,
}

const organizationJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'Organization',
	name: 'BistroMapa',
	url: baseUrl,
	logo: `${baseUrl}/bistro-logo.png`,
	sameAs: ['https://github.com/Rafaldruzba/daily-dish'],
	contactPoint: {
		'@type': 'ContactPoint',
		telephone: '+48-791-445-104',
		contactType: 'customer service',
		availableLanguage: ['Polish', 'English'],
	},
}

const webSiteJsonLd = {
	'@context': 'https://schema.org',
	'@type': 'WebSite',
	name: 'BistroMapa',
	url: baseUrl,
	potentialAction: {
		'@type': 'SearchAction',
		target: {
			'@type': 'EntryPoint',
			urlTemplate: `${baseUrl}/pl/restaurants?search={search_term_string}`,
		},
		'query-input': 'required name=search_term_string',
	},
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang='pl' suppressHydrationWarning>
			<head>
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(organizationJsonLd),
					}}
				/>

				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{
						__html: JSON.stringify(webSiteJsonLd),
					}}
				/>

				<link rel='preconnect' href='https://maps.googleapis.com' />
				<link rel='preconnect' href='https://fonts.googleapis.com' />
				<link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
			</head>

			<body className='min-h-screen bg-[#fdfdfd] text-stone-900 antialiased'>
				<Providers>{children}</Providers>

				{process.env.NEXT_PUBLIC_GA_ID && <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />}
			</body>
		</html>
	)
}
