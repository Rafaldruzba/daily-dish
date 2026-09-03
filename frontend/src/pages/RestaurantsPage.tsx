import { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { Store, Heart, Phone, MapPin, RefreshCw, Search, Star, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useLocation } from '../context/LocationContext'

// --- TYPY ---
export interface Restaurant {
	id: string
	name: string
	slug: string
	phone: string | null
	address: string | null
	city: string
	facebookUrl: string | null
	isActive: boolean
	rating: number | null
	status: string
	views: number
	subscriptionPlan: string
	latitude?: number | null
	longitude?: number | null
	isPromoted?: boolean
	subscription?: {
		type: string
		status: string
		currentPeriodEnd: string
	} | null
}

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function RestaurantsPage() {
	const { user, token, toggleFavorite, isFavorite } = useAuth()
	const navigate = useNavigate()
	const { city } = useLocation()
	const [searchParams, setSearchParams] = useSearchParams()

	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	// Search and filter states
	const [searchQuery, setSearchQuery] = useState('')

	useEffect(() => {
		loadRestaurants()
	}, [])

	const loadRestaurants = async () => {
		try {
			setLoading(true)
			setError('')

			// Standard endpoint (only returns approved/active restaurants)
			const response = await fetch(`${API_URL}/restaurants`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})
			if (!response.ok) throw new Error('Błąd połączenia z API')

			const data = await response.json()
			setRestaurants(data)
		} catch (err) {
			console.error(err)
			setError('Nie udało się pobrać restauracji.')
		} finally {
			setLoading(false)
		}
	}

	// Filter and sort restaurants based on user's city first, then by search query using useMemo
	const sortedAndFilteredRestaurants = useMemo(() => {
		const query = searchQuery.toLowerCase().trim()
		const filtered = restaurants.filter(r => {
			if (!query) return true
			return (
				r.name.toLowerCase().includes(query) ||
				r.city.toLowerCase().includes(query) ||
				(r.address && r.address.toLowerCase().includes(query))
			)
		})

		// Sort by vicinity (user's city) first, then the rest of the list
		return [...filtered].sort((a, b) => {
			const aInCity = city && a.city.toLowerCase().trim() === city.toLowerCase().trim()
			const bInCity = city && b.city.toLowerCase().trim() === city.toLowerCase().trim()
			if (aInCity && !bInCity) return -1
			if (!aInCity && bInCity) return 1
			return 0
		})
	}, [restaurants, searchQuery, city])

	// Pagination variables
	const currentPage = useMemo(() => {
		const page = parseInt(searchParams.get('page') || '1', 10)
		return isNaN(page) || page < 1 ? 1 : page
	}, [searchParams])

	const pageSize = 10

	const paginatedRestaurants = useMemo(() => {
		const startIndex = (currentPage - 1) * pageSize
		return sortedAndFilteredRestaurants.slice(startIndex, startIndex + pageSize)
	}, [sortedAndFilteredRestaurants, currentPage])

	const totalPages = useMemo(() => {
		return Math.ceil(sortedAndFilteredRestaurants.length / pageSize)
	}, [sortedAndFilteredRestaurants])

	// Reset page when searchQuery changes
	useEffect(() => {
		if (searchParams.get('page')) {
			setSearchParams(prev => {
				prev.delete('page')
				return prev
			})
		}
	}, [searchQuery])

	const handlePageChange = (page: number) => {
		setSearchParams(prev => {
			prev.set('page', String(page))
			return prev
		})
		// Scroll to top of catalog section smoothly
		window.scrollTo({ top: 200, behavior: 'smooth' })
	}

	const pageNumbers = useMemo(() => {
		const pages: (number | string)[] = []
		if (totalPages <= 7) {
			for (let i = 1; i <= totalPages; i++) pages.push(i)
		} else {
			if (currentPage <= 4) {
				pages.push(1, 2, 3, 4, 5, '...', totalPages)
			} else if (currentPage >= totalPages - 3) {
				pages.push(1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
			} else {
				pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
			}
		}
		return pages
	}, [currentPage, totalPages])

	return (
		<main className='max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-10'>
			{/* Page Header */}
			<header className='border-b border-stone-200 pb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6'>
				<div className='text-left'>
					<span className='text-xs font-mono uppercase tracking-widest text-stone-400'>Katalog</span>
					<h1 className='text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1'>
						Wyszukaj restaurację
					</h1>
					<p className='text-stone-500 text-sm md:text-base mt-2'>
						Przeglądaj spis restauracji współpracujących z naszym systemem i wybierz swoje ulubione.
					</p>
				</div>

				<button
					onClick={loadRestaurants}
					disabled={loading}
					className='px-4 py-2 border border-stone-200 hover:border-black font-mono text-xs uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer bg-white text-stone-900 self-start sm:self-auto shadow-sm'>
					<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
					Odśwież
				</button>
			</header>

			{/* Search Bar section */}
			<section className='relative'>
				<div className='relative'>
					<Search className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400' />
					<input
						type='text'
						value={searchQuery}
						onChange={e => setSearchQuery(e.target.value)}
						placeholder='Wpisz nazwę restauracji, miasto lub ulicę...'
						className='w-full pl-12 pr-4 py-4 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono shadow-sm transition-colors'
					/>
				</div>
				{searchQuery && (
					<div className='absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-stone-400'>
						Wyniki dla: "{searchQuery}" ({sortedAndFilteredRestaurants.length})
					</div>
				)}
			</section>

			{/* Main Content List */}
			<section className='space-y-6'>
				{error && (
					<div className='p-4 bg-stone-50 border-l-2 border-stone-300 text-xs font-mono text-stone-500 text-left'>
						{error}
					</div>
				)}

				{loading ? (
					<div className='py-24 text-center border border-dashed border-stone-200'>
						<RefreshCw className='w-8 h-8 text-stone-300 animate-spin mx-auto mb-4' />
						<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>Ładowanie katalogu...</p>
					</div>
				) : sortedAndFilteredRestaurants.length === 0 ? (
					<div className='py-24 text-center border border-dashed border-stone-200'>
						<Store className='w-12 h-12 text-stone-300 mx-auto mb-4' />
						<h3 className='text-lg font-bold font-serif text-stone-900'>Brak wyników</h3>
						<p className='text-stone-500 text-sm mt-1 max-w-sm mx-auto'>
							{searchQuery
								? 'Nie znaleźliśmy żadnej restauracji pasującej do wpisanej frazy.'
								: 'Lista restauracji jest pusta.'}
						</p>
					</div>
				) : (
					<div className='space-y-8'>
						<div className='grid grid-cols-1 gap-4'>
							{paginatedRestaurants.map(restaurant => {
								const isFav = isFavorite(restaurant.id)
								const isPromoted =
									restaurant.isPromoted ||
									(restaurant.subscription?.status === 'ACTIVE' && restaurant.subscription?.type === 'PROMOTION')

								const isUserVicinity = city && restaurant.city.toLowerCase().trim() === city.toLowerCase().trim()

								return (
									<div
										key={restaurant.id}
										onClick={e => {
											if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
												return
											}
											navigate(`/restaurants/${restaurant.slug}`)
										}}
										className={`cursor-pointer relative overflow-hidden p-6 border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all ${
											!restaurant.isActive
												? 'opacity-65 border-stone-200'
												: isUserVicinity
												? 'border-stone-300 hover:border-black hover:shadow-sm bg-stone-50/20'
												: 'border-stone-200 hover:border-black hover:shadow-sm'
										}`}>
										{isPromoted && (
											<div className='absolute top-0 left-0 w-16 h-16 overflow-hidden pointer-events-none z-10'>
												<div className='absolute top-[8px] left-[-24px] w-20 h-5 bg-green-600 text-white flex items-center justify-center -rotate-45 font-mono text-[8px] font-bold shadow-sm'>
													★
												</div>
											</div>
										)}

										<div className='space-y-3 flex-grow pl-2 text-left'>
											<div className='flex flex-wrap items-start sm:items-center gap-3'>
												<div className='w-8 h-8 bg-stone-100 flex items-center justify-center font-serif text-sm font-bold border border-stone-200 text-stone-800 shrink-0'>
													R
												</div>
												<div>
													<div className='flex items-center gap-2 flex-wrap'>
														<h3 className='text-base font-bold font-serif text-stone-900'>{restaurant.name}</h3>

														{restaurant.rating ? (
															<span className='flex items-center text-xs text-stone-900 bg-stone-100 px-2 py-0.5 font-bold font-mono'>
																<Star className='w-3 h-3 fill-black mr-0.5' />
																{Number(restaurant.rating).toFixed(1)}
															</span>
														) : (
															<span className='text-[10px] text-stone-400 font-mono'>Brak ocen</span>
														)}

														{isUserVicinity && (
															<span className='text-[9px] font-mono font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5'>
																W Twojej okolicy
															</span>
														)}
													</div>
													<span className='font-mono text-[9px] tracking-wider text-stone-400 uppercase block mt-0.5'>
														{restaurant.slug}
													</span>
												</div>
											</div>

											<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-stone-500 font-sans'>
												<p className='flex items-center gap-1.5'>
													<MapPin className='w-3.5 h-3.5 text-stone-400 shrink-0' />
													{restaurant.city}
													{restaurant.address ? `, ${restaurant.address}` : ''}
												</p>

												{restaurant.phone && (
													<p className='flex items-center gap-1.5'>
														<Phone className='w-3.5 h-3.5 text-stone-400 shrink-0' />
														<a href={`tel:${restaurant.phone}`} className='hover:text-black'>
															{restaurant.phone}
														</a>
													</p>
												)}
											</div>
										</div>
										{/* Actions */}
										<div className='flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-auto'>
											{!restaurant.isActive && (
												<span className='text-[10px] font-mono uppercase bg-stone-100 text-stone-500 border border-stone-200 px-2 py-1 font-bold'>
													Scrapowanie wstrzymane
												</span>
											)}

											{user && restaurant.status === 'APPROVED' && (
												<button
													onClick={() => toggleFavorite(restaurant.id)}
													className={`p-2 border rounded-full transition-all flex items-center justify-center gap-1 text-xs cursor-pointer ${
														isFav
															? 'border-red-200 bg-red-50 text-red-500 hover:scale-105 shadow-sm'
															: 'border-stone-200 text-stone-400 hover:text-black hover:border-stone-400'
													}`}>
													<Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
													{isFav && <span className='font-mono text-[10px] uppercase tracking-wider mr-1'>Ulubiona</span>}
												</button>
											)}

											<Link
												to={`/restaurants/${restaurant.slug}`}
												className='px-3 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-bold'>
												Zobacz profil
											</Link>

											{restaurant.facebookUrl && (
												<button
													type='button'
													onClick={e => {
														e.preventDefault()
														e.stopPropagation()
														window.open(restaurant.facebookUrl as string, '_blank', 'noopener,noreferrer')
													}}
													className='px-3 py-2 border border-stone-200 text-stone-600 hover:border-black hover:bg-stone-50 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-white'>
													Facebook
												</button>
											)}
										</div>
									</div>
								)
							})}
						</div>

						{/* Pagination Controls */}
						{totalPages > 1 && (
							<nav className='flex items-center justify-center gap-1.5 pt-6 font-mono text-xs uppercase' aria-label='Pagination'>
								<button
									onClick={() => handlePageChange(currentPage - 1)}
									disabled={currentPage === 1}
									className='p-2 border border-stone-200 hover:border-black text-stone-600 hover:text-black bg-white disabled:opacity-45 disabled:hover:border-stone-200 disabled:hover:text-stone-600 transition-colors cursor-pointer flex items-center justify-center shadow-xs'
									title='Poprzednia strona'>
									<ChevronLeft className='w-4 h-4' />
								</button>

								<div className='flex items-center gap-1'>
									{pageNumbers.map((page, idx) => {
										if (page === '...') {
											return (
												<span key={`ell-${idx}`} className='px-2.5 py-1 text-stone-400 font-mono'>
													...
												</span>
											)
										}
										return (
											<button
												key={`page-${page}`}
												onClick={() => handlePageChange(page as number)}
												className={`px-3 py-1.5 border font-mono font-bold transition-all cursor-pointer ${
													currentPage === page
														? 'bg-black text-white border-black shadow-xs'
														: 'bg-white text-stone-700 border-stone-200 hover:border-black hover:text-black'
												}`}>
												{page}
											</button>
										)
									})}
								</div>

								<button
									onClick={() => handlePageChange(currentPage + 1)}
									disabled={currentPage === totalPages}
									className='p-2 border border-stone-200 hover:border-black text-stone-600 hover:text-black bg-white disabled:opacity-45 disabled:hover:border-stone-200 disabled:hover:text-stone-600 transition-colors cursor-pointer flex items-center justify-center shadow-xs'
									title='Następna strona'>
									<ChevronRight className='w-4 h-4' />
								</button>
							</nav>
						)}
					</div>
				)}
			</section>
		</main>
	)
}
