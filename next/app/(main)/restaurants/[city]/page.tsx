import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RestaurantCatalog from '@/components/restaurants/RestaurantCatalog'

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

export async function generateMetadata({ params }: CityPageProps): Promise<Metadata> {
	const { city } = await params
	const citySlug = decodeURIComponent(city).toLowerCase()
	const data = await getCityData(citySlug)
	const cityName = data?.city ?? decodeURIComponent(city)

	return {
		title: `Restauracje w ${cityName} — lokale, menu i opinie`,
		description: `Znajdź restauracje w ${cityName}. Sprawdź menu, zdjęcia, opinie i informacje o lokalach w BistroMapa.`,
		alternates: {
			canonical: `https://bistromapa.app/restaurants/${citySlug}`,
		},
		// Strona działa zawsze, ale indeksujemy ją dopiero od progu restauracji (unikanie thin content)
		...(data && !data.seoEnabled && { robots: { index: false, follow: true } }),
	}
}

export default async function CityRestaurantsPage({ params }: CityPageProps) {
	const { city } = await params
	const citySlug = decodeURIComponent(city).toLowerCase()
	const data = await getCityData(citySlug)

	if (data === null) notFound()

	const cityName = data?.city ?? decodeURIComponent(city)

	// Linkujemy tylko kategorie z realną treścią (próg po stronie backendu)
	const seoLinks = data?.cuisines.filter(cuisine => cuisine.seoEnabled) ?? []

	return (
		<main className='min-h-screen bg-[#fdfdfd]'>
			<section className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
				<nav className='mb-6 font-mono text-[10px] uppercase tracking-wider text-stone-400 font-bold'>
					<Link href='/restaurants' className='hover:text-black transition-colors'>
						Restauracje
					</Link>
					<span className='mx-2'>/</span>
					<span className='text-stone-600'>{cityName}</span>
				</nav>

				<div className='mb-10'>
					<h1 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
						Restauracje w {cityName}
					</h1>

					<p className='mt-3 max-w-2xl text-stone-600'>
						Znajdź restauracje w {cityName}. Sprawdź menu, zdjęcia, opinie i informacje o lokalach
						znajdujących się w {cityName} i okolicach.
					</p>

					{data && (
						<p className='mt-3 font-mono text-xs uppercase tracking-widest text-stone-400'>
							{data.restaurantCount} restauracji
						</p>
					)}
				</div>

				{seoLinks.length > 0 && (
					<nav className='mb-10 flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
						{seoLinks.map(item => (
							<Link
								key={item.slug}
								href={`/restaurants/${citySlug}/${item.slug}`}
								className='px-3 py-1.5 border border-stone-200 text-stone-600 hover:border-black hover:text-black transition-colors bg-white'>
								{item.name} ({item.count})
							</Link>
						))}
					</nav>
				)}

				<RestaurantCatalog citySlug={citySlug} />
			</section>
		</main>
	)
}
