'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import RestaurantCard from './RestaurantCard'
import { Restaurant, RestaurantCatalogProps } from '@/lib/types'
import { API_URL } from '@/lib/api'

export default function RestaurantCatalog({ citySlug, cuisine }: RestaurantCatalogProps) {
	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [cuisines, setCuisines] = useState<Array<{ name: string; slug: string; count: number }>>([])
	const [loading, setLoading] = useState(true)

	useEffect(() => {
		const loadRestaurants = async () => {
			try {
				setLoading(true)

				// Filtrowanie odbywa się po stronie backendu (indeksy citySlug/cuisines)
				const params = new URLSearchParams()
				if (citySlug) params.set('citySlug', citySlug)
				if (cuisine) params.set('cuisine', cuisine)

				const query = params.toString()
				const response = await fetch(`${API_URL}/restaurants${query ? `?${query}` : ''}`)

				if (!response.ok) {
					throw new Error('Nie udało się pobrać restauracji')
				}

				const data = await response.json()

				setRestaurants(data)
			} catch (error) {
				console.error('Błąd pobierania restauracji:', error)
				setRestaurants([])
			} finally {
				setLoading(false)
			}
		}

		loadRestaurants()
	}, [citySlug, cuisine])

	// Linkowanie wewnętrzne SEO: miasto -> dostępne kuchnie (tylko te z realną treścią)
	useEffect(() => {
		if (!citySlug || cuisine) {
			setCuisines([])
			return
		}

		const loadCuisines = async () => {
			try {
				const response = await fetch(`${API_URL}/seo/cities/${citySlug}`)
				if (!response.ok) return

				const data = await response.json()
				setCuisines(data.cuisines || [])
			} catch (error) {
				console.error('Błąd pobierania kuchni:', error)
			}
		}

		loadCuisines()
	}, [citySlug, cuisine])

	if (loading) {
		return (
			<div className='grid gap-6 sm:grid-cols-1 lg:grid-cols-2'>
				{Array.from({ length: 6 }).map((_, index) => (
					<div key={index} className='animate-pulse border border-stone-200 bg-white p-6'>
						<div className='h-5 w-3/4 bg-stone-200' />
						<div className='mt-3 h-4 w-1/2 bg-stone-200' />
					</div>
				))}
			</div>
		)
	}

	if (restaurants.length === 0) {
		return (
			<div className='border border-dashed border-stone-200 bg-stone-50 p-10 text-center'>
				<h2 className='text-lg font-bold font-serif text-stone-900'>Nie znaleziono restauracji</h2>

				<p className='mt-2 text-stone-500 text-sm'>Spróbuj wybrać inne miasto lub kategorię.</p>
			</div>
		)
	}

	return (
		<div className='space-y-8'>
			{cuisines.length > 0 && (
				<nav className='flex flex-wrap gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
					{cuisines.map(item => (
						<Link
							key={item.slug}
							href={`/restaurants/${citySlug}/${item.slug}`}
							className='px-3 py-1.5 border border-stone-200 text-stone-600 hover:border-black hover:text-black transition-colors bg-white'>
							{item.name} ({item.count})
						</Link>
					))}
				</nav>
			)}

			<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>
				Znaleziono: {restaurants.length}
			</p>

			<div className='grid gap-6 sm:grid-cols-1 lg:grid-cols-2'>
				{restaurants.map(restaurant => (
					<RestaurantCard key={restaurant.id} restaurant={restaurant} />
				))}
			</div>
		</div>
	)
}
