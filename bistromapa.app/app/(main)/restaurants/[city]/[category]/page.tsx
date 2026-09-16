import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RestaurantCatalog from '@/components/restaurants/RestaurantCatalog'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

interface CategoryPageProps {
	params: Promise<{
		city: string
		category: string
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
 * null  -> miasto nie istnieje (404)
 * undefined -> błąd backendu (nie chcemy fałszywego 404 przy chwilowej awarii)
 */
async function getCityData(citySlug: string): Promise<CitySeoData | null | undefined> {
	try {
		const response = await fetch(`${API_URL}/seo/cities/${citySlug}`, { next: { revalidate: 3600 } })
		if (response.status === 404) return null
		if (!response.ok) return undefined

		return await response.json()
	} catch {
		return undefined
	}
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
	const { city, category } = await params
	const citySlug = decodeURIComponent(city).toLowerCase()
	const cuisineSlug = decodeURIComponent(category).toLowerCase()

	const data = await getCityData(citySlug)
	const cityName = data?.city ?? decodeURIComponent(city)
	const cuisine = data?.cuisines.find(item => item.slug === cuisineSlug)
	const cuisineName = cuisine?.name ?? decodeURIComponent(category)

	return {
		title: `${cuisineName} w ${cityName} — najlepsze lokale`,
		description: `Restauracje ${cuisineName.toLowerCase()} w ${cityName}. Sprawdź menu, zdjęcia i opinie lokali w BistroMapa.`,
		alternates: {
			canonical: `https://bistromapa.app/restaurants/${citySlug}/${cuisineSlug}`,
		},
		// Kategoria bez realnej treści (poniżej progu) nie powinna trafiać do indeksu
		...((!cuisine || !cuisine.seoEnabled) && { robots: { index: false, follow: true } }),
	}
}

export default async function CategoryRestaurantsPage({ params }: CategoryPageProps) {
	const { city, category } = await params
	const citySlug = decodeURIComponent(city).toLowerCase()
	const cuisineSlug = decodeURIComponent(category).toLowerCase()

	const data = await getCityData(citySlug)
	const cityName = data?.city ?? decodeURIComponent(city)
	const cuisine = data?.cuisines.find(item => item.slug === cuisineSlug)

	// Miasto nie istnieje albo kuchnia nie występuje w tym mieście = brak treści
	if (data === null || (data && !cuisine)) notFound()

	const cuisineName = cuisine?.name ?? decodeURIComponent(category)

	const otherCuisines = data?.cuisines.filter(item => item.seoEnabled && item.slug !== cuisineSlug) ?? []

	return (
		<main className='min-h-screen bg-[#fdfdfd]'>
			<section className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
				<nav className='mb-6 font-mono text-[10px] uppercase tracking-wider text-stone-400 font-bold'>
					<Link href='/restaurants' className='hover:text-black transition-colors'>
						Restauracje
					</Link>
					<span className='mx-2'>/</span>
					<Link href={`/restaurants/${citySlug}`} className='hover:text-black transition-colors'>
						{cityName}
					</Link>
					<span className='mx-2'>/</span>
					<span className='text-stone-600'>{cuisineName}</span>
				</nav>

				<div className='mb-10'>
					<h1 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
						{cuisineName} w {cityName}
					</h1>

					<p className='mt-3 max-w-2xl text-stone-600'>
						Restauracje {cuisineName.toLowerCase()} w {cityName}. Sprawdź menu, zdjęcia i opinie.
					</p>

					{cuisine && (
						<p className='mt-3 font-mono text-xs uppercase tracking-widest text-stone-400'>
							{cuisine.count} restauracji
						</p>
					)}
				</div>

				{otherCuisines.length > 0 && (
					<nav className='mb-10 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
						{otherCuisines.map(item => (
							<Link
								key={item.slug}
								href={`/restaurants/${citySlug}/${item.slug}`}
								className='px-3 py-1.5 border border-stone-200 text-stone-600 hover:border-black hover:text-black transition-colors bg-white'>
								{item.name} ({item.count})
							</Link>
						))}
					</nav>
				)}

				<RestaurantCatalog citySlug={citySlug} cuisine={cuisineSlug} />
			</section>
		</main>
	)
}
