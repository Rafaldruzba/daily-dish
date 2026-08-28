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
	BookOpen,
	Clock,
	Globe,
	Trash2,
	Plus,
	Check,
	X,
	Flag,
	MessageSquare,
	AlertTriangle,
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface Subscription {
	type: string
	status: string
	endsAt: string
}

interface MenuItem {
	id: string
	name: string
	description: string | null
	price: number | null
	category: string | null
}

interface RestaurantDetail {
	id: string
	name: string
	slug: string
	phone: string | null
	address: string | null
	city: string
	facebookUrl: string | null
	rating: number | null
	description: string | null
	generalMenu: string | null
	views: number
	userId: string | null
	latitude: number | null
	longitude: number | null
	subscriptions: Subscription[]
	dishes: Array<{
		id: string
		name: string
		description: string | null
		price: number | null
		imageUrl: string | null
		sourceUrl: string | null
		sourcePostId: string | null
		publishedAt: string
	}>
	staticOfferTitle?: string | null
	staticOfferDesc?: string | null
	staticOfferPrice?: number | null
	staticOfferImg?: string | null
	menuItems?: MenuItem[]
}

interface EditFormState {
	name: string
	phone: string
	address: string
	city: string
	facebookUrl: string
	description: string
	generalMenu: string
	staticOfferTitle: string
	staticOfferDesc: string
	staticOfferPrice: string
}

