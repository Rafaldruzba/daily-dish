import type { MetadataRoute } from 'next'

const BASE_URL = 'https://bistromapa.app'

export default function robots(): MetadataRoute.Robots {
	return {
		rules: {
			userAgent: '*',
			allow: '/',
			disallow: ['/for-restaurants', '/login', '/register', '/reset-password', '/admin', '/api/'],
		},
		sitemap: `${BASE_URL}/sitemap.xml`,
		host: BASE_URL,
	}
}
