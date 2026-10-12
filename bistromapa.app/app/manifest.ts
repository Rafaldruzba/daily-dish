import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
	return {
		id: '/',
		name: 'BistroMapa — restauracje, menu dnia i opinie',
		short_name: 'BistroMapa',
		description:
			'Wyszukiwarka restauracji w Twojej okolicy: menu dnia, zdjęcia, opinie i dane kontaktowe lokali.',
		lang: 'pl',
		dir: 'ltr',
		// '/' przekierowuje na domyślny język (/pl), więc instalacja nie jest przypisana do jednego locale
		start_url: '/',
		scope: '/',
		display: 'standalone',
		orientation: 'portrait',
		background_color: '#fdfdfd',
		theme_color: '#0c0c0c',
		categories: ['food', 'lifestyle'],
		icons: [
			{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
			// /icon i /apple-icon to konwencje plikowe Next (app/icon.tsx, app/apple-icon.tsx)
			{ src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
			{ src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
			{ src: '/apple-icon', sizes: '180x180', type: 'image/png' },
		],
	}
}
