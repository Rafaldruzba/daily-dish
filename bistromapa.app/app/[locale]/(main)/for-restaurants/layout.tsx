import type { Metadata } from 'next'

/**
 * Panel użytkownika (profil, ulubione, panel właściciela, panel admina) jest prywatny —
 * bez tego layoutu strona nie miała ŻADNYCH metadata, więc nic nie blokowało indeksacji.
 * Strona jest komponentem klienckim ('use client'), dlatego metadata musi iść z layoutu.
 */
export const metadata: Metadata = {
	title: 'Panel',
	robots: {
		index: false,
		follow: false,
	},
}

export default function ForRestaurantsLayout({ children }: { children: React.ReactNode }) {
	return children
}
