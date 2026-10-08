import type { Metadata } from 'next'
import { Link } from '@/lib/navigation'
import { notFound } from 'next/navigation'

import RestaurantCatalog from '@/components/restaurants/RestaurantCatalog'
import { getTranslations } from 'next-intl/server'

const BASE_URL = 'https://bistromapa.app'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface CategoryPageProps {
	params: Promise<{
		city: string
		category: string
		locale: string
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

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
	const { city, category, locale } = await params

	const citySlug = decodeURIComponent(city).toLowerCase()
	const cuisineSlug = decodeURIComponent(category).toLowerCase()

	const data = await getCityData(citySlug)

	if (data === null) {
		return {
			title: 'Strona nie znaleziona | BistroMapa',
			robots: {
				index: false,
				follow: true,
			},
		}
	}

	const cityName = data?.city ?? decodeURIComponent(city)
	const cuisine = data?.cuisines.find(item => item.slug === cuisineSlug)
	const cuisineName = cuisine?.name ?? decodeURIComponent(category)

	const canonicalUrl = `${BASE_URL}/${locale}/restaurants/${citySlug}/${cuisineSlug}`
	const title = `${cuisineName} w ${cityName} — restauracje`

	const description =
		cuisine && cuisine.count > 0
			? `Restauracje ${cuisineName.toLowerCase()} w ${cityName}. Znajdź ${cuisine.count} lokali, sprawdź menu, zdjęcia i opinie w BistroMapa.`
			: `Restauracje ${cuisineName.toLowerCase()} w ${cityName}. Sprawdź lokale, menu, zdjęcia i opinie w BistroMapa.`

	const shouldIndex = Boolean(cuisine) && Boolean(cuisine?.seoEnabled) && (cuisine?.count ?? 0) > 0

	return {
		title,
		description,

		alternates: {
			canonical: canonicalUrl,
		},

		robots: {
			index: shouldIndex,
			follow: true,
		},

		openGraph: {
			type: 'website',
			locale: locale === 'pl' ? 'pl_PL' : 'en_US',
			url: canonicalUrl,
			siteName: 'BistroMapa',
			title,
			description,
			images: [
				{
					url: `${BASE_URL}/logo.png`,
					width: 1200,
					height: 630,
					alt: `${cuisineName} w ${cityName} — BistroMapa`,
				},
			],
		},

		twitter: {
			card: 'summary_large_image',
			title,
			description,
			images: [`${BASE_URL}/logo.png`],
		},
	}
}

export default async function CategoryRestaurantsPage({ params }: CategoryPageProps) {
	const { city, category, locale } = await params
	const t = await getTranslations({ locale, namespace: 'CategoryPage' })

	const citySlug = decodeURIComponent(city).toLowerCase()
	const cuisineSlug = decodeURIComponent(category).toLowerCase()

	const data = await getCityData(citySlug)

	if (data === null) {
		notFound()
	}

	const cityName = data?.city ?? decodeURIComponent(city)
	const cuisine = data?.cuisines.find(item => item.slug === cuisineSlug)

	if (data && !cuisine) {
		notFound()
	}

	const cuisineName = cuisine?.name ?? decodeURIComponent(category)

	const otherCuisines =
		data?.cuisines.filter(item => item.seoEnabled && item.count > 0 && item.slug !== cuisineSlug) ?? []

	const canonicalUrl = `${BASE_URL}/${locale}/restaurants/${citySlug}/${cuisineSlug}`

	const breadcrumbJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'BreadcrumbList',
		itemListElement: [
			{
				'@type': 'ListItem',
				position: 1,
				name: 'Restauracje',
				item: `${BASE_URL}/${locale}/restaurants`,
			},
			{
				'@type': 'ListItem',
				position: 2,
				name: cityName,
				item: `${BASE_URL}/${locale}/restaurants/${citySlug}`,
			},
			{
				'@type': 'ListItem',
				position: 3,
				name: cuisineName,
				item: canonicalUrl,
			},
		],
	}

	const collectionPageJsonLd = {
		'@context': 'https://schema.org',
		'@type': 'CollectionPage',
		name: `${cuisineName} w ${cityName}`,
		url: canonicalUrl,
		description: `Restauracje ${cuisineName.toLowerCase()} w ${cityName}.`,
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

						<Link href={`/restaurants/${citySlug}`} className='hover:text-black transition-colors'>
							{cityName}
						</Link>

						<span className='mx-2'>/</span>

						<span className='text-stone-600'>{cuisineName}</span>
					</nav>

					<header className='mb-10'>
						<h1 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
							{cuisineName} {t('in')} {cityName}
						</h1>

						<p className='mt-3 max-w-2xl text-stone-600'>
							{t('restaurants')} {cuisineName.toLowerCase()} {t('in')} {cityName}. {t('text')}
						</p>

						{cuisine && (
							<p className='mt-3 font-mono text-xs uppercase tracking-widest text-stone-400'>
								{cuisine.count}{' '}
								{cuisine.count === 1
									? t('restaurant-a')
									: cuisine.count >= 2 && cuisine.count <= 4
										? t('restaurant-e')
										: t('restaurant-i')}
							</p>
						)}
					</header>

					{otherCuisines.length > 0 && (
						<nav aria-label={`${t('aria-label')} ${cityName}`} className='mb-10'>
							<h2 className='mb-4 font-mono text-xs uppercase tracking-widest text-stone-400'>{t('cuisine')}</h2>

							<div className='flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
								{otherCuisines.map(item => (
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

					<RestaurantCatalog citySlug={citySlug} cuisine={cuisineSlug} />
				</section>
			</main>
		</>
	)
}
