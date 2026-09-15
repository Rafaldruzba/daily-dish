'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Heart, RefreshCw, ExternalLink, Phone, Info, Star, Award, TrendingUp, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLocation } from '@/context/LocationContext'
import { apiFetch } from '@/lib/api'
import type { DailyDish, Restaurant } from '@/lib/types'

const formatCurrency = (price: string | number | null) => {
	if (price === null || price === undefined) return null
	return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(price))
}

const formatDate = (date: Date = new Date()) => {
	return new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

interface HomeClientProps {
	initialDishes: DailyDish[]
	initialStats: { totalUsers: number; totalViews: number }
	city: string
}

export default function HomeClient({ initialDishes, initialStats, city }: HomeClientProps) {
	const { user, toggleFavorite, isFavorite } = useAuth()
	const { city: locationCity } = useLocation()
	const searchParams = useSearchParams()

	const [dishes, setDishes] = useState<DailyDish[]>(initialDishes)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState('')
	const [filterFavorites, setFilterFavorites] = useState(false)
	const [stats, setStats] = useState(initialStats)

	const viewMode = searchParams?.get('tab') === 'ranking' ? 'ranking' : 'dishes'

	// Stats visit registration
	useEffect(() => {
		let isMounted = true
		const initStats = async () => {
			try {
				await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/stats/visit`, { method: 'POST' }).catch(() => {})
				const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/stats`)
				if (response.ok && isMounted) {
					const data = await response.json()
					setStats({
						totalUsers: data.totalUsers ?? 0,
						totalViews: data.totalViews ?? 0,
					})
				}
			} catch (err) {
				console.error('Błąd pobierania statystyk:', err)
			}
		}
		initStats()
		return () => { isMounted = false }
	}, [])

	const loadTodayDishes = useCallback(async () => {
		if (!locationCity) return
		try {
			setLoading(true)
			setError('')
			const data = await apiFetch<DailyDish[]>(`/dishes/today?city=${encodeURIComponent(locationCity)}`)
			setDishes(data)
		} catch (err) {
			console.error(err)
			setError('Nie udało się połączyć z serwerem.')
		} finally {
			setLoading(false)
		}
	}, [locationCity])

	useEffect(() => {
		if (locationCity) {
			loadTodayDishes()
		}
	}, [locationCity, loadTodayDishes])

	const handleRecordView = async (restaurantId: string) => {
		try {
			await apiFetch(`/restaurants/${restaurantId}/view`, { method: 'POST' })
		} catch (err) {
			// Fail silently
		}
	}

	const displayedDishes = useMemo(() => {
		return filterFavorites ? dishes.filter(dish => isFavorite(dish.restaurantId)) : dishes
	}, [dishes, filterFavorites, isFavorite])

	const rankingRestaurants = useMemo(() => {
		const uniqueRestaurantsMap = new Map<string, Restaurant>()
		dishes.forEach(d => {
			uniqueRestaurantsMap.set(d.restaurantId, d.estaurant)
		})
		return Array.from(uniqueRestaurantsMap.values()).sort((a, b) => {
			const ratingA = a.rating ?? 0
			const ratingB = b.rating ?? 0
			if (ratingB !== ratingA) return ratingB - ratingA
			return (b.views || 0) - (a.views || 0)
		})
	}, [dishes])

	return (
		<main className='max-w-6xl mx-auto px-4 sm:px-6 pb-8 md:pb-12 flex-grow'>
			{/* Wesprzyj nasz rozwój */}
			<section className='mx-auto bg-gradient-to-r from-amber-400 to-orange-500 my-6 p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-left rounded-lg'>
				<div className='flex-1 min-w-[280px]'>
					<h3 className='text-2xl font-bold font-serif text-black mb-1.5'>Wesprzyj nasz rozwój!</h3>
					<p className='text-black/85 text-xs md:text-sm leading-relaxed max-w-xl'>
						Naszym celem jest stworzenie dedykowanej aplikacji mobilnej, aby ułatwić Ci odkrywanie najlepszych dań w
						Twojej okolicy. Pomóż nam osiągnąć ten cel! Każde wsparcie zbliża nas do wydania aplikacji.
					</p>
				</div>

				<div className='w-full md:w-80 flex flex-col gap-3 shrink-0'>
					<div className='bg-black/5 p-3 border border-black/10 rounded'>
						<div className='flex justify-between items-center font-mono text-[11px] text-black/85 mb-1 font-bold'>
							<span>Zarejestrowani smakosze</span>
							<span>
								Cel: <strong>5000</strong>
							</span>
						</div>
						<div className='w-full bg-black/20 h-2 border border-white/20 rounded-full overflow-hidden'>
							<div
								className='bg-black h-full transition-all duration-1000'
								style={{ width: `${Math.min((stats.totalUsers / 5000) * 100, 100)}%` }}
							/>
						</div>
						<div className='flex justify-between items-center font-mono text-[10px] text-black/75 mt-1.5'>
							<span>
								Zarejestrowano: <strong>{stats.totalUsers}</strong>
							</span>
							<span>
								Odwiedziny: <strong>{stats.totalViews}</strong>
							</span>
						</div>
					</div>

					<a
						href='https://buycoffee.to/rafaldruzba_dev'
						target='_blank'
						rel='noopener noreferrer'
						className='inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-stone-900 transition-all px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider font-bold shadow-md cursor-pointer w-full text-center rounded'>
						☕ Wesprzyj kawą!
					</a>
				</div>
			</section>

			{/* Nagłówek główny */}
			<section className='border-b border-stone-200 pb-12 mb-12 flex flex-col md:flex-row md:items-end md:justify-between gap-8'>
				<div className='max-w-2xl'>
					<span className='text-xs font-mono uppercase tracking-widest text-stone-400'>Dzisiejsza Oferta</span>
					<h1 className='text-4xl md:text-5xl font-black font-serif tracking-tight text-stone-900 mt-2 mb-4'>
						Co dziś jemy?
					</h1>
					<p className='text-stone-500 text-base md:text-lg'>
						Przeglądaj najnowsze menu dnia i oferty lunchowe z lokalnych restauracji, automatycznie zbierane prosto z
						ich postów społecznościowych.
					</p>
				</div>

				<div className='flex flex-wrap items-center gap-4 shrink-0'>
					<button
						onClick={loadTodayDishes}
						disabled={loading || !locationCity}
						className='px-5 py-3 border border-stone-200 hover:border-black font-mono text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer bg-white text-stone-900'>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
						Odśwież
					</button>

					<div className='text-xs text-stone-400 font-mono bg-stone-50 border border-stone-200 p-3 max-w-[280px]'>
						⏰ Codzienne automatyczne pobieranie ofert o godzinie 12:00.
					</div>
				</div>
			</section>

			{/* Przełącznik widoku z obsługą ?tab= w URL */}
			<div className='flex border border-stone-200 p-0.5 bg-stone-50 w-max font-mono text-xs uppercase mb-8'>
				<button
					onClick={() => window.history.pushState({}, '', '?tab=dishes')}
					className={`px-4 py-2 transition-colors cursor-pointer ${
						viewMode === 'dishes' ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
					}`}>
					Oferty Dnia
				</button>
				<button
					onClick={() => window.history.pushState({}, '', '?tab=ranking')}
					className={`px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
						viewMode === 'ranking' ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
					}`}>
					<Award className='w-4 h-4 text-stone-700' />
					Ranking Główny
				</button>
			</div>

			{viewMode === 'dishes' ? (
				/* --- LISTA DAŃ DIA --- */
				<section className='space-y-8'>
					<header className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100'>
						<div>
							<h2 className='text-xl font-bold font-serif text-stone-900'>Dzisiejsze menu</h2>
							<p className='text-xs font-mono text-stone-400 uppercase mt-1'>{formatDate()}</p>
						</div>

						<div className='flex items-center gap-3 font-mono text-xs'>
							{user && (
								<div className='flex border border-stone-200 p-0.5 bg-stone-50'>
									<button
										onClick={() => setFilterFavorites(false)}
										className={`px-3 py-1.5 transition-colors cursor-pointer ${
											!filterFavorites ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
										}`}>
										Wszystkie ({dishes.length})
									</button>
									<button
										onClick={() => setFilterFavorites(true)}
										className={`px-3 py-1.5 transition-colors cursor-pointer flex items-center gap-1 ${
											filterFavorites ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
										}`}>
										<Heart className='w-3 h-3 text-red-500 fill-red-500' />
										Ulubione ({dishes.filter(d => isFavorite(d.restaurant.id)).length})
									</button>
								</div>
							)}

							<span className='bg-stone-100 text-stone-800 border border-stone-200 px-3 py-1.5 font-bold font-mono'>
								Znaleziono: {displayedDishes.length}
							</span>
						</div>
					</header>

					{error && (
						<div className='p-4 bg-stone-50 border-l-2 border-stone-300 text-xs font-mono text-stone-500 transition-all'>
							{error}
						</div>
					)}

					{loading ? (
						<div className='py-24 text-center border border-dashed border-stone-200'>
							<RefreshCw className='w-8 h-8 text-stone-300 animate-spin mx-auto mb-4' />
							<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>Ładowanie menu dnia...</p>
						</div>
					) : displayedDishes.length === 0 ? (
						<div className='py-24 text-center border border-dashed border-stone-200 px-6'>
							<div className='text-4xl mb-4 text-stone-300'>🍽️</div>
							<h3 className='text-lg font-bold font-serif text-stone-900 mb-2'>
								{filterFavorites ? 'Brak dań z Twoich ulubionych restauracji' : 'Brak dzisiejszych dań'}
							</h3>
							<p className='text-stone-500 text-sm max-w-md mx-auto'>
								{filterFavorites
									? 'Dodaj restauracje do ulubionych (klikając ikonę serca), aby zobaczyć je w tym filtrze.'
									: 'Wygląda na to, że nie pobrano jeszcze żadnych dań na dzisiaj. Zapraszamy po godzinie 12:00.'}
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
							{displayedDishes.map(dish => {
								const isFav = isFavorite(dish.restaurant.id)

								return (
									<article
										key={dish.id}
										tabIndex={0}
										onClick={() => {
											window.location.href = `/restauracja/${dish.restaurant.slug}`
										}}
										className='bg-white border border-stone-200 hover:border-orange-400 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer group relative'>
										{/* Image */}
										<div className='relative aspect-[4/3] overflow-hidden bg-stone-100'>
											{dish.imageUrl ? (
												<img
													src={dish.imageUrl}
													alt={dish.name}
													className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
													loading='lazy'
												/>
											) : (
												<div className='w-full h-full flex items-center justify-center'>
													<span className='text-4xl'>🍽️</span>
												</div>
											)}
											{dish.isPromoted && (
												<span className='absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded'>
													Promowane
												</span>
											)}
											{/* Favorite button */}
											<button
												onClick={e => {
													e.stopPropagation()
													toggleFavorite(dish.restaurant.id)
												}}
												className='absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full shadow transition-colors hover:bg-white z-10'
												aria-label={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
												<Heart
													className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-stone-400'}`}
												/>
											</button>
										</div>

										{/* Content */}
										<div className='p-4 space-y-3'>
											<header className='flex items-start justify-between gap-2'>
												<div className='flex-1 min-w-0'>
													<h3 className='font-serif text-lg font-bold text-stone-900 truncate group-hover:text-orange-600 transition-colors'>
														{dish.name}
													</h3>
													<p className='text-xs text-stone-500 font-mono uppercase tracking-wider mt-0.5'>
														{dish.restaurant.name}
													</p>
												</div>
												{dish.restaurant.rating && (
													<span className='flex items-center gap-0.5 text-xs font-mono bg-stone-100 px-2 py-1 rounded shrink-0'>
														<Star className='w-3 h-3 fill-yellow-400 text-yellow-400' />
														{dish.restaurant.rating.toFixed(1)}
													</span>
												)}
											</header>

											{dish.description && (
												<p className='text-sm text-stone-600 line-clamp-2'>{dish.description}</p>
											)}

											<footer className='flex items-center justify-between gap-4 pt-2 border-t border-stone-100'>
												<div className='flex items-center gap-2 text-xs text-stone-500 font-mono flex-1 min-w-0'>
													<MapPin className='w-3.5 h-3.5 shrink-0' />
													<span className='truncate'>{dish.restaurant.city}</span>
												</div>
												{dish.price !== null && dish.price !== undefined && (
													<span className='font-bold font-serif text-stone-900 shrink-0'>
														{formatCurrency(dish.price)}
													</span>
												)}
											</footer>
										</div>
									</article>
								)
							})}
						</div>
					)}
				</section>
			) : (
				/* --- RANKING GŁÓWNY --- */
				<section className='space-y-8'>
					<header className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100'>
						<div>
							<h2 className='text-xl font-bold font-serif text-stone-900 flex items-center gap-2'>
								<Award className='w-5 h-5 text-amber-500' />
								Ranking Główny
							</h2>
							<p className='text-xs font-mono text-stone-400 uppercase mt-1'>Oparte na ocenach i popularności</p>
						</div>
						<div className='flex items-center gap-3 font-mono text-xs'>
							<span className='bg-stone-100 text-stone-800 border border-stone-200 px-3 py-1.5 font-bold font-mono'>
								Lokali: {rankingRestaurants.length}
							</span>
						</div>
					</header>

					{rankingRestaurants.length === 0 ? (
						<div className='py-24 text-center border border-dashed border-stone-200'>
							<p className='text-stone-500'>Brak danych do wyświetlenia rankingu.</p>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8'>
							{rankingRestaurants.map((restaurant, index) => {
								const isFav = isFavorite(restaurant.id)
								return (
									<article
										key={restaurant.id}
										onClick={() => window.location.href = `/restauracja/${restaurant.slug}`}
										className='bg-white border border-stone-200 hover:border-amber-400 hover:shadow-lg transition-all rounded-xl overflow-hidden cursor-pointer group relative'>
										<div className='relative aspect-[4/3] overflow-hidden bg-stone-100'>
											{restaurant.imageUrl ? (
												<img
													src={restaurant.imageUrl}
													alt={restaurant.name}
													className='w-full h-full object-cover transition-transform duration-300 group-hover:scale-105'
													loading='lazy'
												/>
											) : (
												<div className='w-full h-full flex items-center justify-center'>
													<span className='text-4xl'>🍽️</span>
												</div>
											)}
											<span className='absolute top-2 left-2 bg-black text-white text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded'>
												#{index + 1}
											</span>
											{restaurant.isPromoted && (
												<span className='absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-mono uppercase tracking-wider px-2 py-1 rounded'>
													Promowane
												</span>
											)}
											<button
												onClick={e => {
													e.stopPropagation()
													toggleFavorite(restaurant.id)
												}}
												className='absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur rounded-full shadow transition-colors hover:bg-white z-10'
												aria-label={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
												<Heart
													className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-stone-400'}`}
												/>
											</button>
										</div>
										<div className='p-4 space-y-3'>
											<header className='flex items-start justify-between gap-2'>
												<div className='flex-1 min-w-0'>
													<h3 className='font-serif text-lg font-bold text-stone-900 truncate group-hover:text-amber-600 transition-colors'>
														{restaurant.name}
													</h3>
													<p className='text-xs text-stone-500 font-mono uppercase tracking-wider mt-0.5'>
														{restaurant.city}
													</p>
												</div>
												{restaurant.rating && (
													<span className='flex items-center gap-0.5 text-xs font-mono bg-stone-100 px-2 py-1 rounded shrink-0'>
														<Star className='w-3 h-3 fill-yellow-400 text-yellow-400' />
														{restaurant.rating.toFixed(1)}
													</span>
												)}
											</header>

											<footer className='flex items-center justify-between gap-4 pt-2 border-t border-stone-100'>
												<div className='flex items-center gap-2 text-xs text-stone-500 font-mono flex-1 min-w-0'>
													<MapPin className='w-3.5 h-3.5 shrink-0' />
													<span className='truncate'>{restaurant.address ? `${restaurant.address}, ${restaurant.city}` : restaurant.city}</span>
												</div>
												<div className='flex items-center gap-2 shrink-0'>
													{restaurant.phone && (
														<a
															href={`tel:${restaurant.phone}`}
															className='text-xs text-stone-500 font-mono hover:text-black transition-colors flex items-center gap-1'>
															<Phone className='w-3 h-3' />
															{restaurant.phone}
														</a>
													)}
													<a
														href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name}, ${restaurant.address || ''}, ${restaurant.city}`)}`}
														target='_blank'
														rel='noopener noreferrer'
														className='text-[10px] font-mono uppercase tracking-wider text-stone-500 hover:text-black flex items-center gap-1 font-semibold'>
														<ExternalLink className='w-3 h-3' />
														Mapa
													</a>
												</div>
											</footer>
										</div>
									</article>
								)
							})}
						</div>
					)}
				</section>
			)}
		</main>
	)
}