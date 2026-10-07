import type { Metadata } from 'next'
import { Link } from '@/lib/navigation'
import { notFound } from 'next/navigation'

import RestaurantCatalog from '@/components/restaurants/RestaurantCatalog'
import { getTranslations } from 'next-intl/server'

const BASE_URL = 'https://bistromapa.app'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface CityPageProps {
	params: Promise<{
		city: string
	}>
}

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

/**
 * null      -> miasto nie istnieje -> 404
 * undefined -> błąd backendu -> nie robimy fałszywego 404
 */
async function getCityData(citySlug: string): Promise<CitySeoData | null | undefined> {
	try {
		const response = await fetch(`${API_URL}/seo/cities/${encodeURIComponent(citySlug)}`, {
			next: {
				revalidate: 3600,
			},
		})

		if (response.status === 404) {
			return null
		}

		if (!response.ok) {
			return undefined
		}

		const data = await response.json()

		return {
			city: data.city,
			citySlug: data.citySlug,
			restaurantCount: Number(data.restaurantCount) || 0,
			seoEnabled: Boolean(data.seoEnabled),
			cuisines: Array.isArray(data.cuisines)
				? data.cuisines.map((item: CityCuisine) => ({
						name: item.name,
						slug: item.slug,
						count: Number(item.count) || 0,
						seoEnabled: Boolean(item.seoEnabled),
					}))
				: [],
		}
	} catch {
		return undefined
	}
}

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
	const { city } = await params

	const citySlug = decodeURIComponent(city).toLowerCase()
	const data = await getCityData(citySlug)

	if (data === null) {
		return {
			title: 'Miasto nie znalezione | BistroMapa',
			robots: {
				index: false,
				follow: true,
			},
		}
	}

	const cityName = data?.city ?? decodeURIComponent(city)

	const title = `Restauracje w ${cityName} — lokale, menu i opinie`

	const description =
		data && data.restaurantCount > 0
			? `Znajdź restauracje w ${cityName}. Przeglądaj ${data.restaurantCount} lokali, sprawdź menu, zdjęcia, opinie i rodzaje kuchni w BistroMapa.`
			: `Znajdź restauracje w ${cityName}. Sprawdź lokale, menu, zdjęcia i opinie w BistroMapa.`

	const canonicalUrl = `${BASE_URL}/restaurants/${citySlug}`
	const imageUrl = `${BASE_URL}/logo.png`

	return {
		title,
		description,

		alternates: {
			canonical: canonicalUrl,
		},

		robots: {
			index: data?.seoEnabled !== false,
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
					alt: `Restauracje w ${cityName} — BistroMapa`,
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

export default async function CityRestaurantsPage({ params }: CityPageProps) {
	const { city } = await params
	const t = await getTranslations('Restaurant-City')

	const citySlug = decodeURIComponent(city).toLowerCase()
	const data = await getCityData(citySlug)

	if (data === null) {
		notFound()
	}

	const cityName = data?.city ?? decodeURIComponent(city)

	const seoLinks = data?.cuisines.filter(cuisine => cuisine.seoEnabled && cuisine.count > 0) ?? []

	const canonicalUrl = `${BASE_URL}/restaurants/${citySlug}`

	const breadcrumbJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Restauracje',
				item: `${BASE_URL}/restaurants`,
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: cityName,
				item: canonicalUrl,
			},
		],
	}

	const collectionPageJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `Restauracje w ${cityName}`,
		url: canonicalUrl,
		description: `Restauracje w ${cityName} — lokale, menu, zdjęcia i opinie w BistroMapa.`,
		isPartOf: {
			'@type': 'WebSite',
			name: 'BistroMapa',
			url: BASE_URL,
		},
	}

	return (
		<>
			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(breadcrumbJsonLd),
				}}
			/>

			<script
				type='application/ld+json'
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(collectionPageJsonLd),
				}}
			/>

			<main className='min-h-screen bg-[#fdfdfd]'>
				<section className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
					<nav
						aria-label='Breadcrumb'
						className='mb-6 font-mono text-[10px] uppercase tracking-wider text-stone-400 font-bold'>
						<Link href='/restaurants' className='hover:text-black transition-colors'>
							{t('restaurants')}
						</Link>

						<span className='mx-2'>/</span>

						<span className='text-stone-600'>{cityName}</span>
					</nav>

					<header className='mb-10'>
						<h1 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
							{t('restaurants-in')} {cityName}
						</h1>

						<p className='mt-3 max-w-2xl text-stone-600'>
							{t('search1')} {cityName}
							{t('search2')} {cityName} {t('search3')}
						</p>

						{data && (
							<p className='mt-3 font-mono text-xs uppercase tracking-widest text-stone-400'>
								{data.restaurantCount}{' '}
								{data.restaurantCount === 1
									? t('restaurant-a')
									: data.restaurantCount >= 2 && data.restaurantCount <= 4
										? t('restaurant-e')
										: t('restaurant-i')}
							</p>
						)}
					</header>

					{seoLinks.length > 0 && (
						<nav aria-label={`Rodzaje kuchni w ${cityName}`} className='mb-10'>
							<h2 className='mb-4 font-mono text-xs uppercase tracking-widest text-stone-400'>
								R{t('restaurants-by-cuisine')}
							</h2>

							<div className='flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
								{seoLinks.map(item => (
									<Link
										key={item.slug}
										href={`/restaurants/${citySlug}/${item.slug}`}
										className='px-3 py-1.5 border border-stone-200 text-stone-600 hover:border-black hover:text-black transition-colors bg-white'>
										{item.name} ({item.count})
									</Link>
								))}
							</div>
						</nav>
					)}

					<RestaurantCatalog citySlug={citySlug} />
				</section>
			</main>
		</>
	)
}
