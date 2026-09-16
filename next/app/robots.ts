import type { MetadataRoute } from 'next'

const BASE_URL = 'https://bistromapa.app'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			// Panel właściciela i strony logowania nie mają wartości w indeksie
			disallow: ['/for-restaurants', '/login', '/register', '/reset-password'],
		},
		sitemap: `${BASE_URL}/sitemap.xml`,
		host: BASE_URL,
	}
}
