'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import RestaurantCard from './RestaurantCard'
import { Restaurant } from '@/lib/types'
import { API_URL } from '@/lib/api'
import { trackEvent } from '@/lib/analytics'
import { useTranslations } from 'next-intl'

interface CityOption {
	city: string
	citySlug: string
	restaurantCount: number
}

export default function RestaurantExplorer({ cities }: { cities: CityOption[] }) {
	const t = useTranslations('Explorer')
	const router = useRouter()
	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [loading, setLoading] = useState(true)
	const [search, setSearch] = useState('')

	const loadRestaurants = useCallback(async () => {
		try {
			setLoading(true)

			const params = new URLSearchParams()
			if (search.trim()) params.set('search', search.trim())

			const query = params.toString()
			const response = await fetch(`${API_URL}/restaurants${query ? `?${query}` : ''}`)
			if (!response.ok) throw new Error(t('error'))
			trackEvent('search', {
				search_term: query,
			})
			setRestaurants(await response.json())
		} catch (error) {
			console.error('Błąd pobierania restauracji:', error)
			setRestaurants([])
		} finally {
			setLoading(false)
		}
	}, [search])

	// Debounce, żeby wpisywanie nazwy nie bombardowało API
	useEffect(() => {
		const timer = setTimeout(loadRestaurants, 300)
		return () => clearTimeout(timer)
	}, [loadRestaurants])

	// Wybór miasta prowadzi do jego strony — struktura URL jest jedynym źródłem prawdy
	const goToCity = (value: string) => {
		const typed = value.trim().toLowerCase()
		if (!typed) return

		const match = cities.find(city => city.city.toLowerCase() === typed || city.citySlug === typed)
		if (match) {
			router.push(`/restaurants/${match.citySlug}`)
			trackEvent('search', {
				search_term: typed,
			})
		}
	}

	return (
		<div className='space-y-10'>
			<div className='border border-stone-200 bg-stone-50 p-5 grid grid-cols-1 md:grid-cols-2 gap-4'>
				<div className='space-y-1.5'>
					<label
						htmlFor='city-filter'
						className='text-[10px] uppercase tracking-wider font-mono font-bold text-stone-600 block'>
						{t('city')}
					</label>
					<input
						id='city-filter'
						type='text'
						list='cities-list'
						placeholder={t('input-placeholder')}
						onChange={e => goToCity(e.target.value)}
						onKeyDown={e => {
							if (e.key === 'Enter') goToCity((e.target as HTMLInputElement).value)
						}}
						className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs font-sans bg-white'
					/>
					<datalist id='cities-list'>
						{cities.map(item => (
							<option key={item.citySlug} value={item.city}>
								{item.restaurantCount} {t('restaurants-count')}
							</option>
						))}
					</datalist>
					<p className='text-[9px] text-stone-400 font-mono'>{t('city-description')}</p>
				</div>

				<div className='space-y-1.5'>
					<label
						htmlFor='search-filter'
						className='text-[10px] uppercase tracking-wider font-mono font-bold text-stone-600 block'>
						{t('restaurant-name')}
					</label>
					<div className='relative'>
						<Search className='w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2' />
						<input
							id='search-filter'
							type='text'
							value={search}
							onChange={e => setSearch(e.target.value)}
							placeholder={t('input-placeholder2')}
							className='w-full pl-9 pr-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs font-sans bg-white'
						/>
					</div>
					<p className='text-[9px] text-stone-400 font-mono'>{t('filter-list')}</p>
				</div>
			</div>

			<section>
				{loading ? (
					<div className='grid gap-6 sm:grid-cols-1 lg:grid-cols-2'>
						{Array.from({ length: 6 }).map((_, index) => (
							<div key={index} className='animate-pulse border border-stone-200 bg-white p-6'>
								<div className='h-5 w-3/4 bg-stone-200' />
								<div className='mt-3 h-4 w-1/2 bg-stone-200' />
							</div>
						))}
					</div>
				) : restaurants.length === 0 ? (
					<div className='border border-dashed border-stone-200 bg-stone-50 p-10 text-center'>
						<h2 className='text-lg font-bold font-serif text-stone-900'>{t('no-restaurants-found')}</h2>
						<p className='mt-2 text-stone-500 text-sm'>
							{search ? t('try-another-name') : t('empty-database')}
						</p>
					</div>
				) : (
					<>
						<p className='font-mono text-xs uppercase tracking-widest text-stone-400 mb-6'>
							{t('found')} {restaurants.length}
						</p>

						<div className='grid gap-6 sm:grid-cols-1 lg:grid-cols-2'>
							{restaurants.map(restaurant => (
								<RestaurantCard key={restaurant.id} restaurant={restaurant} />
							))}
						</div>
					</>
				)}
			</section>
		</div>
	)
}
