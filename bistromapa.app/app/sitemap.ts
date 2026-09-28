import type { MetadataRoute } from 'next'

const BASE_URL = 'https://bistromapa.app'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface CityCuisine {
	name: string
	slug: string
	count: number
	seoEnabled: boolean
}

interface CitySeoData {
	city: string
	citySlug: string
	restaurantCount: number
	seoEnabled: boolean
	cuisines: CityCuisine[]
}

interface RestaurantSeoData {
	slug: string
	citySlug?: string
	updatedAt?: string
}

async function getCities(): Promise<CitySeoData[]> {
	try {
		const response = await fetch(`${API_URL}/seo/cities`, {
			next: {
				revalidate: 3600,
			},
		})

		if (!response.ok) {
			return []
		}

		return await response.json()
	} catch {
		return []
	}
}

async function getRestaurants(): Promise<RestaurantSeoData[]> {
	try {
		const response = await fetch(`${API_URL}/restaurants`, {
			next: {
				revalidate: 3600,
			},
		})

		if (!response.ok) {
			return []
		}

		const data = await response.json()

		// Obsługa zarówno [] jak i { restaurants: [] }
		if (Array.isArray(data)) {
			return data
		}

		if (Array.isArray(data.restaurants)) {
			return data.restaurants
		}

		return []
	} catch {
		return []
	}
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const [cities, restaurants] = await Promise.all([getCities(), getRestaurants()])

	const staticPages: MetadataRoute.Sitemap = [
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

	const cityPages: MetadataRoute.Sitemap = cities
		.filter(city => city.seoEnabled && city.restaurantCount > 0)
		.map(city => ({
			url: `${BASE_URL}/restaurants/${city.citySlug}`,
			changeFrequency: 'daily' as const,
			priority: 0.8,
		}))

	const categoryPages: MetadataRoute.Sitemap = cities.flatMap(city => {
		if (!city.seoEnabled || city.restaurantCount <= 0) {
			return []
		}

		return city.cuisines
			.filter(cuisine => cuisine.seoEnabled && cuisine.count > 0)
			.map(cuisine => ({
				url: `${BASE_URL}/restaurants/${city.citySlug}/${cuisine.slug}`,
				changeFrequency: 'daily' as const,
				priority: 0.7,
			}))
	})

	const restaurantPages: MetadataRoute.Sitemap = restaurants.map(restaurant => ({
		url: `${BASE_URL}/restaurant/${restaurant.slug}`,
		...(restaurant.updatedAt && {
			lastModified: new Date(restaurant.updatedAt),
		}),
		changeFrequency: 'daily' as const,
		priority: 0.8,
	}))

	return [...staticPages, ...cityPages, ...categoryPages, ...restaurantPages]
}
