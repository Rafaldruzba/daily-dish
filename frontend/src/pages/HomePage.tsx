import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useLocation } from '../context/LocationContext'
import { Heart, RefreshCw, ExternalLink, Phone, Info, Star, Award, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

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
	views: number
}

export interface DailyDish {
	id: string
	name: string
	description: string | null
	price: string | number | null
	imageUrl: string | null
	sourceUrl: string | null
	date: string
	restaurant: Restaurant
}

const API_URL = import.meta.env.VITE_API_URL || '/api'

// --- UTILS ---
const formatCurrency = (price: string | number | null) => {
	if (price === null) return null
	return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(price))
}

const formatDate = (date: Date = new Date()) => {
	return new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

export default function HomePage() {
	const { user, toggleFavorite, isFavorite } = useAuth()
	const { city } = useLocation()
	const navigate = useNavigate()
	const [dishes, setDishes] = useState<DailyDish[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	// State for filtering
	const [filterFavorites, setFilterFavorites] = useState(false)
	const [viewMode, setViewMenu] = useState<'dishes' | 'ranking'>('dishes')

	// State for system statistics
	const [stats, setStats] = useState({ totalUsers: 0, totalViews: 0 })

	// Fetch daily dishes and stats on mount
	useEffect(() => {
		if (city) {
			loadTodayDishes(city)
		}

		const initStats = async () => {
			await recordVisit()
			await loadStats()
		}
		initStats()
	}, [city])

	const loadStats = async () => {
		try {
			const response = await fetch(`${API_URL}/stats`)
			if (response.ok) {
				const data = await response.json()
				setStats({
					totalUsers: data.totalUsers,
					totalViews: data.totalViews,
				})
			}
		} catch (err) {
			console.error('Błąd pobierania statystyk:', err)
		}
	}

	const recordVisit = async () => {
		try {
			await fetch(`${API_URL}/stats/visit`, { method: 'POST' })
		} catch (err) {
			// Fail silently
		}
	}

	const loadTodayDishes = async (currentCity: string) => {
		try {
			setLoading(true)
			setError('')

			const response = await fetch(`${API_URL}/dishes/today?city=${encodeURIComponent(currentCity)}`)
			if (!response.ok) throw new Error('Nie udało się pobrać dzisiejszych dań')

			const data = await response.json()
			setDishes(data)
		} catch (err) {
			console.error(err)
			setError('Nie udało się połączyć z serwerem.')
		} finally {
			setLoading(false)
		}
	}

	// Dynamic page views tracking
	const handleRecordView = async (restaurantId: string) => {
		try {
			await fetch(`${API_URL}/restaurants/${restaurantId}/view`, { method: 'POST' })
		} catch (err) {
			// Fail silently
		}
	}

	// Filter dishes based on favorites
	const displayedDishes = filterFavorites ? dishes.filter(dish => isFavorite(dish.restaurant.id)) : dishes

	// Generate Ranking from current restaurants in the dishes feed
	const uniqueRestaurantsMap = new Map<string, Restaurant>()
	dishes.forEach(d => {
		uniqueRestaurantsMap.set(d.restaurant.id, d.restaurant)
	})
	const rankingRestaurants = Array.from(uniqueRestaurantsMap.values()).sort((a, b) => {
		// Sort first by rating, then by views
		const ratingA = a.rating || 0
		const ratingB = b.rating || 0
		if (ratingB !== ratingA) return ratingB - ratingA
		return b.views - a.views
	})

	return (
		<main className='max-w-6xl mx-auto px-4 sm:px-6 pb-8 md:pb-12 flex-grow'>
			{/* Support Us Section */}
			<section className=' mx-auto bg-gradient-to-r from-amber-400 to-orange-500 my-6 p-6 text-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-6 text-left rounded-lg'>
				{/* Lewa strona: Tekst */}
				<div className='flex-1 min-w-[280px]'>
					<h3 className='text-2xl md:text-2xl font-bold font-serif text-black mb-1.5'>Wesprzyj nasz rozwój!</h3>
					<p className='text-black/85 text-xs md:text-sm leading-relaxed max-w-xl'>
						Naszym celem jest stworzenie dedykowanej aplikacji mobilnej, aby ułatwić Ci odkrywanie najlepszych dań w
						Twojej okolicy. Pomóż nam osiągnąć ten cel! Każde wsparcie zbliża nas do wydania aplikacji.
					</p>
				</div>

				{/* Prawa strona: Licznik + Przycisk w jednym węższym bloku */}
				<div className='w-full md:w-80 flex flex-col gap-3 shrink-0'>
					{/* Kompaktowy licznik */}
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
								style={{ width: `${Math.min((stats.totalUsers / 5000) * 100, 100)}%` }}></div>
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

					{/* Przycisk dopasowany szerokością do licznika */}
					<a
						href='https://buycoffee.to/rafaldruzba_dev'
						target='_blank'
						rel='noopener noreferrer'
						className='inline-flex items-center justify-center gap-2 bg-black text-white hover:bg-stone-900 transition-all px-4 py-2.5 font-mono text-[11px] uppercase tracking-wider font-bold shadow-md cursor-pointer w-full text-center rounded'>
						☕ Wesprzyj kawą!
					</a>
				</div>
			</section>

			{/* Hero Section */}
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
						onClick={() => loadTodayDishes(city!)}
						disabled={loading || !city}
						className='px-5 py-3 border border-stone-200 hover:border-black font-mono text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer bg-white text-stone-900'>
						<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
						Odśwież
					</button>

					<div className='text-xs text-stone-400 font-mono bg-stone-50 border border-stone-200 p-3 max-w-[280px]'>
						⏰ Codzienne automatyczne pobieranie ofert o godzinie 12:00.
					</div>
				</div>
			</section>

			{/* Views Toggles: Dishes Grid vs Global Ranking */}
			<div className='flex border border-stone-200 p-0.5 bg-stone-50 w-max font-mono text-xs uppercase mb-8'>
				<button
					onClick={() => setViewMenu('dishes')}
					className={`px-4 py-2 transition-colors cursor-pointer ${
						viewMode === 'dishes' ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
					}`}>
					Oferty Dnia
				</button>
				<button
					onClick={() => setViewMenu('ranking')}
					className={`px-4 py-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
						viewMode === 'ranking' ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
					}`}>
					<Award className='w-4 h-4 text-stone-700' />
					Ranking Główny
				</button>
			</div>

			{viewMode === 'dishes' ? (
				/* --- DAILY DISH FEED VIEW --- */
				<section className='space-y-8'>
					<header className='flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-stone-100'>
						<div>
							<h2 className='text-xl font-bold font-serif text-stone-900'>Dzisiejsze menu</h2>
							<p className='text-xs font-mono text-stone-400 uppercase mt-1'>{formatDate()}</p>
						</div>

						<div className='flex items-center gap-3 font-mono text-xs '>
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
						<div className='py-24 text-center border border-dashed border-stone-200 '>
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
									? 'Dodaj restauracje do ulubionych (klikając ikonę serca na karcie dania lub w katalogu), aby zobaczyć je w tym filtrze.'
									: 'Wygląda na to, że nie pobrano jeszcze żadnych dań na dzisiaj. Zapraszamy po godzinie 12:00.'}
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 '>
							{displayedDishes.map(dish => {
								const isFav = isFavorite(dish.restaurant.id)

								return (
									<article
										key={dish.id}
										className='group bg-white border border-stone-200 rounded-none overflow-hidden flex flex-col h-full hover:border-black transition-all hover:shadow-sm'>
										{/* Dish Image (only rendered if imageUrl exists to save vertical space) */}
										{dish.imageUrl && (
											<div className='relative aspect-[16/10] w-full bg-stone-100 overflow-hidden border-b border-stone-200'>
												<img
													src={dish.imageUrl}
													alt={dish.name}
													className='w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500'
													loading='lazy'
												/>

												{user && (
													<button
														onClick={() => toggleFavorite(dish.restaurant.id)}
														className='absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-stone-200 flex items-center justify-center hover:bg-white hover:scale-110 active:scale-95 transition-all text-stone-700 shadow-sm cursor-pointer'
														title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
														<Heart
															className={`w-4 h-4 transition-colors ${
																isFav ? 'text-red-500 fill-red-500' : 'text-stone-400 group-hover:text-black'
															}`}
														/>
													</button>
												)}
											</div>
										)}

										{/* Dish Info Body */}
										<div
											onClick={e => {
												// Prevent navigating if the user clicked an interactive element (button, link, etc.) inside the card
												if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
													return
												}
												navigate(`/restaurants/${dish.restaurant.slug}`)
											}}
											className='cursor-pointer p-6 flex flex-col flex-grow justify-between relative'
										>
											<div className='space-y-3'>
												{/* Restaurant details */}
												<div className='flex items-center justify-between gap-2 border-b border-stone-100 pb-2'>
													<span className='font-mono text-[10px] tracking-wider uppercase text-stone-400 block font-bold flex items-center gap-1.5'>
														{dish.restaurant.city}
														{dish.restaurant.rating ? (
															<span className='flex items-center text-stone-900 bg-stone-100 px-1.5 py-0.5 text-[9px] font-bold'>
																<Star className='w-2.5 h-2.5 fill-black mr-0.5' />
																{Number(dish.restaurant.rating).toFixed(1)}
															</span>
														) : null}
													</span>

													<div className='flex items-center gap-2'>
														<span className='text-stone-700 font-mono text-[11px] font-semibold tracking-tight block truncate uppercase max-w-[120px] sm:max-w-none'>
															{dish.restaurant.name}
														</span>
														{/* Inline heart button if no image is rendered */}
														{!dish.imageUrl && user && (
															<button
																onClick={(e) => {
																	e.preventDefault()
																	e.stopPropagation()
																	toggleFavorite(dish.restaurant.id)
																}}
																className='w-6 h-6 rounded-full border border-stone-200 flex items-center justify-center hover:bg-stone-50 hover:scale-110 active:scale-95 transition-all text-stone-700 shadow-sm cursor-pointer shrink-0'
																title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
																<Heart
																	className={`w-3.5 h-3.5 transition-colors ${
																		isFav ? 'text-red-500 fill-red-500' : 'text-stone-400'
																	}`}
																/>
															</button>
														)}
													</div>
												</div>

												<h3 className='text-lg font-bold font-serif text-stone-900 group-hover:underline leading-snug'>
													{dish.name}
												</h3>
												{dish.description && (
													<p className='text-stone-500 text-xs leading-relaxed font-sans line-clamp-3'>
														{dish.description}
													</p>
												)}
											</div>

											{/* Footer */}
											<div className='mt-6 pt-4 border-t border-stone-100 space-y-4'>
												<div className='flex items-center justify-between gap-2'>
													{dish.price ? (
														<span className='font-mono text-xs bg-stone-100 text-stone-900 px-2 py-1 font-bold'>
															{formatCurrency(dish.price)}
														</span>
													) : (
														<span className='font-mono text-[10px] text-stone-400'>Cena niepodana</span>
													)}

													{dish.restaurant.phone && (
														<a
															href={`tel:${dish.restaurant.phone}`}
															onClick={(e) => e.stopPropagation()}
															className='text-stone-500 hover:text-black text-xs font-mono flex items-center gap-1.5 transition-colors'
															title='Zadzwoń do restauracji'>
															<Phone className='w-3' />
															{dish.restaurant.phone}
														</a>
													)}
												</div>

												{dish.sourceUrl && (
													<a
														href={dish.sourceUrl}
														target='_blank'
														rel='noopener noreferrer'
														onClick={(e) => {
															e.stopPropagation()
															handleRecordView(dish.restaurant.id)
														}}
														className='w-full text-center py-2 border border-black hover:bg-black hover:text-white transition-colors text-xs font-mono uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer'>
														Źródło oferty
														<ExternalLink className='w-3 h-3' />
													</a>
												)}
											</div>
										</div>
									</article>
								)
							})}
						</div>
					)}
				</section>
			) : (
				/* --- GLOBAL RANKING VIEW --- */
				<section className='space-y-6'>
					<header className='pb-4 border-b border-stone-100'>
						<h2 className='text-xl font-bold font-serif text-stone-900'>Oficjalny Ranking Restauracji</h2>
						<p className='text-xs font-mono text-stone-400 uppercase mt-1'>
							Najwyżej oceniane i najpopularniejsze lokale w systemie
						</p>
					</header>

					{rankingRestaurants.length === 0 ? (
						<div className='py-12 text-center border border-dashed border-stone-200'>
							<p className='text-stone-500 font-mono text-xs uppercase tracking-widest'>Ładowanie rankingu...</p>
						</div>
					) : (
						<div className='space-y-4 max-w-3xl'>
							{rankingRestaurants.map((rest, index) => {
								return (
									<div
										key={rest.id}
										className='border border-stone-200 p-6 bg-white flex items-center justify-between gap-6 hover:border-black transition-colors'>
										<div className='flex items-center gap-4'>
											<div className='w-10 h-10 bg-black text-white flex items-center justify-center font-mono font-black text-sm shrink-0'>
												#{index + 1}
											</div>
											<div>
												<h3 className='text-base font-bold font-serif text-stone-900'>{rest.name}</h3>
												<span className='font-mono text-[9px] text-stone-400 uppercase'>{rest.city}</span>
											</div>
										</div>

										<div className='flex items-center gap-8 font-mono text-xs'>
											<div className='text-right'>
												<span className='text-[10px] text-stone-400 uppercase block'>Średnia ocen</span>
												<span className='font-bold text-stone-900 flex items-center justify-end gap-1'>
													<Star className='w-3.5 h-3.5 fill-black' />
													{Number(rest.rating).toFixed(1)}
												</span>
											</div>
											<div className='text-right'>
												<span className='text-[10px] text-stone-400 uppercase block'>Wyświetlenia</span>
												<span className='font-bold text-stone-900 flex items-center justify-end gap-1'>
													<TrendingUp className='w-3.5 h-3.5 text-stone-600' />
													{rest.views}
												</span>
											</div>
										</div>
									</div>
								)
							})}
						</div>
					)}
				</section>
			)}

			{/* Info Box */}
			<section className='bg-stone-50 border border-stone-200 p-6 md:p-8 flex flex-col md:flex-row items-start gap-4'>
				<Info className='w-6 h-6 text-stone-600 shrink-0 mt-0.5' />
				<div>
					<h4 className='font-bold text-sm font-serif text-stone-900 mb-1'>O serwisie Daily Dish</h4>
					<p className='text-stone-500 text-xs leading-relaxed'>
						Nasz inteligentny system sprawdza posty wiodących restauracji na Facebooku, analizując treść w poszukiwaniu
						dzisiejszych propozycji obiadowych i dań dnia. Oferty są aktualizowane automatycznie. Jeśli prowadzisz
						restaurację i chcesz znaleźć się na naszej liście, załóż konto i dodaj swój profil społecznościowy.
					</p>
				</div>
			</section>
		</main>
	)
}
