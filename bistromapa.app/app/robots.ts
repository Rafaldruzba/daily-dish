import type { MetadataRoute } from 'next'
import { BASE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			// Adresy są serwowane z prefiksem locale (/pl/..., /en/...), więc wzorce
			// muszą obejmować oba warianty — sam '/login' nic nie blokował.
			disallow: [
				'/*/for-restaurants',
				'/*/login',
				'/*/register',
				'/*/reset-password',
				'/*/auth/',
				'/api/',
				'/crm-api/',
			],
		},
		sitemap: `${BASE_URL}/sitemap.xml`,
		host: BASE_URL,
	}
}
