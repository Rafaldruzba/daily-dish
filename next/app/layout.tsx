import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'BistroMapa — Znajdź restaurację, sprawdź menu i opinie',
    template: '%s | BistroMapa',
  },
  description: 'Znajdź najlepsze restauracje w Twojej okolicy. Sprawdź menu dnia, zdjęcia, opinie i informacje o lokalach. BistroMapa — Twój przewodnik kulinarny.',
  keywords: ['restauracje', 'menu', 'opinie', 'dostawa', 'jedzenie', 'polska', 'gastronomia'],
  authors: [{ name: 'BistroMapa' }],
  creator: 'BistroMapa',
  publisher: 'BistroMapa',
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
    url: 'https://bistromapa.app',
    siteName: 'BistroMapa',
    title: 'BistroMapa — Znajdź restaurację, sprawdź menu i opinie',
    description: 'Znajdź najlepsze restauracje w Twojej okolicy. Sprawdź menu dnia, zdjęcia, opinie i informacje o lokalach.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'BistroMapa — Znajdź restaurację',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BistroMapa — Znajdź restaurację',
    description: 'Sprawdź menu, zdjęcia i opinie o restauracjach w Twojej okolicy.',
    images: ['/og-image.jpg'],
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
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
  url: 'https://bistromapa.app',
  logo: 'https://bistromapa.app/bistro-logo.png',
  sameAs: [
    'https://github.com/Rafaldruzba/daily-dish',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    telephone: '+48-791-445-104',
    contactType: 'customer service',
    availableLanguage: ['Polish'],
  },
}

const webSiteJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'BistroMapa',
  url: 'https://bistromapa.app',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://bistromapa.app/restauracje?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(webSiteJsonLd) }}
        />
        <link rel="preconnect" href="https://maps.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="min-h-screen bg-[#fdfdfd] text-stone-900 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}