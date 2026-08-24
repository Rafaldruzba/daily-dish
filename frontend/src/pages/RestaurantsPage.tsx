import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import {
	Store,
	Heart,
	Phone,
	MapPin,
	Eye,
	EyeOff,
	Trash2,
	RefreshCw,
	Search,
	Star,
	Shield,
	Check,
	X,
} from 'lucide-react'
import { Link } from 'react-router-dom'

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
}

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function RestaurantsPage() {
	const { user, token, toggleFavorite, isFavorite } = useAuth()
	const isAdmin = user?.role === 'ADMIN'

	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')

	// Search and filter states
	const [searchQuery, setSearchQuery] = useState('')
	const [adminTab, setAdminTab] = useState<'APPROVED' | 'PENDING'>('APPROVED')

	useEffect(() => {
		loadRestaurants()
	}, [adminTab])

	const loadRestaurants = async () => {
		try {
			setLoading(true)
			setError('')

			// Admins can see all, standard users see only active approved
			const endpoint = isAdmin ? `${API_URL}/restaurants/admin/all` : `${API_URL}/restaurants`
			const response = await fetch(endpoint, {
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

	const handleStatusApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
		if (!token || !isAdmin) return

		try {
			setError('')
			const response = await fetch(`${API_URL}/restaurants/admin/${id}/status`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ status }),
			})

			if (!response.ok) throw new Error('Błąd aktualizacji statusu.')

			// Refresh list
			loadRestaurants()
		} catch (err) {
			console.error(err)
			setError('Nie udało się zaktualizować statusu restauracji.')
		}
	}

	const toggleRestaurantStatus = async (restaurant: Restaurant) => {
		if (!token || !isAdmin) return

		try {
			setError('')
			const response = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ isActive: !restaurant.isActive }),
			})

			if (!response.ok) throw new Error('Nie udało się zmienić statusu restauracji.')
			const updated = await response.json()

			setRestaurants(prev => prev.map(item => (item.id === updated.id ? updated : item)))
		} catch (err) {
			console.error(err)
			setError('Wystąpił błąd podczas zmiany statusu.')
		}
	}

	const deleteRestaurant = async (id: string) => {
		if (!token || !isAdmin) return
		if (!window.confirm('Czy na pewno chcesz bezpowrotnie usunąć tę restaurację z bazy?')) return

		try {
			setError('')
			const response = await fetch(`${API_URL}/restaurants/${id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})
			if (!response.ok) throw new Error('Nie udało się usunąć restauracji.')

			setRestaurants(prev => prev.filter(item => item.id !== id))
		} catch (err) {
			console.error(err)
			setError('Wystąpił błąd podczas usuwania restauracji.')
		}
	}

	// Filter restaurants by search and tab (for admin)
	const filteredRestaurants = restaurants.filter(r => {
		const matchesSearch =
			r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			r.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(r.address && r.address.toLowerCase().includes(searchQuery.toLowerCase()))

		if (isAdmin) {
			return matchesSearch && r.status === adminTab
		}

		return matchesSearch
	})

	return (
		<main className='max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-10'>
			{/* Page Header */}
			<header className='border-b border-stone-200 pb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6'>
				<div>
					<span className='text-xs font-mono uppercase tracking-widest text-stone-400'>
						{isAdmin ? 'Panel Dewelopera' : 'Katalog'}
					</span>
					<h1 className='text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1'>
						{isAdmin ? 'Panel Moderacyjny' : 'Wyszukaj restaurację'}
					</h1>
					<p className='text-stone-500 text-sm md:text-base mt-2'>
						{isAdmin
							? 'Zatwierdzaj zgłoszenia od restauratorów, wstrzymuj pobieranie i usuwaj lokacje.'
							: 'Przeglądaj spis restauracji współpracujących z naszym systemem i wybierz swoje ulubione.'}
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

			{/* Developer Tab Selector */}
			{isAdmin && (
				<section className='flex border border-stone-200 p-0.5 bg-stone-50 w-max font-mono text-xs'>
					<button
						onClick={() => setAdminTab('APPROVED')}
						className={`px-4 py-2 transition-colors cursor-pointer flex items-center gap-2 ${
							adminTab === 'APPROVED' ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
						}`}>
						Zatwierdzone ({restaurants.filter(r => r.status === 'APPROVED').length})
					</button>
					<button
						onClick={() => setAdminTab('PENDING')}
						className={`px-4 py-2 transition-colors cursor-pointer flex items-center gap-2 ${
							adminTab === 'PENDING' ? 'bg-white text-black font-bold shadow-sm' : 'text-stone-500 hover:text-black'
						}`}>
						<Shield className='w-3.5 h-3.5' />
						Kandydatury ({restaurants.filter(r => r.status === 'PENDING').length})
					</button>
				</section>
			)}

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
						Wyniki dla: "{searchQuery}" ({filteredRestaurants.length})
					</div>
				)}
			</section>

			{/* Main Content List */}
			<section className='space-y-6'>
				{error && (
					<div className='p-4 bg-stone-50 border-l-2 border-stone-300 text-xs font-mono text-stone-500'>{error}</div>
				)}

				{loading ? (
					<div className='py-24 text-center border border-dashed border-stone-200'>
						<RefreshCw className='w-8 h-8 text-stone-300 animate-spin mx-auto mb-4' />
						<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>Ładowanie katalogu...</p>
					</div>
				) : filteredRestaurants.length === 0 ? (
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
					<div className='grid grid-cols-1 gap-4'>
						{filteredRestaurants.map(restaurant => {
							const isFav = isFavorite(restaurant.id)

							return (
								<article
									key={restaurant.id}
									className={`p-6 border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all ${
										!restaurant.isActive
											? 'opacity-65 border-stone-200'
											: 'border-stone-200 hover:border-black hover:shadow-sm'
									}`}>
									<div className='space-y-3 flex-grow'>
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

										{isAdmin ? (
											<>
												{restaurant.status === 'PENDING' ? (
													<>
														<button
															onClick={() => handleStatusApproval(restaurant.id, 'APPROVED')}
															className='px-3 py-2 bg-green-700 text-white hover:bg-green-800 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer'>
															<Check className='w-3.5 h-3.5' /> Zatwierdź
														</button>
														<button
															onClick={() => handleStatusApproval(restaurant.id, 'REJECTED')}
															className='px-3 py-2 border border-red-200 text-red-500 hover:border-red-600 hover:bg-red-50 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer'>
															<X className='w-3.5 h-3.5' /> Odrzuć
														</button>
													</>
												) : (
													<>
														<button
															onClick={() => toggleRestaurantStatus(restaurant)}
															className='p-2 border border-stone-200 hover:border-black hover:bg-stone-50 text-stone-700 hover:text-black transition-colors flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider cursor-pointer'
															title={restaurant.isActive ? 'Wstrzymaj' : 'Aktywuj'}>
															{restaurant.isActive ? (
																<EyeOff className='w-3.5 h-3.5' />
															) : (
																<Eye className='w-3.5 h-3.5' />
															)}
															{restaurant.isActive ? 'Pauzuj' : 'Wznów'}
														</button>
														<button
															onClick={() => deleteRestaurant(restaurant.id)}
															className='p-2 border border-stone-200 hover:border-red-600 hover:bg-red-50 text-stone-500 hover:text-red-600 transition-colors flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider cursor-pointer'>
															<Trash2 className='w-3.5 h-3.5' /> Usuń
														</button>
													</>
												)}
											</>
										) : (
											// Normal user
											user &&
											restaurant.status === 'APPROVED' && (
												<button
													onClick={() => toggleFavorite(restaurant.id)}
													className={`p-2 border rounded-full transition-all flex items-center justify-center gap-1 text-xs cursor-pointer ${
														isFav
															? 'border-red-200 bg-red-50 text-red-500 hover:scale-105 shadow-sm'
															: 'border-stone-200 text-stone-400 hover:text-black hover:border-stone-400'
													}`}>
													<Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
													{isFav && (
														<span className='font-mono text-[10px] uppercase tracking-wider mr-1'>Ulubiona</span>
													)}
												</button>
											)
										)}

										<Link
											to={`/restaurants/${restaurant.slug}`}
											className='px-3 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-bold'>
											Zobacz profil
										</Link>

										{restaurant.facebookUrl && (
											<a
												href={restaurant.facebookUrl}
												target='_blank'
												rel='noopener noreferrer'
												className='px-3 py-2 border border-stone-200 text-stone-600 hover:border-black hover:bg-stone-50 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer'>
												Facebook
											</a>
										)}
									</div>
								</article>
							)
						})}
					</div>
				)}
			</section>
		</main>
	)
}
