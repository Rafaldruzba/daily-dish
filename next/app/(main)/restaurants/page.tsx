import type { Metadata } from 'next'
import Link from 'next/link'
import RestaurantExplorer from '@/components/restaurants/RestaurantExplorer'

const API_URL =
	process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const metadata: Metadata = {
	title: 'Restauracje — katalog lokali i kuchni',
	description:
		'Przeglądaj restauracje w Polsce. Filtruj po mieście i rodzaju kuchni, sprawdź menu, zdjęcia i opinie w BistroMapa.',
	alternates: {
		canonical: 'https://bistromapa.app/restaurants',
	},
}

interface CityOption {
	city: string
	citySlug: string
	restaurantCount: number
}

async function getCities(): Promise<CityOption[]> {
	try {
		const response = await fetch(`${API_URL}/seo/cities`, { next: { revalidate: 3600 } })
		if (!response.ok) return []

		return await response.json()
	} catch {
		return []
	}
}

export default async function RestaurantsPage() {
	const cities = await getCities()

	return (
		<main className='min-h-screen bg-[#fdfdfd]'>
			<section className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
				<div className='mb-10'>
					<h1 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>
						Restauracje w Polsce
					</h1>

					<p className='mt-3 max-w-2xl text-stone-600'>
						Znajdź restauracje po mieście i rodzaju kuchni. Sprawdź menu dnia, zdjęcia i opinie.
					</p>
				</div>

				{/* Linkowanie wewnętrzne renderowane po stronie serwera — bez tego strony miast są osierocone */}
				{cities.length > 0 && (
					<nav className='mb-10'>
						<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 mb-4'>
							Przeglądaj miasta
						</h2>
						<div className='flex flex-wrap gap-2'>
							{cities.map(item => (
								<Link
									key={item.citySlug}
									href={`/restaurants/${item.citySlug}`}
									className='px-3 py-1.5 border border-stone-200 bg-white text-stone-600 hover:border-black hover:text-black transition-colors font-mono text-[10px] uppercase tracking-wider font-bold'>
									{item.city} ({item.restaurantCount})
								</Link>
							))}
						</div>
					</nav>
				)}

				<RestaurantExplorer cities={cities} />
			</section>
		</main>
	)
}
