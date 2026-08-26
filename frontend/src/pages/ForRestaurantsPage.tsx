import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import {
	Plus,
	CheckCircle,
	BarChart2,
	RefreshCw,
	Mail,
	HelpCircle,
	Check,
	X,
	Eye,
	EyeOff,
	Trash2,
	MapPin,
	Phone,
	Star,
	Store,
} from 'lucide-react'
import type { Payment, Restaurant, RestaurantForm } from '../types'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const INITIAL_FORM_STATE: RestaurantForm = {
	name: '',
	slug: '',
	phone: '',
	address: '',
	city: '',
	facebookUrl: '',
	rating: 5,
}

// --- UTILS ---
const generateSlug = (value: string) => {
	return value
		.toLowerCase()
		.trim()
		.normalize('NFD') // Oddziela znaki diakrytyczne
		.replace(/[\u0300-\u036f]/g, '') // Usuwa diakrytyki
		.replace(/[^a-z0-9]+/g, '-') // Zamienia spacje na myślniki
		.replace(/^-+|-+$/g, '') // Usuwa myślniki z krańców
}

export default function ForRestaurantsPage() {
	const { user, token } = useAuth()
	const isOwnerOrAdmin = user?.role === 'OWNER' || user?.role === 'ADMIN'
	const isAdmin = user?.role === 'ADMIN'

	const [activeTab, setActiveTab] = useState('stats') // 'stats', 'new', 'payments', 'admin-pending', 'admin-approved'

	const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([])
	const [restaurants, setRestaurants] = useState<Restaurant[]>([]) // For admin moderation panel
	const [form, setForm] = useState<RestaurantForm>(INITIAL_FORM_STATE)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	const [payments, setPayments] = useState<Payment[]>([])

	// Capture query parameters for payment results or mock checkout redirection
	const queryParams = new URLSearchParams(window.location.search)
	const successParam = queryParams.get('success')
	const cancelParam = queryParams.get('cancel')
	const mockCheckoutParam = queryParams.get('mock_checkout')
	const mockRestaurantId = queryParams.get('restaurantId')
	const mockPlanId = queryParams.get('planId')
	const mockAmount = queryParams.get('amount')

	const [isMockCheckout, setIsMockCheckout] = useState(!!mockCheckoutParam)
	const [mockProcessing, setMockProcessing] = useState(false)

	useEffect(() => {
		if (isAdmin) {
			setActiveTab('admin-pending')
		} else {
			setActiveTab('stats')
		}
	}, [isAdmin])

	useEffect(() => {
		if (successParam) {
			setSuccess('Płatność i aktywacja subskrypcji zakończona pełnym sukcesem! Twój lokal jest teraz aktywowany.')
			// Clean URL params
			window.history.replaceState({}, document.title, window.location.pathname)
		}
		if (cancelParam) {
			setError('Płatność została anulowana. Możesz spróbować ponownie w każdej chwili.')
			window.history.replaceState({}, document.title, window.location.pathname)
		}
	}, [successParam, cancelParam])

	const handleConfirmMockPayment = async () => {
		if (!mockRestaurantId || !mockPlanId || !token) return
		try {
			setMockProcessing(true)
			const res = await fetch(`${API_URL}/payments/confirm-mock`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					restaurantId: mockRestaurantId,
					planId: mockPlanId,
					amount: mockAmount,
				}),
			})

			if (!res.ok) throw new Error()
			window.location.href = '/for-restaurants?success=true'
		} catch (err) {
			setError('Błąd symulacji płatności deweloperskiej.')
			setMockProcessing(false)
		}
	}

	const handleCheckout = async (restaurantId: string, planId: string) => {
		try {
			setError('')
			setSuccess('')
			const res = await fetch(`${API_URL}/payments/subscribe`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({ restaurantId, planId }),
			})

			const data = await res.json()
			if (!res.ok) throw new Error(data.message || 'Błąd inicjowania płatności.')

			if (data.url) {
				window.location.href = data.url
			}
		} catch (err: any) {
			setError(err.message || 'Nie udało się połączyć z bramką Stripe.')
		}
	}

	useEffect(() => {
		if (activeTab === 'payments' && ownedRestaurants.length > 0) {
			loadPaymentHistory(ownedRestaurants[0].id)
		}
	}, [activeTab, ownedRestaurants])

	const loadPaymentHistory = async (restaurantId: string) => {
		try {
			const res = await fetch(`${API_URL}/payments/history/${restaurantId}`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) throw new Error()
			const data = await res.json()
			setPayments(data)
		} catch (err) {
			setError('Nie udało się pobrać historii płatności.')
		}
	}

	// Steps for the Guide Carousel
	const [activeStep, setActiveStep] = useState(0)
	const steps = [
		{
			title: '1. Załóż konto i zgłoś lokal',
			desc: 'Zarejestruj się w naszym systemie jako Właściciel, uzupełnij dane (miasto, ulica, telefon) oraz wklej bezpośredni adres URL do oficjalnego fanpage Twojej restauracji na Facebooku.',
		},
		{
			title: '2. Dodaj post przed 11:00',
			desc: 'Nasz automatyczny robot (scraper) skanuje posty z Facebooka codziennie punktualnie o godzinie 12:00. Aby zagwarantować, że Twoje danie dnia zostanie pobrane i zaprezentowane klientom w porze obradowej, zalecamy publikowanie posta już przed godziną 11:00.',
		},
		{
			title: '3. Formatuj post („Danie dnia!”)',
			desc: 'Nasz robot rozpoznaje dzisiejsze menu po haśle startowym. Twój post na Facebooku musi zaczynać się dokładnie od tekstu „Danie dnia!” – bez żadnych emotek, dodatkowych spacji na początku czy innych znaków. Przykład: „Danie dnia! Dziś serwujemy pyszną...”',
		},
		{
			title: '4. Elastyczna subskrypcja',
			desc: 'Każdy nowo zgłoszony lokal otrzymuje u nas 7 dni bezpłatnego okresu próbnego. Po jego zakończeniu (oraz zakończeniu promocji), koszt utrzymania dedykowanego bota wynosi jedynie 99 zł miesięcznie – bez żadnych ukrytych prowizji.',
		},
	]

	useEffect(() => {
		if (token && isOwnerOrAdmin) {
			if (isAdmin) {
				loadAdminRestaurants()
			} else {
				loadOwnedRestaurants()
			}
		} else {
			setLoading(false)
		}
	}, [token, isOwnerOrAdmin, isAdmin])

	const loadAdminRestaurants = async () => {
		try {
			setLoading(true)
			setError('')
			const response = await fetch(`${API_URL}/restaurants/admin/all`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})
			if (!response.ok) throw new Error('Błąd połączenia z API')
			const data = await response.json()
			setRestaurants(data)
		} catch (err) {
			console.error(err)
			setError('Nie udało się pobrać restauracji dla panelu moderacyjnego.')
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
			setSuccess(
				`Status restauracji został pomyślnie zmieniony na: ${status === 'APPROVED' ? 'Zatwierdzona' : 'Odrzucona'}`,
			)
			loadAdminRestaurants()
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
			setSuccess(
				`Scrapowanie dla restauracji „${updated.name}” zostało ${updated.isActive ? 'wznowione' : 'wstrzymane'}.`,
			)
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
			setSuccess('Restauracja została pomyślnie usunięta z bazy danych.')
		} catch (err) {
			console.error(err)
			setError('Wystąpił błąd podczas usuwania restauracji.')
		}
	}

	const loadOwnedRestaurants = async () => {
		try {
			setLoading(true)
			const res = await fetch(`${API_URL}/restaurants/owner`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (!res.ok) throw new Error()
			const data = await res.json()
			setOwnedRestaurants(data)
		} catch (err) {
			if (user?.role === 'ADMIN') {
				setError('JESTEŚ ADMINEM NIE POWINIENEŚ POSIADAĆ RESTAURACJI')
			} else {
				setError('Nie udało się pobrać statystyk Twoich restauracji.')
			}
		} finally {
			setLoading(false)
		}
	}

	const updateField = (field: keyof RestaurantForm, value: string | number) => {
		setForm(prev => ({ ...prev, [field]: value }))
	}

	const handleNameChange = (value: string) => {
		setForm(prev => ({
			...prev,
			name: value,
			slug: generateSlug(value),
		}))
	}

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (!token) return

		try {
			setSaving(true)
			setError('')
			setSuccess('')

			const response = await fetch(`${API_URL}/restaurants`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify(form),
			})

			const data = await response.json()
			if (!response.ok) throw new Error(data.message || 'Nie udało się dodać restauracji.')

			setSuccess(
				`Kandydatura restauracji „${data.name}” została zgłoszona! Oczekuje na zatwierdzenie przez developera.`,
			)
			setForm(INITIAL_FORM_STATE)
			loadOwnedRestaurants()
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas dodawania.')
		} finally {
			setSaving(false)
		}
	}
	// Calculate remaining trial days
	const getDaysLeft = (endsAtStr: string | null) => {
		if (!endsAtStr) return 0
		const diff = new Date(endsAtStr).getTime() - Date.now()
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
		return days > 0 ? days : 0
	}

	const renderAdminRestaurantCard = (restaurant: Restaurant) => {
		const isPromoted =
			restaurant.isPromoted ||
			(restaurant.subscription?.status === 'ACTIVE' && restaurant.subscription?.type === 'PROMOTION')

		return (
			<article
				key={restaurant.id}
				className={`relative overflow-hidden p-6 border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all ${
					!restaurant.isActive ? 'opacity-65 border-stone-200' : 'border-stone-200 hover:border-black hover:shadow-sm'
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

					{restaurant.status === 'PENDING' ? (
						<>
							<button
								onClick={() => handleStatusApproval(restaurant.id, 'APPROVED')}
								className='px-3 py-2 bg-green-700 text-white hover:bg-green-800 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-bold'>
								<Check className='w-3.5 h-3.5' /> Zatwierdź
							</button>
							<button
								onClick={() => handleStatusApproval(restaurant.id, 'REJECTED')}
								className='px-3 py-2 border border-red-200 text-red-500 hover:border-red-600 hover:bg-red-50 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-bold'>
								<X className='w-3.5 h-3.5' /> Odrzuć
							</button>
						</>
					) : (
						<>
							<button
								onClick={() => toggleRestaurantStatus(restaurant)}
								className='p-2 border border-stone-200 hover:border-black hover:bg-stone-50 text-stone-700 hover:text-black transition-colors flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider cursor-pointer'
								title={restaurant.isActive ? 'Wstrzymaj' : 'Aktywuj'}>
								{restaurant.isActive ? <EyeOff className='w-3.5 h-3.5' /> : <Eye className='w-3.5 h-3.5' />}
								{restaurant.isActive ? 'Pauzuj' : 'Wznów'}
							</button>
							<button
								onClick={() => deleteRestaurant(restaurant.id)}
								className='p-2 border border-stone-200 hover:border-red-600 hover:bg-red-50 text-stone-500 hover:text-red-600 transition-colors flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider cursor-pointer'>
								<Trash2 className='w-3.5 h-3.5' /> Usuń
							</button>
						</>
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
	}

	const renderGuideCarousel = () => {
		return (
			<div className='bg-stone-50 border border-stone-200 p-6 md:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[350px] shadow-sm text-left'>
				{/* Step Indicator bar at the top */}
				<div className='absolute top-0 left-0 right-0 h-1 bg-stone-200'>
					<div
						className='bg-black h-full transition-all duration-300'
						style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}></div>
				</div>

				<div className='space-y-4'>
					<div className='flex justify-between items-center'>
						<span className='font-mono text-[10px] tracking-widest uppercase bg-black text-white px-2.5 py-1 font-bold'>
							Krok {activeStep + 1} z {steps.length}
						</span>
						<span className='font-mono text-[11px] font-bold text-stone-400 flex items-center gap-1'>
							<HelpCircle className='w-3.5 h-3.5' /> Instrukcja krok po kroku
						</span>
					</div>

					<div className='space-y-3 min-h-[160px] flex flex-col justify-center'>
						<h3 className='text-lg md:text-xl font-bold font-serif text-stone-900'>{steps[activeStep].title}</h3>
						<p className='text-stone-600 text-xs md:text-sm leading-relaxed font-sans whitespace-pre-line'>
							{steps[activeStep].desc}
						</p>
					</div>
				</div>

				{/* Carousel Controls */}
				<div className='flex items-center justify-between pt-4 border-t border-stone-200'>
					<div className='flex gap-1.5'>
						{steps.map((_, i) => (
							<button
								key={i}
								onClick={() => setActiveStep(i)}
								className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
									i === activeStep ? 'bg-black w-5' : 'bg-stone-200 hover:bg-stone-400'
								}`}
								aria-label={`Przejdź do kroku ${i + 1}`}
							/>
						))}
					</div>

					<div className='flex gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
						<button
							disabled={activeStep === 0}
							onClick={() => setActiveStep(p => Math.max(p - 1, 0))}
							className='px-3 py-1.5 border border-stone-200 hover:border-black bg-white text-stone-800 transition-all disabled:opacity-35 disabled:hover:border-stone-200 cursor-pointer'>
							Wstecz
						</button>
						<button
							disabled={activeStep === steps.length - 1}
							onClick={() => setActiveStep(p => Math.min(p + 1, steps.length - 1))}
							className='px-3 py-1.5 bg-black text-white hover:bg-stone-900 transition-all disabled:opacity-35 disabled:hover:bg-black cursor-pointer'>
							Dalej
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<main className='max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-12'>
			{/* Header */}
			<section className='border-b border-stone-200 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6'>
				<div className='max-w-2xl text-left'>
					<span className='text-xs font-mono uppercase tracking-widest text-stone-400'>
						{isAdmin ? 'Panel Administratora' : isOwnerOrAdmin ? 'Panel Właściciela' : 'Dedykowany Panel'}
					</span>
					<h1 className='text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1'>
						{isAdmin ? 'Panel Moderacji i Zarządzania' : isOwnerOrAdmin ? 'Twój Panel Biznesowy' : 'Dla Restauracji'}
					</h1>
					<p className='text-stone-500 text-sm md:text-base mt-2'>
						{isAdmin
							? 'Zatwierdzaj zgłoszenia od restauratorów, zarządzaj aktywnością lokali oraz kontroluj statusy.'
							: isOwnerOrAdmin
								? 'Zarządzaj swoimi lokalami, śledź wyświetlenia i kontroluj status subskrypcji.'
								: 'Dołącz do platformy Daily Dish i dotrzyj do setek głodnych klientów w Twojej okolicy – całkowicie za darmo.'}
					</p>
				</div>
			</section>

			{success && (
				<div className='p-4 bg-green-50 border-l-4 border-green-600 text-xs font-mono text-green-800 flex items-start gap-2 max-w-4xl mx-auto text-left'>
					<CheckCircle className='w-4 h-4 text-green-700 shrink-0 mt-0.5' />
					<span>{success}</span>
				</div>
			)}
			{error && (
				<div className='p-4 bg-red-50 border-l-4 border-red-500 text-xs font-mono text-red-500 max-w-4xl mx-auto text-left'>
					{error}
				</div>
			)}

			{isOwnerOrAdmin ? (
				<>
					{isMockCheckout ? (
						/* --- STRIPE MOCK CHECKOUT SIMULATOR --- */
						<section className='max-w-md mx-auto bg-white border border-stone-200 p-6 md:p-8 space-y-6 shadow-md text-left'>
							<div className='border-b border-stone-100 pb-4'>
								<span className='text-[10px] font-mono uppercase tracking-widest text-stone-400 font-bold'>
									Stripe Sandbox Checkout
								</span>
								<h2 className='text-xl font-bold font-serif text-stone-900 mt-1'>Symulator Płatności Stripe</h2>
								<p className='text-stone-500 text-xs mt-1'>
									Bezpieczna płatność testowa za subskrypcję w środowisku deweloperskim.
								</p>
							</div>

							<div className='border p-4 bg-stone-50 rounded-sm space-y-2'>
								<p className='text-xs font-mono text-stone-600'>
									Abonament:{' '}
									<strong className='text-stone-900'>
										{mockPlanId === 'PREMIUM_100'
											? 'Abonament za lokal'
											: mockPlanId === 'PROMOTION'
												? 'Promowanie na górze'
												: 'stałe menu'}
									</strong>
								</p>
								<p className='text-xs font-mono text-stone-600'>
									Kwota do zapłaty: <strong className='text-stone-900 text-base'>{mockAmount}.00 PLN</strong>{' '}
									<span className='text-[10px] text-stone-400'>/ co miesiąc</span>
								</p>
							</div>

							{/* Fake Credit Card Form */}
							<div className='space-y-4 font-mono text-xs'>
								<div className='space-y-1'>
									<label className='text-[10px] text-stone-500 uppercase font-bold'>Numer karty testowej</label>
									<input
										type='text'
										value='4242 •••• •••• 4242'
										className='w-full px-4 py-2 border border-stone-200 bg-stone-50 outline-none text-stone-700'
										readOnly
									/>
								</div>
								<div className='grid grid-cols-2 gap-4'>
									<div className='space-y-1'>
										<label className='text-[10px] text-stone-500 uppercase font-bold'>Ważność (MM/RR)</label>
										<input
											type='text'
											value='12 / 29'
											className='w-full px-4 py-2 border border-stone-200 bg-stone-50 outline-none text-stone-700'
											readOnly
										/>
									</div>
									<div className='space-y-1'>
										<label className='text-[10px] text-stone-500 uppercase font-bold'>CVC</label>
										<input
											type='password'
											value='•••'
											className='w-full px-4 py-2 border border-stone-200 bg-stone-50 outline-none text-stone-700'
											readOnly
										/>
									</div>
								</div>
							</div>

							<div className='space-y-2 pt-2'>
								<button
									onClick={handleConfirmMockPayment}
									disabled={mockProcessing}
									className='w-full bg-green-700 hover:bg-green-800 text-white font-mono text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-bold'>
									{mockProcessing ? 'Przetwarzanie transakcji...' : 'Autoryzuj i Zapłać'}
								</button>
								<button
									onClick={() => {
										setIsMockCheckout(false)
										window.history.replaceState({}, document.title, window.location.pathname)
									}}
									className='w-full border border-stone-200 hover:border-black text-stone-700 font-mono text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 cursor-pointer'>
									Anuluj
								</button>
							</div>
						</section>
					) : (
						<>
							<div className='border-b border-stone-200 mb-8'>
								<nav className='-mb-px flex space-x-6' aria-label='Tabs'>
									{isAdmin ? (
										<>
											<button
												onClick={() => setActiveTab('admin-pending')}
												className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-pending' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
												Kandydatury ({restaurants.filter(r => r.status === 'PENDING').length})
											</button>
											<button
												onClick={() => setActiveTab('admin-approved')}
												className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-approved' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
												Zatwierdzone ({restaurants.filter(r => r.status === 'APPROVED').length})
											</button>
										</>
									) : (
										<>
											<button
												onClick={() => setActiveTab('stats')}
												className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'stats' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
												Lokale i statystyki
											</button>
											<button
												onClick={() => setActiveTab('new')}
												className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'new' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
												Zgłoś nową restaurację
											</button>
											<button
												onClick={() => setActiveTab('subscriptions')}
												className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'subscriptions' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
												Subskrypcje
											</button>
											<button
												onClick={() => setActiveTab('payments')}
												className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'payments' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
												Historia płatności
											</button>
										</>
									)}
								</nav>
							</div>

							{isAdmin && activeTab === 'admin-pending' && (
								<section className='space-y-6'>
									<div className='flex justify-between items-center'>
										<h2 className='text-xl font-bold font-serif text-stone-900 text-left'>
											Kandydatury oczekujące na akceptację ({restaurants.filter(r => r.status === 'PENDING').length})
										</h2>
										<button
											onClick={loadAdminRestaurants}
											disabled={loading}
											className='px-3 py-1.5 border border-stone-200 hover:border-black font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer bg-white text-stone-900 shadow-sm'>
											<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
											Odśwież
										</button>
									</div>

									{loading ? (
										<div className='py-24 text-center border border-dashed border-stone-200'>
											<RefreshCw className='w-8 h-8 text-stone-300 animate-spin mx-auto mb-4' />
											<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>
												Ładowanie kandydatur...
											</p>
										</div>
									) : restaurants.filter(r => r.status === 'PENDING').length === 0 ? (
										<div className='py-24 text-center border border-dashed border-stone-200'>
											<Store className='w-12 h-12 text-stone-300 mx-auto mb-4' />
											<h3 className='text-lg font-bold font-serif text-stone-900'>Brak oczekujących zgłoszeń</h3>
											<p className='text-stone-500 text-sm mt-1 max-w-sm mx-auto'>
												Wszystkie zgłoszone lokale zostały już zweryfikowane i obsłużone.
											</p>
										</div>
									) : (
										<div className='grid grid-cols-1 gap-4'>
											{restaurants
												.filter(r => r.status === 'PENDING')
												.map(restaurant => renderAdminRestaurantCard(restaurant))}
										</div>
									)}
								</section>
							)}

							{isAdmin && activeTab === 'admin-approved' && (
								<section className='space-y-6'>
									<div className='flex justify-between items-center'>
										<h2 className='text-xl font-bold font-serif text-stone-900 text-left'>
											Zatwierdzone restauracje ({restaurants.filter(r => r.status === 'APPROVED').length})
										</h2>
										<button
											onClick={loadAdminRestaurants}
											disabled={loading}
											className='px-3 py-1.5 border border-stone-200 hover:border-black font-mono text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer bg-white text-stone-900 shadow-sm'>
											<RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
											Odśwież
										</button>
									</div>

									{loading ? (
										<div className='py-24 text-center border border-dashed border-stone-200'>
											<RefreshCw className='w-8 h-8 text-stone-300 animate-spin mx-auto mb-4' />
											<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>
												Ładowanie restauracji...
											</p>
										</div>
									) : restaurants.filter(r => r.status === 'APPROVED').length === 0 ? (
										<div className='py-24 text-center border border-dashed border-stone-200'>
											<Store className='w-12 h-12 text-stone-300 mx-auto mb-4' />
											<h3 className='text-lg font-bold font-serif text-stone-900'>Brak zatwierdzonych restauracji</h3>
											<p className='text-stone-500 text-sm mt-1 max-w-sm mx-auto'>
												Baza danych nie posiada jeszcze żadnych zatwierdzonych lokali.
											</p>
										</div>
									) : (
										<div className='grid grid-cols-1 gap-4'>
											{restaurants
												.filter(r => r.status === 'APPROVED')
												.map(restaurant => renderAdminRestaurantCard(restaurant))}
										</div>
									)}
								</section>
							)}

							{!isAdmin && activeTab === 'stats' && (
								<section className='space-y-6'>
									<h2 className='text-xl font-bold font-serif text-stone-900 text-left'>
										Twoje lokale ({ownedRestaurants.length})
									</h2>
									{loading ? (
										<div className='py-12 text-center border border-dashed border-stone-200'>
											<RefreshCw className='w-6 h-6 text-stone-300 animate-spin mx-auto mb-2' />
											<p className='font-mono text-xs text-stone-400 uppercase'>Ładowanie danych...</p>
										</div>
									) : ownedRestaurants.length === 0 ? (
										<div className='py-12 text-center border border-dashed border-stone-200 bg-stone-50 p-6'>
											<p className='text-stone-500 text-sm'>
												Nie masz jeszcze przypisanych lokali. Dodaj swój pierwszy lokal w zakładce obok!
											</p>
										</div>
									) : (
										<div className='space-y-4'>
											{ownedRestaurants.map(rest => {
												const activeSubs =
													rest.subscriptions?.filter(
														sub => sub.status === 'ACTIVE' && new Date(sub.endsAt) > new Date(),
													) || []

												const hasBase = activeSubs.some(s => s.type === 'BASE')
												const hasPromotion = activeSubs.some(s => s.type === 'PROMOTION')
												const hasStaticMenu = activeSubs.some(s => s.type === 'STATIC_MENU')
												const hasTrial = activeSubs.some(s => s.type === 'FREE_TRIAL')

												let planLabel = 'Brak'
												if (hasTrial) {
													planLabel = 'Free Trial'
												} else {
													const activePlanNames = []
													if (hasBase) activePlanNames.push('Podstawowy')
													if (hasPromotion) activePlanNames.push('Promowanie')
													if (hasStaticMenu) activePlanNames.push('Karta Menu')

													if (activePlanNames.length === 3) {
														planLabel = 'Wszystkie aktywne'
													} else if (activePlanNames.length > 0) {
														planLabel = activePlanNames.join(' + ')
													}
												}

												const hasActiveSub = activeSubs.length > 0
												const daysLeft = getDaysLeft(rest.subscription?.currentPeriodEnd || null)

												return (
													<div
														key={rest.id}
														className='border border-stone-200 p-6 bg-white space-y-4 text-left shadow-sm'>
														<div className='flex justify-between items-start gap-4'>
															<div>
																<Link to={`/restaurants/${rest.slug}`}>
																	<h3 className='text-lg font-bold font-serif text-stone-900 hover:underline'>
																		{rest.name}
																	</h3>
																</Link>
																<span className='font-mono text-[9px] tracking-wider text-stone-400 uppercase'>
																	{rest.city} • ID: {rest.slug}
																</span>
															</div>
															<span
																className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider ${rest.status === 'APPROVED' ? 'bg-stone-100 text-stone-900' : rest.status === 'REJECTED' ? 'bg-stone-50 text-stone-400 border border-stone-200' : 'bg-black text-white'}`}>
																{rest.status === 'APPROVED'
																	? 'Zatwierdzona'
																	: rest.status === 'REJECTED'
																		? 'Odrzucona'
																		: 'Oczekuje na akceptację'}
															</span>
														</div>

														<div className='grid grid-cols-3 gap-4 pt-2 border-t border-stone-100'>
															<div className='bg-stone-50 p-3'>
																<span className='text-[9px] font-mono text-stone-400 uppercase block'>
																	Wyświetlenia
																</span>
																<span className='text-xl font-bold font-mono text-stone-900 flex items-center gap-1 mt-1'>
																	<BarChart2 className='w-4 h-4 text-stone-600' />
																	{rest.views}
																</span>
															</div>
															<div className='bg-stone-50 p-3'>
																<span className='text-[9px] font-mono text-stone-400 uppercase block'>Subskrypcja</span>
																<span className='text-xs font-bold font-mono text-stone-900 block mt-1'>
																	{planLabel}
																</span>
															</div>
															<div className='bg-stone-50 p-3'>
																<span className='text-[9px] font-mono text-stone-400 uppercase block'>Wygasa za</span>
																<div className='flex gap-4'>
																	<span className='text-xs font-bold font-mono text-stone-900 block mt-1'>
																		{hasActiveSub ? `${daysLeft} dni` : 'Wygasła / Brak'}
																	</span>
																	{hasTrial && hasActiveSub && (
																		<button
																			onClick={e => {
																				e.preventDefault()
																				e.stopPropagation()
																				setActiveTab('subscriptions')
																			}}
																			className='mt-2 text-[10px] font-mono uppercase tracking-wider font-bold text-orange-600 hover:underline cursor-pointer'>
																			Przejdź na Premium →
																		</button>
																	)}
																</div>
															</div>
														</div>

														{/* Show checkout options based on subscription status and plan */}
														{rest.status === 'APPROVED' && (
															<div
																className='pt-2 border-t border-stone-100 space-y-3'
																onClick={e => {
																	e.preventDefault()
																	e.stopPropagation()
																}}>
																{!hasActiveSub ? (
																	<>
																		<p className='text-xs font-mono text-stone-500 uppercase tracking-wider font-bold'>
																			Wybierz plan abonamentowy dla tego lokalu:
																		</p>
																		<div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
																			<button
																				onClick={() => handleCheckout(rest.id, 'PREMIUM_100')}
																				className='px-3 py-2 border border-black hover:bg-black hover:text-white transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																				Abonament za lokal (100 PLN)
																			</button>
																			<button
																				disabled={true}
																				onClick={() => handleCheckout(rest.id, 'PROMOTION')}
																				className='px-3 py-2 border border-stone-400 hover:border-black transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center disabled:opacity-50 disabled:cursor-not-allowed'>
																				Promowanie na górze (50 PLN)
																			</button>
																			<button
																				disabled={true}
																				onClick={() => handleCheckout(rest.id, 'STATIC_MENU')}
																				className='px-3 py-2 bg-black text-white hover:bg-stone-900 transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center disabled:opacity-50 disabled:cursor-not-allowed'>
																				Stałe menu bez FB (50 PLN)
																			</button>
																		</div>
																	</>
																) : (
																	<>
																		{rest.subscription?.type === 'FREE_TRIAL' && (
																			<>
																				<p className='text-xs font-mono text-stone-500 uppercase tracking-wider font-bold'>
																					Przejdź z okresu próbnego na pakiet abonamentowy:
																				</p>
																				<div className='grid grid-cols-1 sm:grid-cols-3 gap-3'>
																					<button
																						onClick={() => handleCheckout(rest.id, 'PREMIUM_100')}
																						className='px-3 py-2 border border-black hover:bg-black hover:text-white transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																						Abonament za lokal (100 PLN)
																					</button>
																					<button
																						disabled={true}
																						onClick={() => handleCheckout(rest.id, 'PROMOTION')}
																						className='px-3 py-2 border border-stone-400 hover:border-black transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center disabled:opacity-50 disabled:cursor-not-allowed'>
																						Promowanie na górze (50 PLN)
																					</button>
																					<button
																						disabled={true}
																						onClick={() => handleCheckout(rest.id, 'STATIC_MENU')}
																						className='px-3 py-2 bg-black text-white hover:bg-stone-900 transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center disabled:opacity-50 disabled:cursor-not-allowed'>
																						Stałe menu bez FB (50 PLN)
																					</button>
																				</div>
																			</>
																		)}

																		{rest.subscription?.type === 'PREMIUM_100' && (
																			<>
																				<p className='text-xs font-mono text-stone-500 uppercase tracking-wider font-bold'>
																					Dokup pakiety dodatkowe dla tego lokalu:
																				</p>
																				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
																					<button
																						onClick={() => handleCheckout(rest.id, 'PROMOTION')}
																						className='px-3 py-2 border border-stone-400 hover:border-black transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																						Promowanie na górze (+50 PLN)
																					</button>
																					<button
																						onClick={() => handleCheckout(rest.id, 'STATIC_MENU')}
																						className='px-3 py-2 bg-black text-white hover:bg-stone-900 transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																						Stałe menu bez FB (+50 PLN)
																					</button>
																				</div>
																			</>
																		)}

																		{rest.subscription?.type === 'PROMOTION' && (
																			<>
																				<p className='text-xs font-mono text-stone-500 uppercase tracking-wider font-bold'>
																					Dokup pakiety dodatkowe dla tego lokalu:
																				</p>
																				<div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
																					<div className='px-3 py-2 border border-dashed border-stone-200 bg-stone-50 text-[10px] font-mono uppercase tracking-wider text-stone-400 text-center flex items-center justify-center font-bold'>
																						✓ Promowanie na górze (Aktywne)
																					</div>
																					<button
																						onClick={() => handleCheckout(rest.id, 'STATIC_MENU')}
																						className='px-3 py-2 bg-black text-white hover:bg-stone-900 transition-all text-[10px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																						Stałe menu bez FB (+50 PLN)
																					</button>
																				</div>
																			</>
																		)}

																		{rest.subscription?.type === 'STATIC_MENU' && (
																			<p className='text-xs font-mono text-green-700 uppercase tracking-wider font-bold flex items-center gap-1.5'>
																				<span>✓ Wszystkie pakiety dodatkowe są aktywne dla tego lokalu</span>
																			</p>
																		)}
																	</>
																)}
															</div>
														)}
													</div>
												)
											})}
										</div>
									)}
								</section>
							)}

							{!isAdmin && activeTab === 'new' && (
								<section>
									<div className='bg-white border border-stone-200 p-6 md:p-8 space-y-6 text-left'>
										<div className='border-b border-stone-100 pb-4'>
											<h2 className='text-xl font-bold font-serif text-stone-900'>Zgłoś nową restaurację</h2>
											<p className='text-stone-500 text-xs mt-1'>
												Zgłoś nowy lokal, który ma zostać poddany procesowi moderacji dewelopera.
											</p>
										</div>
										<form onSubmit={handleSubmit} className='space-y-4'>
											<div className='space-y-1'>
												<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
													Nazwa restauracji *
												</label>
												<input
													type='text'
													value={form.name}
													onChange={e => handleNameChange(e.target.value)}
													placeholder='np. Restauracja u Mariana'
													className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
													required
												/>
											</div>
											<div className='grid grid-cols-2 gap-4'>
												<div className='space-y-1'>
													<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
														Miasto *
													</label>
													<input
														type='text'
														value={form.city}
														onChange={e => updateField('city', e.target.value)}
														placeholder='np. Gdańsk'
														className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
														required
													/>
												</div>
												<div className='space-y-1'>
													<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
														Identyfikator Slug *
													</label>
													<input
														type='text'
														value={form.slug}
														className='w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm text-stone-500 font-mono focus:outline-none'
														readOnly
														required
													/>
												</div>
											</div>
											<div className='space-y-1'>
												<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
													Telefon kontaktowy *
												</label>
												<input
													type='tel'
													value={form.phone}
													onChange={e => updateField('phone', e.target.value)}
													placeholder='np. 505 101 202'
													className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
													required
												/>
											</div>
											<div className='space-y-1'>
												<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
													Ulica i numer *
												</label>
												<input
													type='text'
													value={form.address}
													onChange={e => updateField('address', e.target.value)}
													placeholder='np. ul. Szeroka 12'
													className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
													required
												/>
											</div>
											<div className='space-y-1'>
												<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
													Adres URL Facebooka *
												</label>
												<input
													type='url'
													value={form.facebookUrl}
													onChange={e => updateField('facebookUrl', e.target.value)}
													placeholder='https://facebook.com/fanpage'
													className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono'
													required
												/>
											</div>
											<button
												type='submit'
												disabled={saving}
												className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2'>
												<Plus className='w-4 h-4' />
												{saving ? 'Zgłaszanie...' : 'Zgłoś restaurację'}
											</button>
										</form>
										{success && (
											<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800 flex items-start gap-2'>
												<CheckCircle className='w-4 h-4 text-stone-800 shrink-0 mt-0.5' />
												<span>{success}</span>
											</div>
										)}
										{error && (
											<div className='p-4 bg-stone-50 border-l-2 border-stone-300 text-xs font-mono text-stone-500'>
												{error}
											</div>
										)}
									</div>
								</section>
							)}

							{!isAdmin && activeTab === 'subscriptions' && (
								<section className='space-y-8 text-left'>
									<div>
										<h2 className='text-xl font-bold font-serif text-stone-900'>Twoje aktywne subskrypcje</h2>
										<p className='text-stone-500 text-xs mt-1'>
											Lista Twoich restauracji wraz z przypisanymi okresami ważności planów abonamentowych.
										</p>
									</div>

									{ownedRestaurants.length === 0 ? (
										<div className='py-8 text-center border border-dashed border-stone-200 bg-stone-50 p-6'>
											<p className='text-stone-500 text-xs font-mono uppercase'>
												Nie masz jeszcze żadnych zarejestrowanych restauracji.
											</p>
										</div>
									) : (
										<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
											{ownedRestaurants.map(rest => {
												const activeSubs =
													rest.subscriptions?.filter(
														sub => sub.status === 'ACTIVE' && new Date(sub.endsAt) > new Date(),
													) || []

												const hasBase = activeSubs.some(s => s.type === 'BASE')
												const hasPromotion = activeSubs.some(s => s.type === 'PROMOTION')
												const hasStaticMenu = activeSubs.some(s => s.type === 'STATIC_MENU')
												const hasTrial = activeSubs.some(s => s.type === 'FREE_TRIAL')

												let planName = 'Brak Subskrypcji'
												if (hasTrial) {
													planName = 'Darmowy Okres Próbny'
												} else {
													const activePlanNames = []
													if (hasBase) activePlanNames.push('Abonament za lokal (100 zł)')
													if (hasPromotion) activePlanNames.push('Promowanie (50 zł)')
													if (hasStaticMenu) activePlanNames.push('Karta Menu (50 zł)')

													if (activePlanNames.length === 3) {
														planName = 'Wszystkie pakiety aktywne'
													} else if (activePlanNames.length > 0) {
														planName = activePlanNames.join(' + ')
													}
												}

												const expDate = rest.subscription?.currentPeriodEnd
													? new Date(rest.subscription.currentPeriodEnd).toLocaleDateString('pl-PL')
													: 'Nieokreślono'

												const hasActiveSub = activeSubs.length > 0

												return (
													<div key={rest.id} className='border border-stone-200 p-5 bg-white space-y-3 shadow-sm'>
														<div className='flex justify-between items-start'>
															<div>
																<h4 className='font-serif font-bold text-stone-900'>{rest.name}</h4>
																<span className='text-[10px] font-mono uppercase tracking-wider text-stone-400'>
																	{rest.city}
																</span>
															</div>
															<span
																className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold tracking-wider ${hasActiveSub ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
																{hasActiveSub ? 'Aktywna' : 'Nieaktywna'}
															</span>
														</div>
														<div className='border-t border-stone-100 pt-3 space-y-1 font-mono text-xs'>
															<p className='text-stone-500'>
																Abonament: <strong className='text-stone-900'>{planName}</strong>
															</p>
															<p className='text-stone-500'>
																Ważność do: <strong className='text-stone-900'>{expDate}</strong>
															</p>
														</div>
														<div className='pt-2'>
															<span className='text-[10px] text-stone-400 font-sans italic'>
																{hasTrial
																	? '✓ Dzienny FB bot scraper, podstawowe statystyki.'
																	: '✓ Wszystkie wybrane funkcje tego planu są aktywne.'}
															</span>
														</div>

														{/* Quick checkout / addon buttons inside subscription card */}
														{rest.status === 'APPROVED' && (
															<div
																className='pt-2 border-t border-stone-100 space-y-2'
																onClick={e => {
																	e.preventDefault()
																	e.stopPropagation()
																}}>
																{!hasActiveSub ? (
																	<>
																		<p className='text-[10px] font-mono text-stone-500 uppercase tracking-wider font-bold'>
																			Wybierz plan abonamentowy dla tego lokalu:
																		</p>
																		<div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
																			<button
																				onClick={() => handleCheckout(rest.id, 'PREMIUM_100')}
																				className='px-2 py-1.5 border border-black hover:bg-black hover:text-white transition-all text-[9px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																				100 PLN
																			</button>
																			<button
																				disabled={true}
																				className='px-2 py-1.5 border border-stone-200 text-stone-400 bg-stone-50 text-[9px] font-mono uppercase tracking-wider cursor-not-allowed font-bold text-center'
																				title='Najpierw aktywuj abonament podstawowy.'>
																				50 PLN
																			</button>
																			<button
																				disabled={true}
																				className='px-2 py-1.5 border border-stone-200 text-stone-400 bg-stone-50 text-[9px] font-mono uppercase tracking-wider cursor-not-allowed font-bold text-center'
																				title='Najpierw aktywuj abonament podstawowy.'>
																				50 PLN
																			</button>
																		</div>
																	</>
																) : (
																	<>
																		{hasTrial && (
																			<>
																				<p className='text-[10px] font-mono text-stone-500 uppercase tracking-wider font-bold'>
																					Przejdź na pakiet abonamentowy:
																				</p>
																				<div className='grid grid-cols-1 sm:grid-cols-3 gap-2'>
																					<button
																						onClick={() => handleCheckout(rest.id, 'PREMIUM_100')}
																						className='px-2 py-1.5 border border-black hover:bg-black hover:text-white transition-all text-[9px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																						100 PLN
																					</button>
																					<button
																						disabled={true}
																						className='px-2 py-1.5 border border-stone-200 text-stone-400 bg-stone-50 text-[9px] font-mono uppercase tracking-wider cursor-not-allowed font-bold text-center'
																						title='Najpierw aktywuj abonament podstawowy.'>
																						50 PLN
																					</button>
																					<button
																						disabled={true}
																						className='px-2 py-1.5 border border-stone-200 text-stone-400 bg-stone-50 text-[9px] font-mono uppercase tracking-wider cursor-not-allowed font-bold text-center'
																						title='Najpierw aktywuj abonament podstawowy.'>
																						50 PLN
																					</button>
																				</div>
																			</>
																		)}

																		{!hasTrial && hasBase && (
																			<>
																				{hasPromotion && hasStaticMenu ? (
																					<p className='text-[10px] font-mono text-green-700 uppercase tracking-wider font-bold flex items-center gap-1.5'>
																						<span>✓ Wszystkie pakiety dodatkowe są aktywne</span>
																					</p>
																				) : (
																					<>
																						<p className='text-[10px] font-mono text-stone-500 uppercase tracking-wider font-bold'>
																							Dokup pakiety dodatkowe dla tego lokalu:
																						</p>
																						<div className='grid grid-cols-1 sm:grid-cols-2 gap-2'>
																							{hasPromotion ? (
																								<div className='px-2 py-1.5 border border-dashed border-stone-200 bg-stone-50 text-[9px] font-mono uppercase tracking-wider text-stone-400 text-center flex items-center justify-center font-bold'>
																									✓ Promowanie (Aktywne)
																								</div>
																							) : (
																								<button
																									onClick={() => handleCheckout(rest.id, 'PROMOTE_50')}
																									className='px-2 py-1.5 border border-stone-400 hover:border-black transition-all text-[9px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																									Promowanie (+50 PLN)
																								</button>
																							)}

																							{hasStaticMenu ? (
																								<div className='px-2 py-1.5 border border-dashed border-stone-200 bg-stone-50 text-[9px] font-mono uppercase tracking-wider text-stone-400 text-center flex items-center justify-center font-bold'>
																									✓ Karta menu (Aktywne)
																								</div>
																							) : (
																								<button
																									onClick={() => handleCheckout(rest.id, 'OFFER_50')}
																									className='px-2 py-1.5 bg-black text-white hover:bg-stone-900 transition-all text-[9px] font-mono uppercase tracking-wider cursor-pointer font-bold text-center'>
																									Karta menu (+50 PLN)
																								</button>
																							)}
																						</div>
																					</>
																				)}
																			</>
																		)}
																	</>
																)}
															</div>
														)}
													</div>
												)
											})}
										</div>
									)}

									<hr className='border-stone-200' />

									<div>
										<h2 className='text-xl font-bold font-serif text-stone-900'>Dostępne pakiety abonamentowe</h2>
										<p className='text-stone-500 text-xs mt-1 font-sans'>
											Wybierz pakiet dopasowany do potrzeb Twojego lokalu gastronomicznego.
										</p>
									</div>

									<div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
										{/* Plan 1: Abonament za lokal */}
										<div className='border border-stone-200 p-6 bg-stone-50 flex flex-col justify-between space-y-6'>
											<div className='space-y-3'>
												<span className='text-[9px] font-mono uppercase tracking-widest text-stone-400 font-bold'>
													Standard
												</span>
												<h3 className='font-serif font-bold text-xl text-stone-900'>Abonament za lokal</h3>
												<p className='font-mono text-lg font-bold text-stone-900'>
													100 PLN <span className='text-xs font-mono text-stone-400'>/ miesiąc</span>
												</p>
												<p className='text-stone-500 text-xs leading-relaxed font-sans'>
													Dedykowany FB bot scraper, który codziennie pobiera Twoje dania dnia z postów
													społecznościowych.
												</p>
												<ul className='space-y-2 pt-2 text-xs font-mono text-stone-600'>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-black shrink-0' /> FB Bot Scraper (12:00)
													</li>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-black shrink-0' /> Wyświetlenia i statystyki
													</li>
													<li className='flex items-center gap-2 text-stone-400 line-through'>
														<X className='w-3.5 h-3.5 text-stone-300 shrink-0' /> Promowanie na górze
													</li>
													<li className='flex items-center gap-2 text-stone-400 line-through'>
														<X className='w-3.5 h-3.5 text-stone-300 shrink-0' /> stałe menu
													</li>
												</ul>
											</div>
										</div>

										{/* Plan 2: Promowanie na górze */}
										<div className='border-2 border-black p-6 bg-white flex flex-col justify-between space-y-6 relative shadow-md'>
											<div className='absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 text-[8px] font-mono uppercase font-bold tracking-widest'>
												Wyróżnienie
											</div>
											<div className='space-y-3'>
												<span className='text-[9px] font-mono uppercase tracking-widest text-orange-600 font-bold'>
													Zwiększ widoczność
												</span>
												<h3 className='font-serif font-bold text-xl text-stone-900'>Promowanie na górze</h3>
												<p className='font-mono text-lg font-bold text-stone-900'>
													50 PLN <span className='text-xs font-mono text-stone-400'>/ miesiąc</span>
												</p>
												<p className='text-stone-500 text-xs leading-relaxed font-sans'>
													Podbija i wyróżnia Twoją restaurację na samą górę listy wyników wyszukiwania w wybranym
													mieście.
												</p>
												<ul className='space-y-2 pt-2 text-xs font-mono text-stone-600'>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-green-700 shrink-0' /> Wyświetlanie na szczycie listy
													</li>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-green-700 shrink-0' /> Specjalna ramka wyróżniająca
													</li>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-green-700 shrink-0' /> FB Bot Scraper (12:00)
													</li>
													<li className='flex items-center gap-2 text-stone-400 line-through'>
														<X className='w-3.5 h-3.5 text-stone-300 shrink-0' /> stałe menu
													</li>
												</ul>
											</div>
										</div>

										{/* Plan 3: stałe menu */}
										<div className='border border-stone-200 p-6 bg-stone-50 flex flex-col justify-between space-y-6'>
											<div className='space-y-3'>
												<span className='text-[9px] font-mono uppercase tracking-widest text-stone-400 font-bold'>
													Wygoda
												</span>
												<h3 className='font-serif font-bold text-xl text-stone-900'>stałe menu</h3>
												<p className='font-mono text-lg font-bold text-stone-900'>
													50 PLN <span className='text-xs font-mono text-stone-400'>/ miesiąc</span>
												</p>
												<p className='text-stone-500 text-xs leading-relaxed font-sans'>
													Umożliwia dodanie stałej, całorocznej oferty bezpośrednio z panelu (bez konieczności
													postowania na Facebooku).
												</p>
												<ul className='space-y-2 pt-2 text-xs font-mono text-stone-600'>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-black shrink-0' /> Oferta Stała (Standard Offer)
													</li>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-black shrink-0' /> Ręczne sterowanie z panelu
													</li>
													<li className='flex items-center gap-2'>
														<Check className='w-3.5 h-3.5 text-black shrink-0' /> FB Bot Scraper (12:00)
													</li>
													<li className='flex items-center gap-2 text-stone-400 line-through'>
														<X className='w-3.5 h-3.5 text-stone-300 shrink-0' /> Promowanie na górze
													</li>
												</ul>
											</div>
										</div>
									</div>
								</section>
							)}

							{!isAdmin && activeTab === 'payments' && (
								<section>
									<h2 className='text-xl font-bold font-serif text-stone-900 border-b border-stone-100 pb-2 text-left'>
										Historia płatności
									</h2>
									{payments.length === 0 ? (
										<div className='py-12 text-center border border-dashed border-stone-200 bg-stone-50 p-6 mt-4'>
											<p className='text-stone-500 text-sm'>Brak historii płatności dla tej restauracji.</p>
										</div>
									) : (
										<div className='overflow-x-auto mt-4'>
											<table className='min-w-full bg-white border border-stone-200'>
												<thead className='bg-stone-50'>
													<tr>
														<th className='px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500'>
															ID Płatności
														</th>
														<th className='px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500'>
															Data
														</th>
														<th className='px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500'>
															Kwota
														</th>
														<th className='px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500'>
															Status
														</th>
													</tr>
												</thead>
												<tbody className='divide-y divide-stone-200'>
													{payments.map(payment => (
														<tr key={payment.id}>
															<td className='px-6 py-4 whitespace-nowrap text-sm font-mono text-stone-500 text-left'>
																{payment.id.split('-')[0]}...
															</td>
															<td className='px-6 py-4 whitespace-nowrap text-sm text-stone-800 text-left'>
																{new Date(payment.createdAt).toLocaleDateString('pl-PL')}
															</td>
															<td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-900 text-left'>
																{Number(payment.amount).toFixed(2)} {payment.currency}
															</td>
															<td className='px-6 py-4 whitespace-nowrap text-sm text-left'>
																<span
																	className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
																	{payment.status}
																</span>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</section>
							)}
						</>
					)}
				</>
			) : (
				// SaaS Landing Page for Non-owners (using the reusable Carousel Guide)
				<div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-start'>
					<section className='lg:col-span-7 space-y-6'>{renderGuideCarousel()}</section>

					<section className='lg:col-span-5 bg-white border border-stone-200 p-8 text-center space-y-6 shadow-sm'>
						<div className='w-12 h-12 bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center font-serif text-lg font-bold mx-auto'>
							!
						</div>
						<div className='space-y-2'>
							<h3 className='text-xl font-bold font-serif text-stone-900'>Dołącz do nas</h3>
							<p className='text-stone-500 text-sm max-w-md mx-auto font-sans'>
								Aby móc dodać profil restauracji i śledzić statystyki wyświetleń oraz subskrypcje, musisz najpierw
								założyć konto typu Właściciel.
							</p>
						</div>
						<div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
							<Link
								to='/login'
								className='w-full sm:w-auto px-6 py-2.5 border border-black hover:bg-stone-50 text-stone-900 font-mono text-xs uppercase tracking-widest text-center cursor-pointer font-bold'>
								Zaloguj się
							</Link>
							<Link
								to='/register'
								className='w-full sm:w-auto px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest text-center cursor-pointer font-bold'>
								Zarejestruj konto
							</Link>
						</div>
					</section>
				</div>
			)}

			{/* Bottom Carousel Guide for Owners (Visible when logged in at the bottom) */}
			{isOwnerOrAdmin && !isAdmin && (
				<section className='max-w-4xl mx-auto pt-10 border-t border-stone-200 space-y-6'>
					<h2 className='text-xl font-bold font-serif text-stone-900 text-center'>
						Jak poprawnie skonfigurować posty i automatyczne pobieranie?
					</h2>
					{renderGuideCarousel()}
				</section>
			)}

			{/* Support Block Banner */}
			<section className='bg-stone-50 border border-stone-200 p-6 md:p-8 text-center max-w-4xl mx-auto shadow-sm'>
				<div className='flex items-center justify-center gap-2 mb-2'>
					<Mail className='w-4 h-4 text-stone-600' />
					<h4 className='font-serif text-base font-bold text-stone-900'>Potrzebujesz pomocy technicznej?</h4>
				</div>
				<p className='text-stone-500 text-xs md:text-sm'>
					Nasz zespół jest gotów Ci pomóc w integracji Twojego fanpage na Facebooku lub konfiguracji bota. Napisz do nas
					bezpośrednio na adres:{' '}
					<a href='mailto:rafaldruzba.00@gmail.com' className='font-mono font-bold text-black hover:underline'>
						rafaldruzba.00@gmail.com
					</a>
				</p>
			</section>
		</main>
	)
}
