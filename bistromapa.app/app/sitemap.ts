import type { MetadataRoute } from 'next'
import { BASE_URL, LOCALES } from '@/lib/seo'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface SeoSitemapData {
	cities: Array<{ citySlug: string; cuisines: string[] }>
	restaurants: Array<{ slug: string; updatedAt?: string }>
}

/**
 * Używamy dedykowanego /seo/sitemap, a nie /seo/cities — tamten nie zwraca `cuisines`,
 * przez co lista kategorii zawsze była pusta (i wywalała build). Ten endpoint sam
 * stosuje progi SEO (min. 3 lokale w mieście / kategorii).
 *
 * Timeout jest konieczny: sitemap jest prerenderowana przy buildzie, a fetch bez
 * sygnału potrafi zawiesić cały build, gdy API nie odpowiada.
 */
async function getSeoData(): Promise<SeoSitemapData> {
	try {
		const response = await fetch(`${API_URL}/seo/sitemap`, {
			signal: AbortSignal.timeout(10_000),
			next: {
				revalidate: 3600,
			},
		})

		if (!response.ok) {
			return { cities: [], restaurants: [] }
		}

		const data = await response.json()

		return {
			cities: Array.isArray(data?.cities) ? data.cities : [],
			restaurants: Array.isArray(data?.restaurants) ? data.restaurants : [],
		}
	} catch {
		return { cities: [], restaurants: [] }
	}
}

type EntryOptions = {
	lastModified?: Date
	changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']
	priority: number
}

/**
 * Aplikacja serwuje treść pod /{locale}/... (localePrefix: 'always'), więc każda
 * ścieżka musi trafić do sitemapy w obu wersjach językowych, z wzajemnymi hreflang.
 */
function localizedEntries(path: string, options: EntryOptions): MetadataRoute.Sitemap {
	const clean = path === '/' ? '' : path

	const languages: Record<string, string> = {}
	for (const locale of LOCALES) {
		languages[locale] = `${BASE_URL}/${locale}${clean}`
	}

	return LOCALES.map(locale => ({
		url: `${BASE_URL}/${locale}${clean}`,
		alternates: { languages },
		...options,
	}))
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
	const { cities, restaurants } = await getSeoData()

	const staticPages = [
		...localizedEntries('/', { changeFrequency: 'daily', priority: 1 }),
		...localizedEntries('/restaurants', { changeFrequency: 'daily', priority: 0.9 }),
	]

	const cityPages = cities
		.filter(city => Boolean(city?.citySlug))
		.flatMap(city => localizedEntries(`/restaurants/${city.citySlug}`, { changeFrequency: 'daily', priority: 0.8 }))

	const categoryPages = cities
		.filter(city => Boolean(city?.citySlug))
		.flatMap(city =>
			(city.cuisines ?? []).flatMap(cuisine =>
				localizedEntries(`/restaurants/${city.citySlug}/${cuisine}`, {
					changeFrequency: 'daily',
					priority: 0.7,
				}),
			),
		)

	const restaurantPages = restaurants
		.filter(restaurant => Boolean(restaurant?.slug))
		.flatMap(restaurant =>
			localizedEntries(`/restaurant/${restaurant.slug}`, {
				...(restaurant.updatedAt && { lastModified: new Date(restaurant.updatedAt) }),
				changeFrequency: 'daily',
				priority: 0.8,
			}),
		)

	return [...staticPages, ...cityPages, ...categoryPages, ...restaurantPages]
}
