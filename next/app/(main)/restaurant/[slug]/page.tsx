import type { Metadata } from 'next'
import RestaurantDetailClient from '@/components/restaurants/RestaurantDetailClient'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface RestaurantPageProps {
	params: Promise<{
		slug: string
	}>
}

interface RestaurantSeoData {
	id: string
	name: string
	slug: string
	city: string
	citySlug: string
	address: string | null
	phone: string | null
	description: string | null
	rating: number | null
	cuisines: string[]
	latitude: number | null
	longitude: number | null
}

async function getRestaurant(slug: string): Promise<RestaurantSeoData | null> {
	try {
		const response = await fetch(`${API_URL}/restaurants/${slug}`, { next: { revalidate: 600 } })
		if (!response.ok) return null

		return await response.json()
	} catch {
		return null
	}
}

export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
	const { slug } = await params
	const restaurant = await getRestaurant(slug)

	if (!restaurant) {
		return {
			title: 'Restauracja nie znaleziona',
			robots: { index: false, follow: true },
		}
	}

	const description =
		restaurant.description?.slice(0, 155) ??
		`${restaurant.name} — restauracja w ${restaurant.city}. Sprawdź menu dnia, zdjęcia i opinie w BistroMapa.`

	return {
		title: `${restaurant.name} — restauracja w ${restaurant.city}`,
		description,
		alternates: {
			canonical: `https://bistromapa.app/restaurant/${restaurant.slug}`,
		},
		openGraph: {
			type: 'website',
			title: `${restaurant.name} — restauracja w ${restaurant.city}`,
			description,
			url: `https://bistromapa.app/restaurant/${restaurant.slug}`,
		},
	}
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
	const { slug } = await params
	const restaurant = await getRestaurant(slug)

	// JSON-LD tylko dla realnie istniejącego lokalu
	const jsonLd = restaurant
		? {
				'@context': 'https://schema.org',
				'@type': 'Restaurant',
				name: restaurant.name,
				url: `https://bistromapa.app/restaurant/${restaurant.slug}`,
				...(restaurant.description && { description: restaurant.description }),
				...(restaurant.phone && { telephone: restaurant.phone }),
				address: {
					'@type': 'PostalAddress',
					streetAddress: restaurant.address || undefined,
					addressLocality: restaurant.city,
					addressCountry: 'PL',
				},
				...(restaurant.latitude !== null &&
					restaurant.longitude !== null && {
						geo: {
							'@type': 'GeoCoordinates',
							latitude: restaurant.latitude,
							longitude: restaurant.longitude,
						},
					}),
				...(restaurant.rating && {
					aggregateRating: {
						'@type': 'AggregateRating',
						ratingValue: restaurant.rating,
						bestRating: 5,
					},
				}),
				...(restaurant.cuisines.length > 0 && { servesCuisine: restaurant.cuisines }),
			}
		: null

	return (
		<>
			{jsonLd && (
				<script
					type='application/ld+json'
					dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
				/>
			)}

			<RestaurantDetailClient />
		</>
	)
}
