import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'

export const metadata: Metadata = {
	title: 'BistroMapa Console',
	description: 'CRM do pozyskiwania restauracji dla BistroMapy',
	// Panel wewnętrzny — nie indeksujemy (readme §28).
	robots: { index: false, follow: false },
}

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="pl">
			<body>{children}</body>
		</html>
	)
}
