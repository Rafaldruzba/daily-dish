import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
})

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
})

export const metadata: Metadata = {
	title: 'BistroMapa — już wkrótce',
	description: 'Zapowiedź kolejnego wydania: termin premiery i lista rzeczy, nad którymi pracujemy.',
	robots: { index: true, follow: true },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang="pl" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
			<body className="flex min-h-full flex-col">{children}</body>
		</html>
	)
}
