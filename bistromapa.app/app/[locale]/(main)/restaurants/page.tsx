import type { Metadata } from 'next'
import { Link } from '@/lib/navigation'
import RestaurantExplorer from '@/components/restaurants/RestaurantExplorer'
import { getTranslations } from 'next-intl/server'
import { alternatesFor, ogLocale } from '@/lib/seo'

const API_URL = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

const CATALOG_TITLE = 'Restauracje — katalog lokali i kuchni'
const CATALOG_DESCRIPTION =
	'Przeglądaj restauracje w Polsce. Filtruj po mieście i rodzaju kuchni, sprawdź menu, zdjęcia i opinie w BistroMapa.'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
	const { locale } = await params

	return {
		title: CATALOG_TITLE,
		description: CATALOG_DESCRIPTION,
		alternates: alternatesFor('/restaurants', locale),
		// openGraph trzeba podać jawnie: gdy strona go zadeklaruje, Next podmienia cały
		// obiekt z layoutu, więc bez tego og:title zostałby tytułem strony głównej.
		openGraph: {
			locale: ogLocale(locale),
			title: CATALOG_TITLE,
			description: CATALOG_DESCRIPTION,
		},
	}
}

interface CityOption {
	city: string
	citySlug: string
	restaurantCount: number
}

type Props = {
	params: Promise<{ locale: string }>
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

export default async function RestaurantsPage({ params }: Props) {
	const { locale } = await params

	const t = await getTranslations({ locale, namespace: 'RestaurantsPage' })
	const cities = await getCities()

	return (
		<main className='min-h-screen bg-[#fdfdfd]'>
			<section className='mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8'>
				<div className='mb-10'>
					<h1 className='text-3xl font-bold tracking-tight text-stone-900 sm:text-4xl'>{t('restaurants-in-city')}</h1>

					<p className='mt-3 max-w-2xl text-stone-600'>{t('search-restaurants')}</p>
				</div>

				{cities.length > 0 && (
					<nav className='mb-10'>
						<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 mb-4'>{t('search-city')}</h2>
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
