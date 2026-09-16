import type { MetadataRoute } from 'next'

const API_URL =
	process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
const BASE_URL = 'https://bistromapa.app'

// Sitemap odświeżana co godzinę – rośnie razem z liczbą restauracji w bazie
export const revalidate = 3600

interface SitemapData {
	cities: Array<{ citySlug: string; cuisines: string[] }>
	restaurants: Array<{ slug: string; updatedAt: string }>
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const routes: MetadataRoute.Sitemap = [
		{
			url: BASE_URL,
			changeFrequency: 'daily',
			priority: 1,
		},
		{
			url: `${BASE_URL}/restaurants`,
			changeFrequency: 'daily',
			priority: 0.9,
		},
	]

	try {
		const response = await fetch(`${API_URL}/seo/sitemap`, { next: { revalidate: 3600 } })
		if (!response.ok) return routes

		const data: SitemapData = await response.json()

		// Strony miast i kategorii tylko powyżej progu (backend już je odfiltrował)
		for (const city of data.cities) {
			routes.push({
				url: `${BASE_URL}/restaurants/${city.citySlug}`,
				changeFrequency: 'weekly',
				priority: 0.8,
			})

			for (const cuisine of city.cuisines) {
				routes.push({
					url: `${BASE_URL}/restaurants/${city.citySlug}/${cuisine}`,
					changeFrequency: 'weekly',
					priority: 0.7,
				})
			}
		}

		for (const restaurant of data.restaurants) {
			routes.push({
				url: `${BASE_URL}/restaurant/${restaurant.slug}`,
				lastModified: restaurant.updatedAt ? new Date(restaurant.updatedAt) : undefined,
				changeFrequency: 'weekly',
				priority: 0.6,
			})
		}
	} catch (error) {
		// Sitemap nie może wywalić builda — w razie błędu zwracamy same strony statyczne
		console.error('Sitemap generation error:', error)
	}

	return routes
}