export default function RestaurantDetailPage() {
	const { slug } = useParams<{ slug: string }>()
	const { user, token, toggleFavorite, isFavorite } = useAuth()

	const [restaurant, setRestaurant] = useState<RestaurantDetail | null>(null)
	const [menuItems, setMenuItems] = useState<MenuItem[]>([])
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	// Edit Mode States
	const [isEditing, setIsEditing] = useState(false)
	const [editForm, setEditForm] = useState<EditFormState>({
		name: '',
		phone: '',
		address: '',
		city: '',
		facebookUrl: '',
		description: '',
		generalMenu: '',
		staticOfferTitle: '',
		staticOfferDesc: '',
		staticOfferPrice: '',
	})

	// New Menu Item Form States
	const [newMenuItems, setNewMenuItems] = useState<Array<{ name: string; description: string; price: string; category: string }>>([
		{ name: '', description: '', price: '', category: '' }
	])
	const [menuActionLoading, setMenuActionLoading] = useState(false)
	const [menuError, setMenuError] = useState('')
	const [menuSuccess, setMenuSuccess] = useState('')

	// Tab Navigator State
	const [activeTab, setActiveTab] = useState<'dishes' | 'about' | 'menu' | 'opinions'>('dishes')

	// Nowe stany dla opinii, komentarzy i zgłoszeń
	const [reviews, setReviews] = useState<any[]>([])
	const [newRating, setNewRating] = useState(5)
	const [newComment, setNewComment] = useState('')
	const [submittingReview, setSubmittingReview] = useState(false)
	const [reviewError, setReviewError] = useState('')
	const [reviewSuccess, setReviewSuccess] = useState('')

	// Zgłaszanie błędów lokalu
	const [isReportingRestaurant, setIsReportingRestaurant] = useState(false)
	const [restaurantReportReason, setRestaurantReportReason] = useState('INCORRECT_DATA')
	const [restaurantReportDetails, setRestaurantReportDetails] = useState('')
	const [isSubmittingRestaurantReport, setIsSubmittingRestaurantReport] = useState(false)

	// Zgłaszanie opinii
	const [reportingReviewId, setReportingReviewId] = useState<string | null>(null)
	const [reviewReportReason, setReviewReportReason] = useState('VULGAR')
	const [isSubmittingReviewReport, setIsSubmittingReviewReport] = useState(false)

	// --- 1. Fetch Restaurant Details & Reviews ---
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
			setMenuItems(data.menuItems || [])

			// Pre-fill edit form (z uwzględnieniem oferty stałej)
			setEditForm({
				name: data.name || '',
				phone: data.phone || '',
				address: data.address || '',
				city: data.city || '',
				facebookUrl: data.facebookUrl || '',
				description: data.description || '',
				generalMenu: data.generalMenu || '',
				staticOfferTitle: data.staticOfferTitle || '',
				staticOfferDesc: data.staticOfferDesc || '',
				staticOfferPrice: data.staticOfferPrice !== null && data.staticOfferPrice !== undefined ? String(data.staticOfferPrice) : '',
			})

			// Wczytanie opinii
			loadReviews(data.id)

			// Increment view count silently
			fetch(`${API_URL}/restaurants/${data.id}/view`, { method: 'POST' }).catch(() => {})
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił błąd połączenia')
		} finally {
			setLoading(false)
		}
	}

	const loadReviews = async (restaurantId: string) => {
		try {
			const res = await fetch(`${API_URL}/reviews/${restaurantId}/reviews`)
			if (res.ok) {
				const data = await res.json()
				setReviews(data)
			}
		} catch (err) {
			console.error('Error loading reviews:', err)
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
			setSuccess('')

			const response = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					...editForm,
					staticOfferPrice: editForm.staticOfferPrice ? parseFloat(editForm.staticOfferPrice) : null
				}),
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.message || 'Nie udało się zaktualizować profilu.')
			}

			const updated: RestaurantDetail = await response.json()
			setRestaurant(prev => (prev ? { ...prev, ...updated } : null))
			setSuccess('Profil restauracji został zaktualizowany!')
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

	// --- 4. Menu Actions ---
	const handleAddNewRow = () => {
		setNewMenuItems(prev => [
			...prev,
			{ name: '', description: '', price: '', category: '' }
		])
	}

	const handleRemoveNewRow = (index: number) => {
		setNewMenuItems(prev => prev.filter((_, i) => i !== index))
	}

	const handleNewRowChange = (index: number, field: string, value: string) => {
		setNewMenuItems(prev => prev.map((item, i) => {
			if (i === index) {
				return { ...item, [field]: value }
			}
			return item
		}))
	}

	const handleSaveNewMenuItems = async (e: FormEvent) => {
		e.preventDefault()
		if (!restaurant || !token) return

		const itemsToSubmit = newMenuItems.filter(item => item.name.trim() !== '')
		if (itemsToSubmit.length === 0) {
			setMenuError('Podaj przynajmniej nazwę dla dodawanej pozycji.')
			return
		}

		try {
			setMenuActionLoading(true)
			setMenuError('')
			setMenuSuccess('')

			const response = await fetch(`${API_URL}/offers/${restaurant.id}/menu-item`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(itemsToSubmit),
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.message || 'Nie udało się dodać pozycji do menu.')
			}

			// Refresh details from backend
			const res = await fetch(`${API_URL}/restaurants/${slug}`)
			if (res.ok) {
				const freshData: RestaurantDetail = await res.json()
				setRestaurant(freshData)
				setMenuItems(freshData.menuItems || [])
			}

			setMenuSuccess('Pozycje zostały pomyślnie dodane do menu!')
			setNewMenuItems([{ name: '', description: '', price: '', category: '' }])
		} catch (err) {
			console.error(err)
			setMenuError(err instanceof Error ? err.message : 'Błąd podczas dodawania pozycji.')
		} finally {
			setMenuActionLoading(false)
		}
	}

	const handleDeleteMenuItem = async (itemId: string) => {
		if (!restaurant || !token) return
		if (!window.confirm('Czy na pewno chcesz usunąć tę pozycję z menu?')) return

		try {
			setMenuActionLoading(true)
			setMenuError('')
			setMenuSuccess('')

			const response = await fetch(`${API_URL}/offers/${restaurant.id}/menu-item/${itemId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (!response.ok) {
				const data = await response.json()
				throw new Error(data.message || 'Nie udało się usunąć pozycji z menu.')
			}

			setMenuItems(prev => prev.filter(item => item.id !== itemId))
			setMenuSuccess('Pozycja została pomyślnie usunięta z menu!')
		} catch (err) {
			console.error(err)
			setMenuError(err instanceof Error ? err.message : 'Błąd podczas usuwania pozycji.')
		} finally {
			setMenuActionLoading(false)
		}
	}

	// --- 5. Opinie i Komentarze Actions ---
	const handleSubmitReview = async (e: FormEvent) => {
		e.preventDefault()
		if (!token || !restaurant) return
		try {
			setSubmittingReview(true)
			setReviewError('')
			setReviewSuccess('')
			const res = await fetch(`${API_URL}/reviews/${restaurant.id}/reviews`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ rating: newRating, comment: newComment }),
			})
			const data = await res.json()
			if (res.ok) {
				setReviewSuccess('Dziękujemy! Twoja opinia została pomyślnie dodana.')
				setNewComment('')
				setNewRating(5)
				loadReviews(restaurant.id)
				fetchDetails() // Odświeża średnią ocenę
			} else {
				setReviewError(data.message || 'Nie udało się dodać opinii.')
			}
		} catch (err) {
			console.error('Error submitting review:', err)
			setReviewError('Wystąpił błąd połączenia z serwerem.')
		} finally {
			setSubmittingReview(false)
		}
	}

	const handleReportReview = async (e: FormEvent) => {
		e.preventDefault()
		if (!token || !reportingReviewId || !restaurant) return
		try {
			setIsSubmittingReviewReport(true)
			const res = await fetch(`${API_URL}/reviews/report/${reportingReviewId}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ reason: reviewReportReason }),
			})
			if (res.ok) {
				alert('Opinia została pomyślnie zgłoszona i ukryta do czasu weryfikacji przez moderatora.')
				setReportingReviewId(null)
				setReviewReportReason('VULGAR')
				loadReviews(restaurant.id)
				fetchDetails()
			}
		} catch (err) {
			console.error('Error reporting review:', err)
		} finally {
			setIsSubmittingReviewReport(false)
		}
	}

	const handleReportRestaurant = async (e: FormEvent) => {
		e.preventDefault()
		if (!token || !restaurant) return
		try {
			setIsSubmittingRestaurantReport(true)
			const res = await fetch(`${API_URL}/reports/restaurants/${restaurant.id}/report`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ reason: restaurantReportReason, details: restaurantReportDetails }),
			})
			if (res.ok) {
				alert('Dziękujemy! Zgłoszenie błędu lokalu zostało przesłane do moderatora.')
				setIsReportingRestaurant(false)
				setRestaurantReportDetails('')
				setRestaurantReportReason('INCORRECT_DATA')
			}
		} catch (err) {
			console.error('Error reporting restaurant:', err)
		} finally {
			setIsSubmittingRestaurantReport(false)
		}
	}

	// --- LOADING & ERROR VIEWS ---
	if (loading) {
		return (
			<div className='flex flex-col items-center justify-center min-h-[50vh] space-y-4'>
				<Loader className='w-8 h-8 text-black animate-spin' />
				<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>Ładowanie profilu lokalu...</p>
			</div>
		)
	}

	if (error || !restaurant) {
		return (
			<main className='max-w-3xl mx-auto px-4 py-16 text-center space-y-6 text-left'>
				<div className='w-12 h-12 bg-stone-50 border border-stone-200 text-stone-800 flex items-center justify-center font-serif text-lg font-bold mx-auto shadow-sm'>
					!
				</div>
				<h1 className='text-2xl font-bold font-serif text-stone-900'>Coś poszło nie tak</h1>
				<p className='text-stone-500 text-sm max-w-md mx-auto leading-relaxed'>{error || 'Restauracja nie została znaleziona.'}</p>
				<Link
					to='/'
					className='inline-flex items-center gap-1.5 px-4 py-2 border border-black hover:bg-black hover:text-white transition-colors font-mono text-xs uppercase tracking-widest font-bold cursor-pointer'>
					<ArrowLeft className='w-4 h-4' /> Powrót do mapy
				</Link>
			</main>
		)
	}

	const isFav = isFavorite(restaurant.id)

	return (
		<main className='max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-10'>
			{/* Back Link */}
			<div className='text-left'>
				<Link to='/' className='inline-flex items-center gap-1.5 text-stone-500 hover:text-black font-mono text-xs uppercase tracking-widest transition-colors font-bold'>
					<ArrowLeft className='w-4 h-4' /> Powrót do mapy
				</Link>
			</div>

			{success && (
				<div className='p-4 bg-green-50 border-l-4 border-green-600 text-xs font-mono text-green-800 flex items-start gap-2 max-w-4xl mx-auto text-left shadow-sm'>
					<span>{success}</span>
				</div>
			)}
			{error && (
				<div className='p-4 bg-red-50 border-l-4 border-red-500 text-xs font-mono text-red-500 max-w-4xl mx-auto text-left shadow-sm'>
					{error}
				</div>
			)}

			{/* Main Profile Info Card */}
			<section className='border border-stone-200 bg-white p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm relative overflow-hidden text-left'>
				<div className='space-y-4 flex-grow'>
					<div>
						<div className='flex flex-wrap items-center gap-3'>
							<h1 className='text-3xl font-black font-serif text-stone-900 tracking-tight'>{restaurant.name}</h1>
							
							{restaurant.rating ? (
								<span className='inline-flex items-center gap-1 text-sm bg-stone-100 px-3 py-1 font-mono font-bold text-stone-900 shadow-sm'>
									<Star className='w-3.5 h-3.5 fill-black text-black shrink-0' />
									{Number(restaurant.rating).toFixed(1)}
								</span>
							) : (
								<span className='text-xs font-mono text-stone-400'>Brak ocen</span>
							)}
						</div>
						<span className='font-mono text-[10px] uppercase tracking-wider text-stone-400 block mt-1'>
							{restaurant.city} • {restaurant.address}
						</span>
					</div>

					<p className='text-stone-600 text-sm md:text-base leading-relaxed font-sans max-w-2xl'>
						{restaurant.description || 'Ten lokal nie dodał jeszcze swojego opisu.'}
					</p>

					{/* Metadata fields */}
					<div className='grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs font-sans text-stone-500 border-t border-stone-100'>
						<p className='flex items-center gap-2'>
							<MapPin className='w-4 h-4 text-stone-400 shrink-0' />
							<strong>Adres:</strong> {restaurant.address}, {restaurant.city}
						</p>
						{restaurant.phone && (
							<p className='flex items-center gap-2'>
								<Phone className='w-4 h-4 text-stone-400 shrink-0' />
								<strong>Telefon:</strong> <a href={`tel:${restaurant.phone}`} className='hover:text-black hover:underline'>{restaurant.phone}</a>
							</p>
						)}
					</div>
				</div>

				{/* Header Actions (Fav & Edit) */}
				<div className='flex flex-wrap items-center gap-3 shrink-0 self-start md:self-center'>
					{/* Favorite Button */}
					{user && (
						<button
							onClick={() => toggleFavorite(restaurant.id)}
							className={`p-3 border transition-colors flex items-center justify-center cursor-pointer shadow-sm ${
								isFav
									? 'border-red-600 bg-red-50 text-red-600 hover:bg-red-100'
									: 'border-stone-200 text-stone-400 hover:border-black hover:text-black hover:bg-stone-50'
							}`}
							title={isFav ? 'Usuń z ulubionych' : 'Dodaj do ulubionych'}>
							<Heart className={`w-4 h-4 ${isFav ? 'fill-red-600' : ''}`} />
						</button>
					)}

					{/* Zgłoś błąd lokalu */}
					{user && (
						<button
							onClick={() => setIsReportingRestaurant(true)}
							className="p-3 border border-stone-200 hover:border-black hover:bg-stone-50 text-stone-500 hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
							title="Zgłoś błąd w danych lokalu">
							<Flag className="w-4 h-4 text-red-600 shrink-0" />
							<span className="text-[10px] font-mono uppercase tracking-wider font-bold">Zgłoś błąd</span>
						</button>
					)}

					{/* Edit Button for Owner/Admin */}
					{isOwner && (
						<button
							onClick={() => setIsEditing(true)}
							className='px-4 py-2.5 border border-black hover:bg-black hover:text-white text-black transition-colors flex items-center gap-2 font-mono text-xs uppercase tracking-widest font-bold cursor-pointer shadow-sm'>
							<Edit className='w-4 h-4' /> Edytuj
						</button>
					)}
				</div>
			</section>

			{/* Sub-tab Navigation */}
			<section className='space-y-6'>
				<div className='border-b border-stone-200 overflow-x-auto whitespace-nowrap scrollbar-none'>
					<nav className='flex gap-6 font-mono text-xs uppercase tracking-wider font-bold'>
						<button
							onClick={() => setActiveTab('dishes')}
							className={`py-3 px-1 border-b-2 transition-colors cursor-pointer ${
								activeTab === 'dishes'
									? 'border-black text-black'
									: 'border-transparent text-stone-400 hover:text-stone-800'
							}`}>
							Oferta Dnia
						</button>
						<button
							onClick={() => setActiveTab('opinions')}
							className={`py-3 px-1 border-b-2 transition-colors cursor-pointer ${
								activeTab === 'opinions'
									? 'border-black text-black'
									: 'border-transparent text-stone-400 hover:text-stone-800'
							}`}>
							Opinie ({reviews.length})
						</button>
						<button
							onClick={() => setActiveTab('about')}
							className={`py-3 px-1 border-b-2 transition-colors cursor-pointer ${
								activeTab === 'about'
									? 'border-black text-black'
									: 'border-transparent text-stone-400 hover:text-stone-800'
							}`}>
							O nas
						</button>
						<button
							onClick={() => setActiveTab('menu')}
							className={`py-3 px-1 border-b-2 transition-colors cursor-pointer ${
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
					
					{/* Tab 1: Dishes / Today's Offers */}
					{activeTab === 'dishes' && (
						<div className='space-y-6'>
							<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
								<Clock className='w-3.5 h-3.5' /> Oferty i dania dnia
							</h2>

							{restaurant.dishes.length === 0 ? (
								restaurant.staticOfferTitle ? (
									/* Wyświetlanie oferty stałej w przypadku braku dania dnia z FB */
									<article className='border border-stone-200 p-6 bg-white flex flex-col justify-between hover:border-stone-400 transition-colors shadow-sm'>
										<div className='space-y-3'>
											<div className='flex justify-between items-start gap-4'>
												<div>
													<span className='px-2 py-0.5 bg-stone-100 text-stone-700 font-mono text-[9px] uppercase font-bold tracking-wider block w-max mb-1.5 shadow-sm'>
														Nasza Oferta Stała
													</span>
													<h3 className='font-serif text-lg font-bold text-stone-900'>{restaurant.staticOfferTitle}</h3>
												</div>
												{restaurant.staticOfferPrice && (
													<span className='font-mono text-sm font-bold bg-stone-50 px-2 py-0.5 border border-stone-100 shrink-0 shadow-sm'>
														{Number(restaurant.staticOfferPrice).toFixed(2)} zł
													</span>
												)}
											</div>
											{restaurant.staticOfferDesc && (
												<p className='text-stone-600 text-xs md:text-sm font-sans leading-relaxed'>{restaurant.staticOfferDesc}</p>
											)}
										</div>
									</article>
								) : (
									<div className='border border-dashed border-stone-200 py-12 text-center bg-stone-50 rounded-none'>
										<p className='font-mono text-xs text-stone-400 uppercase'>Brak aktualnych dań dnia w systemie.</p>
									</div>
								)
							) : (
								<div className='grid grid-cols-1 gap-6'>
									{restaurant.dishes.map(dish => (
										<article
											key={dish.id}
											className='border border-stone-200 p-5 bg-white flex flex-col justify-between hover:border-stone-400 transition-colors shadow-sm'>
											<div className='space-y-2'>
												<div className='flex justify-between items-start gap-4'>
													<h3 className='font-serif text-lg font-bold text-stone-900'>{dish.name}</h3>
													{dish.price && (
														<span className='font-mono text-sm font-bold bg-stone-50 px-2 py-0.5 border border-stone-100 shrink-0 shadow-sm'>
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
													<Clock className='w-3 h-3' />
													Pobrano:{' '}
													{new Date(dish.publishedAt).toLocaleDateString('pl-PL')}{' '}
													{new Date(dish.publishedAt).toLocaleTimeString('pl-PL', {
														hour: '2-digit',
														minute: '2-digit',
													})}
												</span>

												{dish.sourceUrl && (
													<a
														href={dish.sourceUrl}
														target='_blank'
														rel='noopener noreferrer'
														className='inline-flex items-center gap-1 hover:text-black font-bold'>
														Post źródłowy <Globe className='w-3 h-3' />
													</a>
												)}
											</div>
										</article>
									))}
								</div>
							)}
						</div>
					)}

					{/* Tab 2: Opinions & Comments */}
					{activeTab === 'opinions' && (
						<div className='space-y-8'>
							<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
								<MessageSquare className='w-3.5 h-3.5' /> Opinie i recenzje smakoszy
							</h2>

							{/* Formularz dodawania nowej opinii (Widoczny tylko dla roli USER) */}
							{user && user.role === 'USER' && (
								<div className='border border-stone-200 p-6 bg-stone-50 space-y-4 shadow-sm'>
									<h3 className='font-serif font-bold text-stone-900 text-base'>Dodaj swoją opinię</h3>
									<form onSubmit={handleSubmitReview} className='space-y-4 font-sans text-sm'>
										<div className='flex items-center gap-3'>
											<label className='font-mono text-xs uppercase tracking-wider font-bold text-stone-600'>Ocena lokalu:</label>
											<div className='flex gap-1'>
												{[1, 2, 3, 4, 5].map(val => (
													<button
														key={val}
														type='button'
														onClick={() => setNewRating(val)}
														className='p-1 hover:scale-110 transition-transform cursor-pointer'>
														<Star className={`w-6 h-6 ${val <= newRating ? 'fill-black text-black' : 'text-stone-300'}`} />
													</button>
												))}
											</div>
										</div>
										<div className='space-y-1.5'>
											<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>Twój Komentarz *</label>
											<textarea
												rows={4}
												value={newComment}
												onChange={e => setNewComment(e.target.value)}
												placeholder='Opisz swoje wrażenia kulinarne, napisz co warto zamówić...'
												className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-sans leading-relaxed'
												required
											/>
										</div>
										<button
											type='submit'
											disabled={submittingReview}
											className='px-5 py-2 bg-black text-white hover:bg-stone-900 transition-colors font-mono text-xs uppercase tracking-widest font-bold disabled:opacity-50 cursor-pointer shadow-sm'>
											{submittingReview ? 'Publikowanie...' : 'Opublikuj opinię'}
										</button>
									</form>

									{reviewSuccess && (
										<div className='p-4 bg-green-50 border-l-2 border-green-600 text-xs font-mono text-green-800'>
											{reviewSuccess}
										</div>
									)}
									{reviewError && (
										<div className='p-4 bg-red-50 border-l-2 border-red-500 text-xs font-mono text-red-500'>
											{reviewError}
										</div>
									)}
								</div>
							)}

							{/* Lista opinii */}
							<div className='space-y-4'>
								{reviews.length === 0 ? (
									<div className='py-12 border border-dashed border-stone-200 text-center bg-stone-50 rounded-none'>
										<p className='text-stone-400 text-xs font-mono uppercase'>Ten lokal nie posiada jeszcze żadnych recenzji.</p>
										<p className='text-stone-400 text-[10px] font-sans italic mt-1'>Bądź pierwszym, który wystawi komentarz!</p>
									</div>
								) : (
									reviews.map(rev => (
										<div key={rev.id} className='border border-stone-200 p-5 bg-white space-y-3 shadow-sm relative text-left'>
											<div className='flex items-center justify-between border-b border-stone-100 pb-2'>
												<div>
													<h4 className='font-serif font-bold text-stone-900 text-sm'>{rev.user?.name || 'Smakosz'}</h4>
													<span className='text-[10px] text-stone-400 font-mono uppercase'>
														Wystawiono: {new Date(rev.createdAt).toLocaleDateString('pl-PL')}
													</span>
												</div>
												<div className='flex items-center gap-3'>
													<span className='flex items-center bg-stone-50 px-2 py-0.5 border border-stone-100 text-xs font-mono font-bold text-stone-900'>
														<Star className='w-3.5 h-3.5 fill-black text-black mr-1 shrink-0' />
														{rev.rating} / 5
													</span>
													{/* Report Comment Button */}
													{user && (
														<button
															onClick={() => setReportingReviewId(rev.id)}
															className='p-1.5 border border-stone-100 hover:border-red-600 hover:bg-red-50 text-stone-400 hover:text-red-600 transition-colors rounded-sm cursor-pointer'
															title='Zgłoś nieodpowiedni komentarz'>
															<Flag className='w-3.5 h-3.5' />
														</button>
													)}
												</div>
											</div>
											<p className='text-stone-700 text-xs md:text-sm leading-relaxed font-sans'>„{rev.comment}”</p>
										</div>
									))
								)}
							</div>
						</div>
					)}

					{/* Tab 3: About Us */}
					{activeTab === 'about' && (
						<div className='grid grid-cols-1 md:grid-cols-3 gap-8'>
							<div className='md:col-span-2 space-y-6'>
								<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
									<BookOpen className='w-3.5 h-3.5' /> O naszej restauracji
								</h2>

								<div className='bg-stone-50 border border-stone-200 p-6 font-sans text-stone-600 text-xs md:text-sm leading-relaxed whitespace-pre-line shadow-sm'>
									{restaurant.description || 'Ten lokal nie dodał jeszcze rozszerzonego opisu o sobie.'}
								</div>
							</div>

							<div className='space-y-6'>
								<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
									<Globe className='w-3.5 h-3.5' /> Kanały social media
								</h2>

								<div className='border border-stone-200 p-5 bg-white space-y-4 shadow-sm'>
									<div className='w-10 h-10 bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center font-mono font-bold text-sm'>
										FB
									</div>
									<div className='space-y-1'>
										<h4 className='font-serif font-bold text-stone-900 text-sm'>Profil Facebook</h4>
										<p className='text-stone-400 text-[10px] font-mono leading-relaxed truncate'>
											{restaurant.facebookUrl || 'Brak powiązanego profilu'}
										</p>
									</div>

									{restaurant.facebookUrl ? (
										<a
											href={restaurant.facebookUrl}
											target='_blank'
											rel='noopener noreferrer'
											className='w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-black hover:bg-stone-900 text-white font-mono text-xs uppercase tracking-widest font-bold transition-colors cursor-pointer shadow-sm'>
											Odwiedź social media
										</a>
									) : (
										<button
											disabled
											className='w-full px-4 py-2 border border-dashed border-stone-200 text-stone-300 font-mono text-xs uppercase tracking-widest font-bold cursor-not-allowed'>
											Profil nieaktywny
										</button>
									)}
								</div>
							</div>
						</div>
					)}

					{/* Tab 4: General Menu */}
					{activeTab === 'menu' && (
						<div className='space-y-8'>
							<div className='flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-stone-100 pb-2'>
								<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 flex items-center gap-1.5'>
									<BookOpen className='w-3.5 h-3.5' /> Karta Menu Głównego
								</h2>

								{/* Add menu item form only for Owner */}
								{isOwner && (
									<button
										onClick={() => {
											setActiveTab('menu')
											// Focus scroll or open accordion could be handled
										}}
										className='px-3 py-1.5 border border-stone-200 hover:border-black font-mono text-[10px] uppercase tracking-wider font-bold transition-all flex items-center gap-1 cursor-pointer bg-white text-stone-900 shadow-sm'>
										<Plus className='w-3.5 h-3.5' /> Dodaj Pozycje
									</button>
								)}
							</div>

							{menuItems.length === 0 ? (
								<div className='space-y-6'>
									{/* Fallback do dawnego pola tekstowego generalMenu, jeśli istnieje, w innym wypadku pustka */}
									{restaurant.generalMenu ? (
										<div className='bg-stone-50 border border-stone-200 p-6 font-sans text-stone-600 text-xs md:text-sm leading-relaxed whitespace-pre-line text-left shadow-sm'>
											{restaurant.generalMenu}
										</div>
									) : (
										<div className='py-12 border border-dashed border-stone-200 text-center bg-stone-50 rounded-none'>
											<p className='text-stone-400 text-xs font-mono uppercase'>To menu główne lokalu nie posiada jeszcze dodanych pozycji.</p>
										</div>
									)}
								</div>
							) : (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									{menuItems.map(item => (
										<div
											key={item.id}
											className='border border-stone-200 p-5 bg-white space-y-2 hover:border-stone-400 transition-colors shadow-sm flex flex-col justify-between'>
											<div className='space-y-1'>
												<div className='flex justify-between items-start gap-4'>
													<h4 className='font-serif font-bold text-stone-900 text-sm'>{item.name}</h4>
													{item.price && (
														<span className='font-mono text-xs font-bold bg-stone-50 px-2 py-0.5 border border-stone-100 shrink-0 shadow-sm'>
															{Number(item.price).toFixed(2)} zł
														</span>
													)}
												</div>
												{item.description && (
													<p className='text-stone-500 text-xs leading-relaxed font-sans'>{item.description}</p>
												)}
											</div>

											{item.category && (
												<div className='pt-2 border-t border-stone-50 flex justify-between items-center text-[9px] font-mono text-stone-400 uppercase tracking-widest'>
													<span>Kategoria: {item.category}</span>
													{isOwner && (
														<button
															onClick={() => handleDeleteMenuItem(item.id)}
															disabled={menuActionLoading}
															className='hover:text-red-600 flex items-center gap-0.5 transition-colors cursor-pointer font-bold uppercase'>
															<Trash2 className='w-3 h-3' /> Usuń
														</button>
													)}
												</div>
											)}
										</div>
									))}
								</div>
							)}

							{/* Formularz dodawania pozycji dla Właściciela / ADMINA */}
							{isOwner && (
								<div className='border border-stone-200 p-6 md:p-8 bg-stone-50 space-y-6 shadow-sm mt-10 text-left'>
									<div className='border-b border-stone-100 pb-3'>
										<h3 className='font-serif font-bold text-stone-900 text-base'>Dodaj nowe pozycje do Menu</h3>
										<p className='text-[11px] text-stone-400 font-mono mt-0.5'>Możesz dodać wiele pozycji jednocześnie, wpisując je poniżej.</p>
									</div>

									<form onSubmit={handleSaveNewMenuItems} className='space-y-4 font-sans text-xs'>
										{newMenuItems.map((item, index) => (
											<div key={index} className='p-4 border border-stone-200 bg-white grid grid-cols-1 md:grid-cols-12 gap-3 relative shadow-xs'>
												<div className='md:col-span-4 space-y-1'>
													<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>Nazwa Pozycji *</label>
													<input
														type='text'
														value={item.name}
														onChange={e => handleNewRowChange(index, 'name', e.target.value)}
														placeholder='np. Kotlet schabowy z ziemniakami'
														className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
														required
													/>
												</div>
												<div className='md:col-span-4 space-y-1'>
													<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>Krótki opis pozycji</label>
													<input
														type='text'
														value={item.description}
														onChange={e => handleNewRowChange(index, 'description', e.target.value)}
														placeholder='Zestaw z kapustą zasmażaną i purée...'
														className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs font-sans'
													/>
												</div>
												<div className='md:col-span-2 space-y-1'>
													<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>Cena (PLN) *</label>
													<input
														type='number'
														step='0.01'
														value={item.price}
														onChange={e => handleNewRowChange(index, 'price', e.target.value)}
														placeholder='35.00'
														className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
														required
													/>
												</div>
												<div className='md:col-span-2 space-y-1 pr-6'>
													<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>Kategoria</label>
													<input
														type='text'
														value={item.category}
														onChange={e => handleNewRowChange(index, 'category', e.target.value)}
														placeholder='np. Obiady'
														className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs font-mono'
													/>
												</div>

												{newMenuItems.length > 1 && (
													<button
														type='button'
														onClick={() => handleRemoveNewRow(index)}
														className='absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-red-600 p-1 cursor-pointer'
														title='Usuń ten wiersz'>
														<X className='w-4 h-4' />
													</button>
												)}
											</div>
										))}

										<div className='flex flex-col sm:flex-row gap-3 pt-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
											<button
												type='button'
												onClick={handleAddNewRow}
												className='px-4 py-2 border border-stone-200 hover:border-black text-stone-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white shadow-sm'>
												<Plus className='w-3.5 h-3.5' /> Dodaj kolejną pozycję
											</button>
											<button
												type='submit'
												disabled={menuActionLoading}
												className='px-5 py-2.5 bg-black text-white hover:bg-stone-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm'>
												<Check className='w-3.5 h-3.5' /> Zapisz dodawane menu
											</button>
										</div>
									</form>

									{menuSuccess && (
										<div className='p-4 bg-green-50 border-l-2 border-green-600 text-xs font-mono text-green-800'>
											{menuSuccess}
										</div>
									)}
									{menuError && (
										<div className='p-4 bg-red-50 border-l-2 border-red-500 text-xs font-mono text-red-500'>
											{menuError}
										</div>
									)}
								</div>
							)}
						</div>
					)}
				</div>
			</section>

			{/* Support banner block */}
			<section className='bg-stone-50 border border-stone-200 p-6 md:p-8 text-center max-w-4xl mx-auto shadow-sm'>
				<p className='text-stone-500 text-xs md:text-sm font-sans'>
					Oferty pobierane są automatycznie z oficjalnego profilu lokalu na Facebooku raz na dobę. 
					Jeśli zauważysz błąd w danych restauracji, możesz zgłosić to za pomocą formularza w prawym górnym rogu.
				</p>
			</section>

			{/* --- MODALE --- */}

			{/* 1. MODAL ZGŁOSZENIA BŁĘDU LOKALU */}
			{isReportingRestaurant && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 py-12 z-50 animate-fade-in">
					<div className="bg-white border border-stone-200 w-full max-w-md p-6 md:p-8 shadow-xl space-y-6 text-left relative animate-scale-up rounded-none">
						<button
							onClick={() => setIsReportingRestaurant(false)}
							className="absolute right-4 top-4 p-1 text-stone-400 hover:text-black transition-colors cursor-pointer">
							<X className="w-5 h-5" />
						</button>
						<div className="border-b border-stone-100 pb-3">
							<h3 className="text-xl font-bold font-serif text-stone-900 flex items-center gap-1.5">
								<AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
								Zgłoś błąd w danych lokalu
							</h3>
							<p className="text-stone-400 text-[10px] font-mono uppercase tracking-wider block mt-1">Zgłoszenie do moderatora</p>
						</div>

						<form onSubmit={handleReportRestaurant} className="space-y-4 font-sans text-xs">
							<div className="space-y-1.5">
								<label className="text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block">Kategoria zgłoszenia *</label>
								<select
									value={restaurantReportReason}
									onChange={e => setRestaurantReportReason(e.target.value)}
									className="w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs bg-white">
									<option value="INCORRECT_DATA">Niepoprawne dane (adres, telefon, menu...)</option>
									<option value="SCAM">Oszustwo / Nieuczciwość</option>
									<option value="IMPERSONATION">Podszywanie się pod markę</option>
									<option value="OTHER">Inne naruszenie</option>
								</select>
							</div>
							<div className="space-y-1.5">
								<label className="text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block">Opis szczegółowy *</label>
								<textarea
									rows={4}
									value={restaurantReportDetails}
									onChange={e => setRestaurantReportDetails(e.target.value)}
									placeholder="Wpisz poprawne dane lub szczegółowo uzasadnij oszustwo lokalu..."
									className="w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs leading-relaxed font-sans"
									required
								/>
							</div>

							<div className="flex gap-2 pt-2 font-mono text-[10px] uppercase tracking-wider font-bold">
								<button
									type="submit"
									disabled={isSubmittingRestaurantReport}
									className="px-4 py-2.5 bg-black hover:bg-stone-900 text-white transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm flex-grow">
									Wyślij zgłoszenie
								</button>
								<button
									type="button"
									onClick={() => setIsReportingRestaurant(false)}
									className="px-4 py-2.5 border border-stone-200 hover:border-black text-stone-700 transition-all cursor-pointer">
									Anuluj
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* 2. MODAL ZGŁOSZENIA OPINII */}
			{reportingReviewId && (
				<div className="fixed inset-0 bg-black/40 flex items-center justify-center px-4 py-12 z-50 animate-fade-in">
					<div className="bg-white border border-stone-200 w-full max-w-sm p-6 md:p-8 shadow-xl space-y-6 text-left relative animate-scale-up rounded-none">
						<button
							onClick={() => setReportingReviewId(null)}
							className="absolute right-4 top-4 p-1 text-stone-400 hover:text-black transition-colors cursor-pointer">
							<X className="w-5 h-5" />
						</button>
						<div className="border-b border-stone-100 pb-3">
							<h3 className="text-xl font-bold font-serif text-stone-900 flex items-center gap-1.5">
								<Flag className="w-5 h-5 text-red-600 shrink-0" />
								Zgłoś recenzję użytkownika
							</h3>
							<p className="text-stone-400 text-[10px] font-mono uppercase tracking-wider block mt-1">Zgłoszenie do moderatora</p>
						</div>

						<form onSubmit={handleReportReview} className="space-y-4 font-sans text-xs">
							<div className="space-y-1.5">
								<label className="text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block">Powód zgłoszenia opinii *</label>
								<select
									value={reviewReportReason}
									onChange={e => setReviewReportReason(e.target.value)}
									className="w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs bg-white">
									<option value="VULGAR">Komentarz wulgarny / obraźliwy</option>
									<option value="UNTRUTHFUL">Opinia nieprawdziwa / spam</option>
									<option value="TOS_VIOLATION">Naruszający regulamin serwisu</option>
									<option value="RIGHTS_VIOLATION">Naruszający prawa osób trzecich</option>
								</select>
							</div>

							<div className="flex gap-2 pt-2 font-mono text-[10px] uppercase tracking-wider font-bold">
								<button
									type="submit"
									disabled={isSubmittingReviewReport}
									className="px-4 py-2.5 bg-black hover:bg-stone-900 text-white transition-all flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 shadow-sm flex-grow">
									Zgłoś i ukryj
								</button>
								<button
									type="button"
									onClick={() => setReportingReviewId(null)}
									className="px-4 py-2.5 border border-stone-200 hover:border-black text-stone-700 transition-all cursor-pointer">
									Anuluj
								</button>
							</div>
						</form>
					</div>
				</div>
			)}

			{/* 3. EDIT PROFILE INFO MODAL (EXISTING RES_DETAIL MODAL EXTENDED TO COVER STATIC_OFFER FIELDS) */}
			{isEditing && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center px-4 py-12 z-50 overflow-y-auto animate-fade-in'>
					<div className='bg-white border border-stone-200 w-full max-w-lg p-6 md:p-8 shadow-xl space-y-6 text-left relative animate-scale-up rounded-none my-8'>
						<button
							onClick={() => setIsEditing(false)}
							className='absolute right-4 top-4 p-1 text-stone-400 hover:text-black transition-colors cursor-pointer'>
							<X className='w-5 h-5' />
						</button>

						<div className='border-b border-stone-100 pb-3'>
							<h3 className='text-xl font-bold font-serif text-stone-900'>Edytuj informacje o lokalu</h3>
							<p className='text-stone-400 text-[10px] font-mono uppercase tracking-wider block mt-1'>
								Zarządzaj swoimi danymi kontaktowymi i stałą ofertą lokalu
							</p>
						</div>

						<form onSubmit={handleSave} className='space-y-4 font-sans text-xs max-h-[60vh] overflow-y-auto pr-2'>
							<div className='space-y-1.5'>
								<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
									Nazwa restauracji *
								</label>
								<input
									type='text'
									value={editForm.name}
									onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
									className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
									required
								/>
							</div>

							<div className='grid grid-cols-2 gap-4'>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										Telefon kontaktowy *
									</label>
									<input
										type='tel'
										value={editForm.phone}
										onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
										className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
										required
									/>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										Adres (Ulica i nr) *
									</label>
									<input
										type='text'
										value={editForm.address}
										onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))}
										className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
										required
									/>
								</div>
							</div>

							<div className='space-y-1.5'>
								<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
									Facebook Fanpage URL *
								</label>
								<input
									type='url'
									value={editForm.facebookUrl}
									onChange={e => setEditForm(prev => ({ ...prev, facebookUrl: e.target.value }))}
									className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
									required
								/>
							</div>

							<div className='space-y-1.5'>
								<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
									Krótki opis o lokalu
								</label>
								<textarea
									rows={3}
									value={editForm.description}
									onChange={e => setEditForm(prev => ({ ...prev, description: e.target.value }))}
									className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs leading-relaxed font-sans'
								/>
							</div>

							{/* SEKCJA OFERTY STAŁEJ */}
							<div className='pt-4 border-t border-stone-100 space-y-3'>
								<h4 className='text-xs font-bold font-mono text-stone-800 uppercase flex items-center gap-1.5'>
									<BookOpen className='w-4 h-4' />
									Zarządzanie Ofertą Stałą (Stała propozycja lokalu)
								</h4>
								<p className='text-[10px] text-stone-400 font-sans italic leading-relaxed'>
									Ta oferta będzie wyświetlana klientom jako danie dnia w przypadku, gdy robot nie pobierze nowego posta z Facebooka na dany dzień.
								</p>

								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										Tytuł Oferty Stałej
									</label>
									<input
										type='text'
										value={editForm.staticOfferTitle}
										onChange={e => setEditForm(prev => ({ ...prev, staticOfferTitle: e.target.value }))}
										placeholder='np. Lunch Szefa Kuchni (Kotlet + Krem)'
										className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-sans text-xs'
									/>
								</div>

								<div className='grid grid-cols-1 md:grid-cols-3 gap-3 items-end'>
									<div className='md:col-span-2 space-y-1.5'>
										<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
											Opis Oferty Stałej
										</label>
										<input
											type='text'
											value={editForm.staticOfferDesc}
											onChange={e => setEditForm(prev => ({ ...prev, staticOfferDesc: e.target.value }))}
											placeholder='Aromatyczne grillowane piersi w sosie śmietankowo-kurkowym...'
											className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black text-xs font-sans'
										/>
									</div>
									<div className='space-y-1.5'>
										<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
											Cena Oferty Stałej (PLN)
										</label>
										<input
											type='number'
											step='0.01'
											value={editForm.staticOfferPrice}
											onChange={e => setEditForm(prev => ({ ...prev, staticOfferPrice: e.target.value }))}
											placeholder='39.90'
											className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs'
										/>
									</div>
								</div>
							</div>

							<div className='flex gap-2 pt-4 border-t border-stone-100 font-mono text-[10px] uppercase tracking-wider font-bold'>
								<button
									type='submit'
									disabled={saving}
									className='px-5 py-2.5 bg-black hover:bg-stone-900 text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-sm flex-grow'>
									<Check className='w-4 h-4' /> Zapisz i zaktualizuj
								</button>
								<button
									type='button'
									onClick={() => setIsEditing(false)}
									className='px-4 py-2.5 border border-stone-200 hover:border-black text-stone-700 transition-all cursor-pointer'>
									Anuluj
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</main>
	)
}
