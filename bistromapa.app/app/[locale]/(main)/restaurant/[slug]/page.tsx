import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import RestaurantDetailClient from '@/components/restaurants/RestaurantDetailClient'
import { useTranslations } from 'next-intl'

const BASE_URL = 'https://bistromapa.app'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

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
	reviewCount?: number

	cuisines: string[]

	backgroundImageUrl?: string | null

	latitude: number | null
	longitude: number | null
}

interface RestaurantPageProps {
	params: Promise<{
		slug: string
	}>
}

/**
 * Pobiera dane restauracji potrzebne zarówno do metadata,
 * jak i do renderowania strony.
 *
 * null = restauracja nie istnieje / API zwróciło 404
 */
async function getRestaurant(slug: string): Promise<RestaurantSeoData | null> {
	try {
		const response = await fetch(`${API_URL}/restaurants/${encodeURIComponent(slug)}`, {
			next: {
				revalidate: 600,
			},
		})

		if (response.status === 404) {
			return null
		}

		if (!response.ok) {
			return null
		}

		const data = await response.json()

		return {
			...data,
			backgroundImageUrl: data.backgroundImageUrl || null,
			cuisines: Array.isArray(data.cuisines) ? data.cuisines : [],
			rating: data.rating ?? null,
			reviewCount: data.reviewCount ?? undefined,
			latitude: data.latitude ?? null,
			longitude: data.longitude ?? null,
		}
	} catch {
		return null
	}
}

/**
 * Dynamiczne SEO dla konkretnej restauracji.
 */
export async function generateMetadata({ params }: RestaurantPageProps): Promise<Metadata> {
	const { slug } = await params

	const restaurant = await getRestaurant(slug)

	if (!restaurant) {
		return {
			title: 'Restauracja nie znaleziona | BistroMapa',
			description: 'Nie znaleziono restauracji o podanym adresie.',
			robots: {
				index: false,
				follow: true,
			},
		}
	}

	const title = `${restaurant.name} — restauracja w ${restaurant.city}`

	const description =
		restaurant.description?.trim().slice(0, 155) ||
		`${restaurant.name} — restauracja w ${restaurant.city}. Sprawdź menu, zdjęcia, opinie i informacje o lokalu w BistroMapa.`

	const canonicalUrl = `${BASE_URL}/restaurant/${restaurant.slug}`

	const imageUrl = restaurant.backgroundImageUrl || `${BASE_URL}/logo.png`

	return {
		title,

		description,

		alternates: {
			canonical: canonicalUrl,
		},

		robots: {
			index: true,
			follow: true,
		},

		openGraph: {
			type: 'website',
			locale: 'pl_PL',
			url: canonicalUrl,
			siteName: 'BistroMapa',
			title,
			description,

			images: [
				{
					url: imageUrl,
					width: 1200,
					height: 630,
					alt: restaurant.name,
				},
			],
		},

		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [imageUrl],
		},
	}
}

export default async function RestaurantPage({ params }: RestaurantPageProps) {
	const t = useTranslations('Restaurant-slug')
	const { slug } = await params
	const restaurant = await getRestaurant(slug)

	/**
	 * Prawdziwy HTTP 404 zamiast renderowania pustej strony.
	 */
	if (!restaurant) {
		notFound()
	}

	const restaurantUrl = `${BASE_URL}/restaurant/${restaurant.slug}`
	const cityUrl = `${BASE_URL}/restaurants/${restaurant.citySlug}`
	const restaurantsUrl = `${BASE_URL}/restaurants`

	/**
	 * Schema.org — Restaurant
	 */
	const restaurantJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'Restaurant',

		name: restaurant.name,

		url: restaurantUrl,

		...(restaurant.description && {
			description: restaurant.description,
		}),

		...(restaurant.phone && {
			telephone: restaurant.phone,
		}),

		address: {
			'@type': 'PostalAddress',

			...(restaurant.address && {
				streetAddress: restaurant.address,
			}),

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

		...(restaurant.backgroundImageUrl && {
			image: [restaurant.backgroundImageUrl],
		}),

		...(restaurant.cuisines.length > 0 && {
			servesCuisine: restaurant.cuisines,
		}),

		...(restaurant.rating !== null &&
			restaurant.reviewCount &&
			restaurant.reviewCount > 0 && {
				aggregateRating: {
					'@type': 'AggregateRating',
					ratingValue: restaurant.rating,
					bestRating: 5,
					worstRating: 1,
					ratingCount: restaurant.reviewCount,
				},
			}),
	}

	/**
	 * Schema.org — BreadcrumbList
	 */
	const breadcrumbJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',

		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Restauracje',
				item: restaurantsUrl,
			},

			{
				'@type': 'ListItem',
				position: 2,
				name: restaurant.city,
				item: cityUrl,
			},

			{
				'@type': 'ListItem',
				position: 3,
				name: restaurant.name,
				item: restaurantUrl,
			},
		],
	}

	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(restaurantJsonLd),
				}}
			/>

			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbJsonLd),
				}}
			/>

			<Suspense
				fallback={
					<div className='flex min-h-[50vh] items-center justify-center'>
						<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>{t('profile')}</p>
					</div>
				}>
				<RestaurantDetailClient />
			</Suspense>
		</>
	)
}
