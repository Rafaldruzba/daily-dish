import { useEffect, useState, type FormEvent } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
	MapPin,
	Phone,
	Star,
	ArrowLeft,
	Loader,
	Edit,
	Heart,
	Compass,
	Shield,
	BookOpen,
	Clock,
	Globe,
	Save,
	X,
	Calendar,
} from 'lucide-react'

// Define interfaces locally to prevent import issues
export interface DailyDish {
	id: string
	restaurantId: string
	name: string
	description: string | null
	price: string | number | null
	imageUrl: string | null
	date: string
	createdAt: string
}

export interface StandardOffer {
  id: string;
  title: string;
  description: string | null;
  price: number | null;
  imageUrl: string | null;
  isActive: boolean;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  category: string;
}

export interface RestaurantDetail {
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
	description: string | null
	generalMenu: string | null
	userId: string | null
	dishes: DailyDish[]
  standardOffers: StandardOffer[]
  menuItems: MenuItem[]
}

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function RestaurantDetailPage() {
	const { slug } = useParams<{ slug: string }>()
	const { user, token, toggleFavorite, isFavorite } = useAuth()

	const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [isEditing, setIsEditing] = useState(false)

	// Form State for editing
	const [editForm, setEditForm] = useState({
		name: '',
		phone: '',
		address: '',
		city: '',
		facebookUrl: '',
		description: '',
		generalMenu: '',
	})
	const [saving, setSaving] = useState(false)
	const [saveSuccess, setSaveSuccess] = useState('')

	// Tab control
	const [activeTab, setActiveTab] = useState<'dishes' | 'about' | 'menu'>('dishes')

	// --- 1. Fetch Restaurant Details ---
	const fetchDetails = async () => {
		if (!slug) return
		try {
			setLoading(true)
			setError('')
			const response = await fetch(`${API_URL}/restaurants/${slug}`)
			if (!response.ok) {
				if (response.status === 404) throw new Error('Restauracja nie istnieje')
				throw new Error('Nie udało się pobrać danych lokalu')
			}
			const data: RestaurantDetail = await response.json()
			setRestaurant(data)

			// Pre-fill edit form
			setEditForm({
				name: data.name || '',
				phone: data.phone || '',
				address: data.address || '',
				city: data.city || '',
				facebookUrl: data.facebookUrl || '',
				description: data.description || '',
				generalMenu: data.generalMenu || '',
			})

			// Increment view count silently
			fetch(`${API_URL}/restaurants/${data.id}/view`, { method: 'POST' }).catch(() => {})
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił błąd połączenia')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		fetchDetails()
	}, [slug])

	// --- 2. Check Ownership ---
	const isOwner = user && restaurant && (user.role === 'ADMIN' || restaurant.userId === user.id)

	// --- 3. Handle Submit Edit ---
	const handleSave = async (e: FormEvent) => {
		e.preventDefault()
		if (!restaurant || !token) return

		try {
			setSaving(true)
			setError('')
			setSaveSuccess('')

			const response = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(editForm),
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.message || 'Nie udało się zaktualizować profilu.')
			}

			const updated: RestaurantDetail = await response.json()
			setRestaurant(prev => (prev ? { ...prev, ...updated } : null))
			setSaveSuccess('Profil restauracji został zaktualizowany!')
			setIsEditing(false)

			// Refresh page details
			fetchDetails()
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas zapisywania.')
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<div className='flex-grow flex flex-col items-center justify-center min-h-[50vh] py-12'>
				<Loader className='w-8 h-8 text-stone-400 animate-spin mb-3' />
				<p className='font-mono text-xs uppercase tracking-widest text-stone-500'>Pobieranie profilu lokalu...</p>
			</div>
		)
	}

	if (error && !restaurant) {
		return (
			<div className='max-w-xl mx-auto px-4 py-12 text-center space-y-4'>
				<p className='font-mono text-sm text-red-600'>{error}</p>
				<Link
					to='/restaurants'
					className='inline-flex items-center gap-2 px-4 py-2 border border-black hover:bg-stone-50 font-mono text-xs uppercase tracking-wider font-bold'>
					<ArrowLeft className='w-4 h-4' /> Powrót do katalogu
				</Link>
			</div>
		)
	}

	if (!restaurant) return null

	const isFav = isFavorite ? isFavorite(restaurant.id) : false

	return (
		<main className='max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-8'>
			{/* Breadcrumb / Top Bar */}
			<div className='flex justify-between items-center border-b border-stone-100 pb-4'>
				<Link
					to='/restaurants'
					className='inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-stone-500 hover:text-black font-semibold'>
					<ArrowLeft className='w-3.5 h-3.5' /> Powrót do katalogu
				</Link>

				<div className='flex gap-2'>
					{isOwner && (
						<button
							onClick={() => setIsEditing(!isEditing)}
							className='inline-flex items-center gap-1.5 px-3 py-1.5 border border-stone-950 text-stone-950 hover:bg-stone-50 transition-colors font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer'>
							{isEditing ? <X className='w-3.5 h-3.5' /> : <Edit className='w-3.5 h-3.5' />}
							{isEditing ? 'Anuluj edycję' : 'Edytuj profil'}
						</button>
					)}
					{user && restaurant.status === 'APPROVED' && (
						<button
							onClick={() => toggleFavorite(restaurant.id)}
							className={`p-1.5 border rounded-full transition-all flex items-center justify-center cursor-pointer ${
								isFav ? 'border-red-200 bg-red-50 text-red-500' : 'border-stone-200 text-stone-400 hover:text-black'
							}`}
							title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
							<Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
						</button>
					)}
				</div>
			</div>

			{/* Inline Editing Form */}
			{isEditing ? (
				<form onSubmit={handleSave} className='bg-white border-2 border-black p-6 md:p-8 space-y-6 shadow-md text-left'>
					<div className='border-b border-stone-100 pb-3 flex justify-between items-center'>
						<h2 className='text-xl font-bold font-serif text-stone-900 flex items-center gap-2'>
							<Edit className='w-5 h-5 text-stone-700' /> Edytujesz profil: {restaurant.name}
						</h2>
						<span className='font-mono text-[10px] uppercase tracking-widest text-stone-400 font-bold'>
							Weryfikacja właściciela OK
						</span>
					</div>

					<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
						<div className='space-y-1'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								Nazwa restauracji
							</label>
							<input
								type='text'
								value={editForm.name}
								onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
								className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
								required
							/>
						</div>

						<div className='space-y-1'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								Telefon kontaktowy
							</label>
							<input
								type='tel'
								value={editForm.phone}
								onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
								placeholder='Brak'
								className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
							/>
						</div>

						<div className='space-y-1'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								Ulica i numer
							</label>
							<input
								type='text'
								value={editForm.address}
								onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
								placeholder='Brak'
								className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
							/>
						</div>

						<div className='space-y-1'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								Miasto
							</label>
							<input
								type='text'
								value={editForm.city}
								onChange={e => setEditForm(prev => ({ ...prev, city: e.target.value }))}
								className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
								required
							/>
						</div>
					</div>

					<div className='space-y-1'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							Link do profilu Facebook (do pobierania dań bota)
						</label>
						<input
							type='url'
							value={editForm.facebookUrl}
							onChange={e => setEditForm(prev => ({ ...prev, facebookUrl: e.target.value }))}
							placeholder='Brak'
							className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
						/>
					</div>

					<div className='space-y-1'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							O nas / Opis restauracji
						</label>
						<textarea
							rows={4}
							value={editForm.description}
							onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
							placeholder='Napisz kilka słów o Waszej kuchni, godzinach otwarcia i klimacie...'
							className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-sans leading-relaxed'
						/>
					</div>

					<div className='space-y-1'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							Menu ogólne / Stałe potrawy
						</label>
						<textarea
							rows={6}
							value={editForm.generalMenu}
							onChange={e => setEditForm(prev => ({ ...prev, generalMenu: e.target.value }))}
							placeholder='Podaj listę stałych dań, pizz, deserów i napojów dostępnych w menu głównym...'
							className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-sans leading-relaxed'
						/>
					</div>

					<div className='flex gap-3 justify-end pt-2 border-t border-stone-100 font-mono text-[10px] uppercase tracking-wider font-bold'>
						<button
							type='button'
							onClick={() => setIsEditing(false)}
							className='px-4 py-2.5 border border-stone-200 hover:border-black bg-white text-stone-800 transition-colors cursor-pointer'>
							Anuluj
						</button>
						<button
							type='submit'
							disabled={saving}
							className='px-5 py-2.5 bg-black text-white hover:bg-stone-900 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50'>
							<Save className='w-3.5 h-3.5' />
							{saving ? 'Zapisywanie...' : 'Zapisz zmiany'}
						</button>
					</div>
				</form>
			) : (
				/* Standard Profile View */
				<div className='space-y-8'>
					{/* Profile Header Block */}
					<header className='border border-stone-200 p-6 md:p-8 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden shadow-sm text-left'>
						<div className='space-y-3 max-w-xl'>
							<div className='flex items-center gap-2 flex-wrap'>
								<h1 className='text-3xl font-black font-serif text-stone-900 leading-tight'>{restaurant.name}</h1>
								{restaurant.rating && (
									<span className='flex items-center gap-0.5 text-xs font-mono bg-stone-100 px-2 py-0.5 rounded font-bold text-stone-800'>
										<Star className='w-3.5 h-3.5 fill-yellow-400 text-yellow-400' />
										{restaurant.rating.toFixed(1)}
									</span>
								)}
							</div>

							<div className='flex flex-col gap-1.5 text-stone-600 text-xs md:text-sm'>
								<p className='flex items-center gap-1.5'>
									<MapPin className='w-4 h-4 text-stone-400 shrink-0' />
									{restaurant.address ? `${restaurant.address}, ${restaurant.city}` : restaurant.city}
								</p>
								{restaurant.phone && (
									<p className='flex items-center gap-1.5'>
										<Phone className='w-4 h-4 text-stone-400 shrink-0' />
										{restaurant.phone}
									</p>
								)}
								<p className='flex items-center gap-1.5'>
									<Clock className='w-4 h-4 text-stone-400 shrink-0' />
									Wyświetlenia profilu: <strong className='font-mono text-stone-900'>{restaurant.views}</strong>
								</p>
							</div>
						</div>

						{/* Call to Actions in Header */}
						<div className='flex flex-col gap-2 shrink-0 w-full md:w-auto font-mono text-[10px] uppercase tracking-wider font-bold'>
							<a
								href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${restaurant.name}, ${restaurant.address || ''}, ${restaurant.city}`)}`}
								target='_blank'
								rel='noopener noreferrer'
								className='w-full md:w-48 text-center py-2.5 bg-stone-50 border border-stone-200 hover:border-black text-stone-700 hover:text-black flex items-center justify-center gap-1.5 hover:bg-stone-100 transition-colors cursor-pointer'>
								<Compass className='w-4 h-4 text-stone-500' /> Pokaż w Google Maps
							</a>

							{restaurant.facebookUrl && (
								<a
									href={restaurant.facebookUrl}
									target='_blank'
									rel='noopener noreferrer'
									className='w-full md:w-48 text-center py-2.5 bg-black text-white hover:bg-stone-900 flex items-center justify-center gap-1.5 transition-colors cursor-pointer'>
									<Globe className='w-4 h-4' /> Fanpage Facebook
								</a>
							)}
						</div>
					</header>

					{saveSuccess && (
						<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800 flex items-center gap-2'>
							<CheckCircleIcon className='w-4 h-4 text-stone-800' />
							<span>{saveSuccess}</span>
						</div>
					)}

					{/* Custom Tabs */}
					<div className='border-b border-stone-200'>
						<nav className='flex gap-4 font-mono text-xs uppercase tracking-wider font-bold'>
							<button
								onClick={() => setActiveTab('dishes')}
								className={`py-2 px-1 border-b-2 transition-colors cursor-pointer ${
									activeTab === 'dishes'
										? 'border-black text-black'
										: 'border-transparent text-stone-400 hover:text-stone-800'
								}`}>
								Oferta Dnia
							</button>
							<button
								onClick={() => setActiveTab('about')}
								className={`py-2 px-1 border-b-2 transition-colors cursor-pointer ${
									activeTab === 'about'
										? 'border-black text-black'
										: 'border-transparent text-stone-400 hover:text-stone-800'
								}`}>
								O nas
							</button>
							<button
								onClick={() => setActiveTab('menu')}
								className={`py-2 px-1 border-b-2 transition-colors cursor-pointer ${
									activeTab === 'menu'
										? 'border-black text-black'
										: 'border-transparent text-stone-400 hover:text-stone-800'
								}`}>
								Menu Ogólne
							</button>
						</nav>
					</div>

					{/* Tab Content Area */}
					<div className='pt-2 text-left'>
						{activeTab === 'dishes' && (
							<div className='space-y-6'>
								<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1'>
									<Clock className='w-3.5 h-3.5' /> Oferty i dania dnia
								</h2>

								{restaurant.dishes.length === 0 ? (
									<div className='border border-dashed border-stone-200 py-12 text-center bg-stone-50'>
										<p className='font-mono text-xs text-stone-400 uppercase'>Brak aktualnych dań dnia w systemie.</p>
									</div>
								) : (
									<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
										{restaurant.dishes.map(dish => (
											<article
												key={dish.id}
												className='border border-stone-200 p-5 bg-white flex flex-col justify-between hover:border-stone-400 transition-colors'>
												<div className='space-y-2'>
													<div className='flex justify-between items-start gap-4'>
														<h3 className='font-serif text-lg font-bold text-stone-900'>{dish.name}</h3>
														{dish.price && (
															<span className='font-mono text-sm font-bold bg-stone-50 px-2 py-0.5 border border-stone-100 shrink-0'>
																{Number(dish.price).toFixed(2)} zł
															</span>
														)}
													</div>

													{dish.description && (
														<p className='text-stone-600 text-xs md:text-sm font-sans leading-relaxed'>
															{dish.description}
														</p>
													)}
												</div>

												{/* Publish date */}
												<div className='mt-4 pt-3 border-t border-stone-50 flex justify-between items-center text-[10px] font-mono text-stone-400 uppercase'>
													<span className='flex items-center gap-1'>
														<Calendar className='w-3.5 h-3.5 text-stone-300' />
														Pobrane: {new Date(dish.date).toLocaleDateString('pl-PL')}
													</span>
												</div>
											</article>
										))}
									</div>
								)}
							</div>
						)}

						{activeTab === 'about' && (
							<div className='space-y-4'>
							<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
							<Shield className='w-4 h-4 text-stone-300' /> Profil i nasza historia
							</h2>

							<div className='bg-white border border-stone-200 p-6 md:p-8 space-y-4'>
							{restaurant.description ? (
							<p className='text-stone-700 text-sm leading-relaxed font-sans whitespace-pre-line'>
							{restaurant.description}
							</p>
							) : (
							<div className='text-center py-6 text-stone-400 font-mono text-xs uppercase'>
							Restauracja nie uzupełniła jeszcze opisu.
							</div>
							)}
							</div>

							            <h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5 pt-4'>
							<BookOpen className='w-4 h-4 text-stone-300' /> Historia
							</h2>

							<div className='bg-white border border-stone-200 p-6 md:p-8'>
							{restaurant.generalMenu ? (
							<p className='text-stone-700 text-sm leading-relaxed font-sans whitespace-pre-line'>
							{restaurant.generalMenu}
							</p>
							) : (
							<div className='text-center py-6 text-stone-400 font-mono text-xs uppercase'>
							Restauracja nie dodała jeszcze swojej historii.
							</div>
							)}
							</div>
							</div>
						)}

						{activeTab === 'menu' && (
							<div className='space-y-4'>
								<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
									<BookOpen className='w-4 h-4 text-stone-300' /> Karta Menu Głównego
								</h2>

								<div className='bg-white border border-stone-200 p-6 md:p-8'>
									{restaurant.generalMenu ? (
										<p className='text-stone-700 text-sm leading-relaxed font-sans whitespace-pre-line'>
											{restaurant.generalMenu}
										</p>
									) : (
										<div className='text-center py-6 text-stone-400 font-mono text-xs uppercase'>
											Restauracja nie dodała jeszcze karty menu stałego.
										</div>
									)}
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</main>
	)
}

// Simple Helper Check Circle Icon for styling
function CheckCircleIcon({ className }: { className?: string }) {
	return (
		<svg className={className} fill='none' viewBox='0 0 24 24' stroke='currentColor' strokeWidth={2}>
			<path strokeLinecap='round' strokeLinejoin='round' d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
		</svg>
	)
}
