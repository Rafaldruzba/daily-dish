import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import {
	RefreshCw,
	Mail,
	MapPin,
	Star,
	User as UserIcon,
	MessageSquare,
	Settings,
	ShieldAlert,
	AlertTriangle,
	Lock,
	Heart,
	Trash2,
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

const generateSlug = (value: string) => {
	return value
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}

export default function ForRestaurantsPage() {
	const { user, token } = useAuth()
	const isAdmin = user?.role === 'ADMIN'
	const isOwner = user?.role === 'OWNER'

	const [activeTab, setActiveTab] = useState('stats')
	const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([])
	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [form, setForm] = useState<RestaurantForm>(INITIAL_FORM_STATE)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	const [payments, setPayments] = useState<Payment[]>([])
	const [adminPayments, setAdminPayments] = useState<any[]>([])
	const [adminLogs, setAdminLogs] = useState<any[]>([])
	const [loadingLogs, setLoadingLogs] = useState(false)
	const [loadingPayments, setLoadingPayments] = useState(false)

	const [userReviews, setUserReviews] = useState<any[]>([])
	const [loadingUserReviews, setLoadingUserReviews] = useState(false)
	const [userFavorites, setUserFavorites] = useState<Restaurant[]>([])
	const [loadingFavorites, setLoadingFavorites] = useState(false)

	const [commentReports, setCommentReports] = useState<any[]>([])
	const [restaurantReports, setRestaurantReports] = useState<any[]>([])
	const [loadingReports, setLoadingReports] = useState(false)
	const [updatingReport, setUpdatingReport] = useState(false)

	const [profileName, setProfileName] = useState(user?.name || '')
	const [profileCity, setProfileCity] = useState(user?.city || '')
	const [updatingProfile, setUpdatingProfile] = useState(false)

	const [activeStep, setActiveStep] = useState(0)
	const steps = [
		{
			title: '1. Załóż konto i zgłoś lokal',
			desc: 'Zarejestruj się jako Właściciel, uzupełnij dane oraz wklej adres URL fanpage na Facebooku.',
		},
		{
			title: '2. Dodaj post przed 11:00',
			desc: 'Robot skanuje posty codziennie o 12:00. Aby mieć pewność pobrania, opublikuj post przed 11:00.',
		},
		{
			title: '3. Formatuj post („Danie dnia!”)',
			desc: 'Twój post na Facebooku musi zaczynać się od tekstu „Danie dnia!” – bez emotek i dodatkowych spacji na początku.',
		},
		{
			title: '4. Elastyczna subskrypcja',
			desc: 'Otrzymujesz 30 dni bezpłatnego okresu próbnego. Po jego zakończeniu koszt bota wynosi 99 zł miesięcznie.',
		},
	]

	const updateField = (field: keyof RestaurantForm, value: string | number) => {
		setForm(prev => ({ ...prev, [field]: value }))
	}

	const renderGuideCarousel = () => {
		return (
			<div className='bg-stone-50 border border-stone-200 p-6 md:p-8 space-y-4 relative overflow-hidden flex flex-col justify-between min-h-[250px] shadow-sm text-left'>
				<div className='absolute top-0 left-0 right-0 h-1 bg-stone-200'>
					<div
						className='bg-black h-full transition-all duration-300'
						style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}></div>
				</div>

				<div className='space-y-2'>
					<div className='flex justify-between items-center'>
						<span className='font-mono text-[10px] tracking-widest uppercase bg-black text-white px-2.5 py-1 font-bold'>
							Krok {activeStep + 1} z {steps.length}
						</span>
					</div>
					<h3 className='text-base font-bold font-serif text-stone-900'>{steps[activeStep].title}</h3>
					<p className='text-stone-600 text-xs font-sans leading-relaxed'>{steps[activeStep].desc}</p>
				</div>

				<div className='flex items-center justify-between pt-4 border-t border-stone-200'>
					<div className='flex gap-1.5'>
						{steps.map((_, i) => (
							<button
								key={i}
								onClick={() => setActiveStep(i)}
								className={`w-2 h-2 rounded-full transition-all cursor-pointer ${
									i === activeStep ? 'bg-black w-4' : 'bg-stone-200 hover:bg-stone-400'
								}`}
							/>
						))}
					</div>
					<div className='flex gap-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
						<button
							disabled={activeStep === 0}
							onClick={() => setActiveStep(p => Math.max(p - 1, 0))}
							className='px-2 py-1 border border-stone-200 bg-white text-stone-800 cursor-pointer'>
							Wstecz
						</button>
						<button
							disabled={activeStep === steps.length - 1}
							onClick={() => setActiveStep(p => Math.min(p + 1, steps.length - 1))}
							className='px-2 py-1 bg-black text-white hover:bg-stone-900 cursor-pointer'>
							Dalej
						</button>
					</div>
				</div>
			</div>
		)
	}

	const queryParams = new URLSearchParams(window.location.search)
	const successParam = queryParams.get('success')
	const cancelParam = queryParams.get('cancel')

	useEffect(() => {
		if (user) {
			setProfileName(user.name || '')
			setProfileCity(user.city || '')
			if (user.role === 'ADMIN') setActiveTab('admin-pending')
			else if (user.role === 'OWNER') setActiveTab('stats')
			else if (user.role === 'USER') setActiveTab('user-favorites')
		}
	}, [user])

	useEffect(() => {
		if (successParam) {
			setSuccess('Płatność i aktywacja subskrypcji zakończona sukcesem!')
			window.history.replaceState({}, document.title, window.location.pathname)
		}
		if (cancelParam) {
			setError('Płatność została anulowana.')
			window.history.replaceState({}, document.title, window.location.pathname)
		}
	}, [successParam, cancelParam])

	const handleCheckout = async (restaurantId: string, planId: string) => {
		try {
			setError('')
			setSuccess('')
			const res = await fetch(`${API_URL}/payments/subscribe`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ restaurantId, planId }),
			})
			const data = await res.json()
			if (!res.ok) throw new Error(data.message || 'Błąd płatności.')
			if (data.url) window.location.href = data.url
		} catch (err: any) {
			setError(err.message || 'Błąd bramki Stripe.')
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
			if (res.ok) setPayments(await res.json())
		} catch (err) {
			console.error(err)
		}
	}

	useEffect(() => {
		if (token && (isOwner || isAdmin)) {
			if (isAdmin) loadAdminRestaurants()
			else loadOwnedRestaurants()
		} else {
			setLoading(false)
		}
	}, [token, isOwner, isAdmin])

	const loadAdminRestaurants = async () => {
		try {
			setLoading(true)
			const response = await fetch(`${API_URL}/restaurants/admin/all`, {
				headers: token ? { Authorization: `Bearer ${token}` } : {},
			})
			if (response.ok) setRestaurants(await response.json())
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	const handleStatusApproval = async (id: string, status: 'APPROVED' | 'REJECTED') => {
		if (!token || !isAdmin) return
		try {
			setError('')
			setSuccess('')
			const response = await fetch(`${API_URL}/restaurants/admin/${id}/status`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ status }),
			})
			if (!response.ok) throw new Error()
			setSuccess(`Zmieniono status na: ${status === 'APPROVED' ? 'Zatwierdzona' : 'Odrzucona'}`)
			loadAdminRestaurants()
		} catch (err) {
			setError('Nie udało się zaktualizować statusu.')
		}
	}

	const toggleRestaurantStatus = async (restaurant: Restaurant) => {
		if (!token || !isAdmin) return
		try {
			setError('')
			const response = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ isActive: !restaurant.isActive }),
			})
			if (response.ok) {
				const updated = await response.json()
				setRestaurants(prev => prev.map(item => (item.id === updated.id ? updated : item)))
				setSuccess(`Scrapowanie „${updated.name}” zostało ${updated.isActive ? 'wznowione' : 'wstrzymane'}.`)
			}
		} catch (err) {
			setError('Błąd zmiany statusu.')
		}
	}

	const deleteRestaurant = async (id: string) => {
		if (!token || !isAdmin) return
		if (!window.confirm('Czy na pewno chcesz usunąć tę restaurację?')) return
		try {
			setError('')
			const response = await fetch(`${API_URL}/restaurants/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})
			if (response.ok) {
				setRestaurants(prev => prev.filter(item => item.id !== id))
				setSuccess('Restauracja została usunięta.')
			}
		} catch (err) {
			setError('Błąd podczas usuwania.')
		}
	}

	const loadOwnedRestaurants = async () => {
		try {
			setLoading(true)
			const res = await fetch(`${API_URL}/restaurants/owner`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) setOwnedRestaurants(await res.json())
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	const loadAdminPayments = async () => {
		if (!token) return
		try {
			setLoadingPayments(true)
			const res = await fetch(`${API_URL}/payments/admin/all`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) setAdminPayments(await res.json())
		} catch (err) {
			console.error(err)
		} finally {
			setLoadingPayments(false)
		}
	}

	const loadAdminLogs = async () => {
		if (!token) return
		try {
			setLoadingLogs(true)
			const res = await fetch(`${API_URL}/logs/admin/all`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) setAdminLogs(await res.json())
		} catch (err) {
			console.error(err)
		} finally {
			setLoadingLogs(false)
		}
	}

	const loadUserFavorites = async () => {
		if (!token) return
		try {
			setLoadingFavorites(true)
			const res = await fetch(`${API_URL}/restaurants/favorites`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) setUserFavorites(await res.json())
		} catch (err) {
			console.error(err)
		} finally {
			setLoadingFavorites(false)
		}
	}

	const loadUserReviews = async () => {
		if (!token) return
		try {
			setLoadingUserReviews(true)
			const res = await fetch(`${API_URL}/reviews/me`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) setUserReviews(await res.json())
		} catch (err) {
			console.error(err)
		} finally {
			setLoadingUserReviews(false)
		}
	}

	const loadModerationReports = async () => {
		if (!token) return
		try {
			setLoadingReports(true)
			const res = await fetch(`${API_URL}/reports/admin/all`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setCommentReports(data.commentReports || [])
				setRestaurantReports(data.restaurantReports || [])
			}
		} catch (err) {
			console.error(err)
		} finally {
			setLoadingReports(false)
		}
	}

	const handleResolveCommentReport = async (reportId: string, action: 'APPROVE' | 'DELETE') => {
		if (!token) return
		if (action === 'DELETE' && !window.confirm('Usunąć opinię i zbanować autora na 3 dni?')) return
		try {
			setUpdatingReport(true)
			const res = await fetch(`${API_URL}/reports/admin/comments/${reportId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ action }),
			})
			if (res.ok) {
				setSuccess(action === 'APPROVE' ? 'Zaakceptowano opinię.' : 'Opinia usunięta, autor zbanowany.')
				loadModerationReports()
			}
		} catch (err) {
			console.error(err)
		} finally {
			setUpdatingReport(false)
		}
	}

	const handleResolveRestaurantReport = async (reportId: string) => {
		if (!token) return
		try {
			setUpdatingReport(true)
			const res = await fetch(`${API_URL}/reports/admin/restaurants/${reportId}`, {
				method: 'PUT',
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				setSuccess('Rozwiązano zgłoszenie błędu lokalu.')
				loadModerationReports()
			}
		} catch (err) {
			console.error(err)
		} finally {
			setUpdatingReport(false)
		}
	}

	const handleAdminSubscriptionUpdate = async (
		e: React.FormEvent | React.MouseEvent,
		restaurantId: string,
		action: 'EXTEND_TRIAL' | 'ACTIVATE_BASE' | 'BLOCK',
	) => {
		e.preventDefault
		if (!token) return
		if (action === 'BLOCK' && !window.confirm('Zawieść ten lokal i zablokować właściciela?')) return
		try {
			setLoading(true)
			const res = await fetch(`${API_URL}/restaurants/admin/${restaurantId}/subscription`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ action }),
			})
			if (res.ok) {
				setSuccess('Plan subskrypcji lokalu został pomyślnie zaktualizowany.')
				loadAdminRestaurants()
			}
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	const handleUpdateProfile = async (e: FormEvent) => {
		e.preventDefault()
		if (!token) return
		try {
			setUpdatingProfile(true)
			setError('')
			setSuccess('')
			const res = await fetch(`${API_URL}/auth/me`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ name: profileName, city: profileCity }),
			})
			const data = await res.json()
			if (res.ok) {
				setSuccess('Dane profilu zaktualizowane.')
				setTimeout(() => window.location.reload(), 1000)
			} else {
				setError(data.message || 'Nie udało się zaktualizować profilu.')
			}
		} catch (err) {
			console.error(err)
		} finally {
			setUpdatingProfile(false)
		}
	}

	const handleDeleteAccount = async () => {
		if (!token) return
		const isOwnerRole = user?.role === 'OWNER'
		const confirmMsg = isOwnerRole
			? 'Ostrzeżenie: Usunięcie konta OWNER ukryje wszystkie lokale na 3 miesiące. Czy na pewno chcesz usunąć konto?'
			: 'Czy na pewno chcesz bezpowrotnie usunąć swoje konto?'
		if (!window.confirm(confirmMsg)) return
		try {
			setLoading(true)
			const res = await fetch(`${API_URL}/auth/me`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				localStorage.removeItem('dd_token')
				window.location.href = '/'
			}
		} catch (err) {
			console.error(err)
		} finally {
			setLoading(false)
		}
	}

	const handleDeleteRestaurant = async (restaurantId: string, restaurantName: string) => {
		if (!token) return
		const confirmDelete = window.confirm(
			`Czy na pewno chcesz trwale usunąć restaurację "${restaurantName}"? Wszystkie powiązane subskrypcje, oferty i statystyki zostaną bezpowrotnie skasowane.`,
		)
		if (!confirmDelete) return

		try {
			setLoading(true)
			setError('')
			setSuccess('')
			const response = await fetch(`${API_URL}/restaurants/${restaurantId}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			const data = await response.json()
			if (response.ok && data.success) {
				setSuccess(data.message || 'Restauracja została pomyślnie usunięta.')
				loadOwnedRestaurants()
			} else {
				setError(data.message || 'Nie udało się usunąć restauracji.')
			}
		} catch (err) {
			console.error(err)
			setError('Błąd połączenia z serwerem.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		if (activeTab === 'admin-payments') loadAdminPayments()
		else if (activeTab === 'admin-logs') loadAdminLogs()
		else if (activeTab === 'user-favorites') loadUserFavorites()
		else if (activeTab === 'user-reviews') loadUserReviews()
		else if (activeTab === 'admin-reports') loadModerationReports()
	}, [activeTab])

	const handleNameChange = (value: string) => {
		setForm(prev => ({ ...prev, name: value, slug: generateSlug(value) }))
	}

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (!token) return
		try {
			const response = await fetch(`${API_URL}/restaurants`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify(form),
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || 'Błąd.')
			setSuccess(`Zgłoszono kandydaturę: ${data.name}`)
			setForm(INITIAL_FORM_STATE)
			loadOwnedRestaurants()
		} catch (err: any) {
			setError(err.message || 'Wystąpił błąd podczas dodawania.')
		}
	}

	const getDaysLeft = (endsAtStr: string | null) => {
		if (!endsAtStr) return 0
		const diff = new Date(endsAtStr).getTime() - Date.now()
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
		return days > 0 ? days : 0
	}

	const renderAdminRestaurantCard = (restaurant: Restaurant) => {
		return (
			<article
				key={restaurant.id}
				className={`relative overflow-hidden p-6 border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all ${
					!restaurant.isActive ? 'opacity-65 border-stone-200' : 'border-stone-200 hover:border-black shadow-sm'
				}`}>
				<div className='space-y-3 flex-grow text-left pl-2'>
					<h3 className='text-base font-bold font-serif text-stone-900'>{restaurant.name}</h3>
					<span className='font-mono text-[9px] tracking-wider text-stone-400 uppercase block'>
						{restaurant.city} {restaurant.address ? `, ${restaurant.address}` : ''}
					</span>
				</div>
				<div className='flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-auto'>
					{restaurant.status === 'PENDING' ? (
						<>
							<button
								onClick={() => handleStatusApproval(restaurant.id, 'APPROVED')}
								className='px-3 py-2 bg-green-700 text-white hover:bg-green-800 transition-colors font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer'>
								Zatwierdź
							</button>
							<button
								onClick={() => handleStatusApproval(restaurant.id, 'REJECTED')}
								className='px-3 py-2 border border-red-200 text-red-500 hover:border-red-600 transition-colors font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer'>
								Odrzuć
							</button>
						</>
					) : (
						<>
							<button
								onClick={() => toggleRestaurantStatus(restaurant)}
								className='p-2 border border-stone-200 hover:border-black text-stone-700 transition-colors font-mono text-[10px] uppercase tracking-wider cursor-pointer'>
								{restaurant.isActive ? 'Pauzuj' : 'Wznów'}
							</button>
							<button
								onClick={() => deleteRestaurant(restaurant.id)}
								className='p-2 border border-stone-200 hover:border-red-600 text-stone-500 hover:text-red-600 transition-colors font-mono text-[10px] uppercase tracking-wider cursor-pointer'>
								Usuń
							</button>
						</>
					)}
					<Link
						to={`/restaurants/${restaurant.slug}`}
						className='px-3 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer'>
						Zobacz profil
					</Link>
				</div>
			</article>
		)
	}

	const dateFormatter = new Intl.DateTimeFormat('pl-PL', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	})

	return (
		<main className='max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-12'>
			{/* Header */}
			<section className='border-b border-stone-200 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6'>
				<div className='max-w-2xl text-left'>
					<span className='text-xs font-mono uppercase tracking-widest text-stone-400'>
						{isAdmin
							? 'Panel Administratora'
							: isOwner
								? 'Panel Właściciela'
								: user
									? 'Twój Profil'
									: 'Dedykowany Panel'}
					</span>
					<h1 className='text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1'>
						{isAdmin
							? 'Panel Moderacji i Zarządzania'
							: isOwner
								? 'Twój Panel Biznesowy'
								: user
									? 'Twój Profil Smakosza'
									: 'Dla Restauracji'}
					</h1>
					<p className='text-stone-500 text-sm md:text-base mt-2'>
						{isAdmin
							? 'Zatwierdzaj zgłoszenia od restauratorów, zarządzaj aktywnością lokali, kontroluj statusy i moderuj zgłoszenia.'
							: isOwner
								? 'Zarządzaj swoimi lokalami, śledź wyświetlenia i kontroluj status subskrypcji.'
								: user
									? 'Zarządzaj swoimi ustawieniami, przeglądaj ulubione restauracje i śledź wystawione opinie.'
									: 'Dołącz do platformy BistroMapa i dotrzyj do setek głodnych klientów w Twojej okolicy.'}
					</p>
				</div>
			</section>

			{success && (
				<div className='p-4 bg-green-50 border-l-4 border-green-600 text-xs font-mono text-green-800 text-left max-w-4xl mx-auto'>
					<span>{success}</span>
				</div>
			)}
			{error && (
				<div className='p-4 bg-red-50 border-l-4 border-red-500 text-xs font-mono text-red-500 text-left max-w-4xl mx-auto'>
					{error}
				</div>
			)}

			{user ? (
				<>
					<div className='border-b border-stone-200 mb-8 overflow-x-auto whitespace-nowrap scrollbar-none'>
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
										Zatwierdzone ({restaurants.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE').length})
									</button>
									<button
										onClick={() => setActiveTab('admin-payments')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-payments' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Płatności
									</button>
									<button
										onClick={() => setActiveTab('admin-reports')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-reports' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Moderacja Zgłoszeń
									</button>
									<button
										onClick={() => setActiveTab('admin-logs')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-logs' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Logi systemowe
									</button>
								</>
							) : isOwner ? (
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
									<button
										onClick={() => setActiveTab('user-settings')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-settings' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Ustawienia konta
									</button>
								</>
							) : (
								<>
									<button
										onClick={() => setActiveTab('user-favorites')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-favorites' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Ulubione lokale
									</button>
									<button
										onClick={() => setActiveTab('user-reviews')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-reviews' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Moje opinie
									</button>
									<button
										onClick={() => setActiveTab('user-settings')}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-settings' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										Ustawienia konta
									</button>
								</>
							)}
						</nav>
					</div>

					{/* --- SEKCJE TABÓW --- */}

					{isAdmin && activeTab === 'admin-pending' && (
						<section className='space-y-6'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900 text-left'>
									Kandydatury oczekujące ({restaurants.filter(r => r.status === 'PENDING').length})
								</h2>
								<button
									onClick={loadAdminRestaurants}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : restaurants.filter(r => r.status === 'PENDING').length === 0 ? (
								<p className='text-stone-400 text-xs font-mono italic'>Brak oczekujących zgłoszeń.</p>
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
									Zatwierdzone restauracje (
									{restaurants.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE').length})
								</h2>
								<button
									onClick={loadAdminRestaurants}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : (
								<div className='space-y-4'>
									{restaurants
										.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE')
										.map(r => (
											<div
												key={r.id}
												className='border border-stone-200 p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 text-left shadow-sm text-xs'>
												<div className='space-y-2 flex-grow'>
													<h3 className='text-base font-bold font-serif text-stone-900'>
														{r.name} ({r.city})
													</h3>
													<p className='text-stone-500'>
														Właściciel:{' '}
														<strong>
															{r.user?.name || 'N/A'} ({r.user?.email || 'N/A'})
														</strong>
													</p>
													<p className='text-stone-500 font-mono'>
														Plan: <strong>{r.subscription?.plan || 'Brak'}</strong>
													</p>
												</div>
												<div className='flex flex-wrap gap-2'>
													<button
														onClick={e => handleAdminSubscriptionUpdate(e, r.id, 'EXTEND_TRIAL')}
														className='px-2.5 py-1.5 border border-stone-200 font-mono text-[9px] uppercase font-bold bg-white text-stone-900 cursor-pointer'>
														Trial (30 dni)
													</button>
													<button
														onClick={e => handleAdminSubscriptionUpdate(e, r.id, 'ACTIVATE_BASE')}
														className='px-2.5 py-1.5 border border-black font-mono text-[9px] uppercase font-bold bg-black text-white cursor-pointer'>
														Base (30 dni)
													</button>
													<button
														onClick={e => handleAdminSubscriptionUpdate(e, r.id, 'BLOCK')}
														className='px-2.5 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 font-mono text-[9px] uppercase font-bold cursor-pointer'>
														Zawieś (Block)
													</button>
												</div>
											</div>
										))}
								</div>
							)}
						</section>
					)}

					{isAdmin && activeTab === 'admin-payments' && (
						<section className='space-y-6 text-left'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>
									Wszystkie płatności ({adminPayments.length})
								</h2>
								<button
									onClick={loadAdminPayments}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono cursor-pointer'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loadingPayments ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : adminPayments.length === 0 ? (
								<p className='text-stone-500 text-xs'>Brak płatności.</p>
							) : (
								<div className='overflow-x-auto border border-stone-200'>
									<table className='min-w-full bg-white text-xs font-mono divide-y divide-stone-200'>
										<thead className='bg-stone-50'>
											<tr>
												<th className='px-6 py-3 text-left'>Lokal</th>
												<th className='px-6 py-3 text-left'>Data</th>
												<th className='px-6 py-3 text-left'>Kwota</th>
												<th className='px-6 py-3 text-left'>Metoda</th>
												<th className='px-6 py-3 text-left'>Status</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-stone-200'>
											{adminPayments.map(p => (
												<tr key={p.id}>
													<td className='px-6 py-4 font-serif font-bold text-left'>{p.restaurant?.name || 'N/A'}</td>
													<td className='px-6 py-4 text-left'>{new Date(p.createdAt).toLocaleDateString('pl-PL')}</td>
													<td className='px-6 py-4 text-left font-bold'>
														{p.amount} {p.currency}
													</td>
													<td className='px-6 py-4 text-left text-[10px] text-stone-400'>
														{p.provider} • {p.providerPaymentId}
													</td>
													<td className='px-6 py-4 text-left'>
														<span className='px-2 py-0.5 rounded bg-green-100 text-green-800 font-bold'>
															{p.status}
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

					{isAdmin && activeTab === 'admin-reports' && (
						<section className='space-y-8 text-left'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>Moderacja Zgłoszeń</h2>
								<button
									onClick={loadModerationReports}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono cursor-pointer'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loadingReports ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : (
								<div className='space-y-6'>
									<div className='space-y-3'>
										<h3 className='text-base font-bold font-serif text-stone-900 flex items-center gap-1.5'>
											<MessageSquare className='w-4 h-4' />
											Zgłoszone Komentarze ({commentReports.length})
										</h3>
										{commentReports.length === 0 ? (
											<p className='text-stone-500 text-xs italic p-4 border border-dashed'>
												Brak zgłoszeń komentarzy.
											</p>
										) : (
											<div className='space-y-3'>
												{commentReports.map(cr => (
													<div key={cr.id} className='border p-4 bg-white text-xs space-y-2'>
														<p>
															Zgłosił: <strong>{cr.user?.name}</strong> • Powód:{' '}
															<strong className='text-red-600'>{cr.reason}</strong>
														</p>
														<p className='bg-stone-50 p-3 italic text-stone-600'>
															„{cr.review?.comment}” ({cr.review?.rating} ★)
														</p>
														<div className='flex justify-end gap-2'>
															<button
																onClick={() => handleResolveCommentReport(cr.id, 'APPROVE')}
																disabled={updatingReport}
																className='px-2 py-1 border text-[10px] font-mono cursor-pointer bg-white disabled:opacity-50'>
																Przywróć
															</button>
															<button
																onClick={() => handleResolveCommentReport(cr.id, 'DELETE')}
																disabled={updatingReport}
																className='px-2 py-1 border border-red-200 text-red-500 text-[10px] font-mono cursor-pointer bg-red-50 disabled:opacity-50'>
																Usuń i zbanuj autora
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
									<div className='space-y-3 pt-4 border-t'>
										<h3 className='text-base font-bold font-serif text-stone-900 flex items-center gap-1.5'>
											<ShieldAlert className='w-4 h-4' />
											Zgłoszenia błędów lokali ({restaurantReports.length})
										</h3>
										{restaurantReports.length === 0 ? (
											<p className='text-stone-500 text-xs italic p-4 border border-dashed'>
												Brak zgłoszeń błędów lokali.
											</p>
										) : (
											<div className='space-y-3'>
												{restaurantReports.map(rr => (
													<div key={rr.id} className='border p-4 bg-white text-xs space-y-2'>
														<h4 className='font-bold'>
															{rr.restaurant?.name} ({rr.restaurant?.city})
														</h4>
														<p className='text-stone-600'>
															<strong>Zgłoszenie:</strong> {rr.details} (Powód: {rr.reason})
														</p>
														<div className='flex justify-between items-center text-[10px] text-stone-400 font-mono'>
															<span>Zgłosił: {rr.user?.name}</span>
															<button
																onClick={() => handleResolveRestaurantReport(rr.id)}
																disabled={updatingReport}
																className='px-2 py-1 border cursor-pointer bg-white disabled:opacity-50'>
																Rozwiązane
															</button>
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								</div>
							)}
						</section>
					)}

					{isAdmin && activeTab === 'admin-logs' && (
						<section className='space-y-6 text-left'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>Logi systemowe ({adminLogs.length})</h2>
								<button
									onClick={loadAdminLogs}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono cursor-pointer'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loadingLogs ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : adminLogs.length === 0 ? (
								<p className='text-stone-500 text-xs'>Brak logów.</p>
							) : (
								<div className='border rounded bg-white p-4 font-mono text-xs space-y-2 max-h-[400px] overflow-y-auto'>
									{adminLogs.map(log => (
										<div
											key={log.id}
											className='border-b pb-2 flex flex-col justify-between text-left gap-1 last:border-0'>
											<div className='flex items-center gap-2'>
												<span
													className={`px-1.5 py-0.5 text-[8px] uppercase ${log.level === 'ERROR' ? 'bg-red-100 text-red-800' : 'bg-stone-100 text-stone-800'}`}>
													{log.level}
												</span>
												<span className='text-[10px] text-stone-400'>
													{new Date(log.createdAt).toLocaleString('pl-PL')}
												</span>
											</div>
											<p className='font-sans text-stone-800'>{log.message}</p>
										</div>
									))}
								</div>
							)}
						</section>
					)}

					{isOwner && activeTab === 'stats' && (
						<section className='space-y-6'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900 text-left'>Twoje Lokale i Statystyki</h2>
								<button
									onClick={loadOwnedRestaurants}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : ownedRestaurants.length === 0 ? (
								<p className='text-stone-500 text-xs p-12 border border-dashed text-center bg-stone-50'>
									Nie posiadasz jeszcze żadnych restauracji przypisanych do tego konta.
								</p>
							) : (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
									{ownedRestaurants.map(rest => (
										<article
											key={rest.id}
											className='border border-stone-200 p-6 bg-white space-y-4 hover:border-black transition-all text-left relative shadow-sm'>
											<div className='flex items-start justify-between gap-4'>
												<div className='space-y-1'>
													<span className='font-mono text-[9px] uppercase bg-stone-100 text-stone-600 px-2 py-0.5 border font-bold'>
														{rest.status}
													</span>
													<Link to={`/restaurants/${rest.slug}`}>
														<h3 className='text-xl font-bold font-serif text-stone-900 hover:underline pt-1'>
															{rest.name}
														</h3>
													</Link>
													<p className='text-xs text-stone-400 font-mono'>
														{rest.city}, {rest.address}
													</p>
												</div>
												<div className='text-right bg-stone-50 border p-3 min-w-[90px]'>
													<span className='block font-mono text-[9px] text-stone-400 uppercase font-bold tracking-wider'>
														Odwiedziny
													</span>
													<span className='block font-serif text-2xl font-black text-stone-900'>{rest.views || 0}</span>
												</div>
											</div>
											<div className='pt-4 border-t flex justify-between items-center text-xs font-mono'>
												<div className='flex flex-col gap-1'>
													<span className='text-stone-500'>
														Robot:{' '}
														<strong className={rest.isActive ? 'text-green-700' : 'text-red-500'}>
															{rest.isActive ? 'AKTYWNY' : 'WSTRZYMANY'}
														</strong>
													</span>
													<span className='text-stone-500'>
														Plan: <strong className='text-stone-900'>{rest.subscription?.plan || 'Free Trial'}</strong>
													</span>
													<span className='text-stone-500'>
														Data wygaśnięcia:{' '}
														<strong className='text-stone-900'>
															{rest.subscription?.currentPeriodEnd
																? dateFormatter.format(new Date(rest.subscription.currentPeriodEnd))
																: 'data nieznana'}
														</strong>
													</span>
												</div>
												<button
													onClick={() => handleDeleteRestaurant(rest.id, rest.name)}
													className='px-2.5 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm'
													title='Usuń restaurację bezpowrotnie'>
													<Trash2 className='w-3.5 h-3.5' /> Usuń lokal
												</button>
											</div>
										</article>
									))}
								</div>
							)}
						</section>
					)}

					{isOwner && activeTab === 'new' && (
						<section className='max-w-2xl mx-auto bg-white border border-stone-200 p-6 md:p-8 space-y-6 shadow-sm text-left'>
							<div className='border-b pb-3'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>Zgłoś nową restaurację</h2>
							</div>
							<form onSubmit={handleSubmit} className='space-y-4 font-sans text-xs'>
								<div className='space-y-1.5'>
									<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
										Nazwa lokalu *
									</label>
									<input
										type='text'
										value={form.name}
										onChange={e => handleNameChange(e.target.value)}
										placeholder='np. Pizzeria Bella Italia'
										className='w-full px-4 py-2.5 bg-white border border-stone-200 outline-none text-sm'
										required
									/>
								</div>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div className='space-y-1.5'>
										<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
											Miejscowość *
										</label>
										<input
											type='text'
											value={form.city}
											onChange={e => updateField('city', e.target.value)}
											placeholder='np. Łódź'
											className='w-full px-4 py-2.5 bg-white border border-stone-200 outline-none text-sm'
											required
										/>
									</div>
									<div className='space-y-1.5'>
										<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
											Adres (Ulica i nr) *
										</label>
										<input
											type='text'
											value={form.address}
											onChange={e => updateField('address', e.target.value)}
											placeholder='np. Piotrkowska 12'
											className='w-full px-4 py-2.5 bg-white border border-stone-200 outline-none text-sm'
											required
										/>
									</div>
								</div>
								<div className='space-y-1.5'>
									<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
										Facebook URL fanpage (Pobieramy stąd menu) *
									</label>
									<input
										type='url'
										value={form.facebookUrl}
										onChange={e => updateField('facebookUrl', e.target.value)}
										placeholder='https://www.facebook.com/twojaprofil'
										className='w-full px-4 py-2.5 bg-white border border-stone-200 outline-none text-sm'
										required
									/>
								</div>
								<div className='space-y-1.5'>
									<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
										Telefon kontaktowy *
									</label>
									<input
										type='tel'
										value={form.phone}
										onChange={e => updateField('phone', e.target.value)}
										placeholder='np. +48 501 202 303'
										className='w-full px-4 py-2.5 bg-white border border-stone-200 outline-none text-sm'
										required
									/>
								</div>
								<div className='p-4 bg-stone-50 border-l-2 text-[10px] text-stone-500 leading-relaxed'>
									<p>
										<strong>Informacja:</strong> Administrator serwisu zweryfikuje Twoje oświadczenia własności i
										zatwierdzi zgłoszenie lokalu w ciągu 24-48 godzin.
									</p>
								</div>
								<button
									type='submit'
									className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest font-bold cursor-pointer'>
									Zgłoś restaurację
								</button>
							</form>
						</section>
					)}

					{isOwner && activeTab === 'subscriptions' && (
						<section className='space-y-8 text-left'>
							<div>
								<h2 className='text-xl font-bold font-serif text-stone-900'>Abonamenty Twoich restauracji</h2>
								<p className='text-stone-500 text-xs mt-1'>
									Kontroluj statusy subskrypcji oraz aktywuj dodatkowe moduły promujące dla każdego ze swoich lokali.
								</p>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : ownedRestaurants.length === 0 ? (
								<p className='text-stone-500 text-xs p-6 border border-dashed bg-stone-50'>
									Zgłoś przynajmniej jedną restaurację, aby zakupić subskrypcję.
								</p>
							) : (
								<div className='space-y-6'>
									{ownedRestaurants.map(rest => {
										const trialDays =
											rest.subscription?.plan === 'FREE_TRIAL' ? getDaysLeft(rest.subscription.currentPeriodEnd) : 0
										const hasActiveBase = rest.subscriptions?.some(s => s.type === 'BASE' && s.status === 'ACTIVE')
										const hasPromotion = rest.subscriptions?.some(s => s.type === 'PROMOTION' && s.status === 'ACTIVE')
										const hasStaticMenu = rest.subscriptions?.some(
											s => s.type === 'STATIC_MENU' && s.status === 'ACTIVE',
										)

										return (
											<div key={rest.id} className='border p-6 bg-white space-y-4 shadow-sm'>
												<div className='flex justify-between items-start gap-4 flex-wrap border-b pb-4'>
													<div>
														<h3 className='text-lg font-bold font-serif text-stone-900'>{rest.name}</h3>
														<span className='font-mono text-[9px] uppercase text-stone-400'>
															{rest.city}, {rest.address}
														</span>
													</div>
													{rest.status === 'PENDING' ? (
														<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-orange-100 text-orange-800 uppercase tracking-wider'>
															Oczekuje na akceptację przez admina
														</span>
													) : (
														<div className='flex flex-wrap gap-2'>
															{hasActiveBase ? (
																<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-green-100 text-green-800 uppercase'>
																	✓ Abonament Aktywny
																</span>
															) : trialDays > 0 ? (
																<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-blue-100 text-blue-800 uppercase'>
																	Free Trial ({trialDays} dni)
																</span>
															) : (
																<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-red-100 text-red-800 uppercase'>
																	Abonament wygasł (PAUSE)
																</span>
															)}
															<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-blue-100 text-blue-800'>
																Data wygaśnięcia:
																{rest.subscription?.currentPeriodEnd
																	? ' ' + dateFormatter.format(new Date(rest.subscription.currentPeriodEnd))
																	: ' data nieznana'}
															</span>
														</div>
													)}
												</div>
												{rest.status !== 'PENDING' && (
													<div className='grid grid-cols-1 md:grid-cols-3 gap-4 pt-2'>
														{/* Base Plan */}
														<div className='border p-4 bg-stone-50 flex flex-col justify-between space-y-4'>
															<div>
																<h4 className='font-serif font-bold text-sm text-stone-900'>Abonament Scrapera</h4>
																<p className='text-[10px] text-stone-500 mt-0.5'>
																	Zapewnia codzienne pobieranie dań dnia z Facebooka o 12:00.
																</p>
															</div>
															{hasActiveBase ? (
																<div className='px-3 py-1.5 border border-dashed border-stone-200 text-[10px] font-mono uppercase text-stone-400 text-center font-bold'>
																	Włączony (Aktywny)
																</div>
															) : (
																<button
																	onClick={() => handleCheckout(rest.id, 'BASE')}
																	className='w-full py-1.5 bg-black text-white text-[9px] font-mono uppercase font-bold cursor-pointer text-center'>
																	Aktywuj (99 PLN/m)
																</button>
															)}
														</div>
														{/* Promotion Plan */}
														<div className='border p-4 bg-stone-50 flex flex-col justify-between space-y-4'>
															<div>
																<h4 className='font-serif font-bold text-sm text-stone-900'>Promowanie w okolicy</h4>
																<p className='text-[10px] text-stone-500 mt-0.5'>
																	Pozycjonuje Twój lokal na samej górze listy wyszukiwania w promieniu klienta.
																</p>
															</div>
															{hasPromotion ? (
																<div className='px-3 py-1.5 border border-dashed border-stone-200 text-[10px] font-mono uppercase text-stone-400 text-center font-bold'>
																	Włączony (Aktywny)
																</div>
															) : (
																<button
																	onClick={() => handleCheckout(rest.id, 'PROMOTION')}
																	className='w-full py-1.5 bg-black text-white text-[9px] font-mono uppercase font-bold cursor-pointer text-center'>
																	Aktywuj (+50 PLN/m)
																</button>
															)}
														</div>
														{/* Static Menu Plan */}
														<div className='border p-4 bg-stone-50 flex flex-col justify-between space-y-4'>
															<div>
																<h4 className='font-serif font-bold text-sm text-stone-900'>
																	Karta menu i Oferta stała
																</h4>
																<p className='text-[10px] text-stone-500 mt-0.5'>
																	Zezwala na dodawanie stałego menu oraz fallbacku na stałą ofertę dnia.
																</p>
															</div>
															{hasStaticMenu ? (
																<div className='px-3 py-1.5 border border-dashed border-stone-200 text-[10px] font-mono uppercase text-stone-400 text-center font-bold'>
																	Włączony (Aktywny)
																</div>
															) : (
																<button
																	onClick={() => handleCheckout(rest.id, 'STATIC_MENU')}
																	className='w-full py-1.5 bg-black text-white text-[9px] font-mono uppercase font-bold cursor-pointer text-center'>
																	Aktywuj (+50 PLN/m)
																</button>
															)}
														</div>
													</div>
												)}
											</div>
										)
									})}
								</div>
							)}
						</section>
					)}

					{isOwner && activeTab === 'payments' && (
						<section className='space-y-6 text-left animate-fade-in'>
							<h2 className='text-xl font-bold font-serif text-stone-900 border-b border-stone-100 pb-2'>
								Historia płatności
							</h2>
							{payments.length === 0 ? (
								<div className='py-12 border border-dashed text-center bg-stone-50 p-6 mt-4'>
									<p className='text-stone-500 text-sm'>Brak historii płatności na tym koncie.</p>
								</div>
							) : (
								<div className='overflow-x-auto border border-stone-200 mt-4'>
									<table className='min-w-full divide-y divide-stone-200 bg-white font-mono text-xs text-stone-800'>
										<thead className='bg-stone-50'>
											<tr>
												<th className='px-6 py-3 text-left'>ID Płatności</th>
												<th className='px-6 py-3 text-left'>Data</th>
												<th className='px-6 py-3 text-left'>Kwota</th>
												<th className='px-6 py-3 text-left'>Status</th>
											</tr>
										</thead>
										<tbody className='divide-y divide-stone-200'>
											{payments.map(p => (
												<tr key={p.id}>
													<td className='px-6 py-4 text-left text-stone-500'>{p.id.split('-')[0]}...</td>
													<td className='px-6 py-4 text-left'>{new Date(p.createdAt).toLocaleDateString('pl-PL')}</td>
													<td className='px-6 py-4 text-left font-bold'>
														{p.amount} {p.currency}
													</td>
													<td className='px-6 py-4 text-left'>
														<span className='px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold'>
															{p.status}
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

					{user?.role === 'USER' && activeTab === 'user-favorites' && (
						<section className='space-y-6 text-left'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>
									Ulubione Restauracje ({userFavorites.length})
								</h2>
								<button
									onClick={loadUserFavorites}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loadingFavorites ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : userFavorites.length === 0 ? (
								<div className='py-16 border border-dashed text-center bg-stone-50 p-6'>
									<Heart className='w-10 h-10 text-stone-300 mx-auto mb-3' />
									<p className='text-stone-500 text-sm'>Nie dodałeś jeszcze żadnego lokalu do ulubionych.</p>
								</div>
							) : (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									{userFavorites.map(f => (
										<div
											key={f.id}
											className='border p-5 bg-white flex justify-between items-center gap-4 hover:border-black shadow-sm'>
											<div className='space-y-1'>
												<Link to={`/restaurants/${f.slug}`}>
													<h4 className='font-serif font-bold text-stone-900 hover:underline'>{f.name}</h4>
												</Link>
												<p className='text-[10px] text-stone-500 font-mono'>
													{f.city}, {f.address}
												</p>
											</div>
											<Link
												to={`/restaurants/${f.slug}`}
												className='px-3 py-1.5 bg-black text-white hover:bg-stone-900 font-mono text-[9px] uppercase tracking-wider font-bold shrink-0'>
												Menu dnia →
											</Link>
										</div>
									))}
								</div>
							)}
						</section>
					)}

					{user?.role === 'USER' && activeTab === 'user-reviews' && (
						<section className='space-y-6 text-left'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>
									Wystawione opinie ({userReviews.length})
								</h2>
								<button
									onClick={loadUserReviews}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> Odśwież
								</button>
							</div>
							{loadingUserReviews ? (
								<p className='text-stone-400 text-xs font-mono'>Ładowanie...</p>
							) : userReviews.length === 0 ? (
								<div className='py-16 border border-dashed text-center bg-stone-50 p-6'>
									<MessageSquare className='w-10 h-10 text-stone-300 mx-auto mb-3' />
									<p className='text-stone-500 text-sm'>Nie wystawiłeś jeszcze żadnej opinii.</p>
								</div>
							) : (
								<div className='grid grid-cols-1 gap-4'>
									{userReviews.map(review => (
										<div key={review.id} className='border p-5 bg-white space-y-3 shadow-sm'>
											<div className='flex items-center justify-between border-b pb-2'>
												<Link to={`/restaurants/${review.restaurant?.slug}`}>
													<h4 className='font-serif font-bold text-stone-900 hover:underline'>
														{review.restaurant?.name}
													</h4>
												</Link>
												<span className='flex items-center bg-stone-100 px-2 py-0.5 font-bold font-mono text-stone-900'>
													<Star className='w-3 h-3 fill-black mr-1' />
													{review.rating} / 5
												</span>
											</div>
											<p className='text-xs text-stone-600 italic leading-relaxed'>„{review.comment}”</p>
											<div className='text-[10px] text-stone-400 font-mono'>
												Wystawiono: {new Date(review.createdAt).toLocaleDateString('pl-PL')}
											</div>
										</div>
									))}
								</div>
							)}
						</section>
					)}

					{user && (user.role === 'USER' || user.role === 'OWNER') && activeTab === 'user-settings' && (
						<section className='max-w-2xl mx-auto space-y-8 text-left bg-white border border-stone-200 p-6 md:p-8 shadow-sm animate-scale-up'>
							<div className='border-b border-stone-100 pb-4'>
								<h2 className='text-xl font-bold font-serif text-stone-900 flex items-center gap-1.5'>
									<Settings className='w-5 h-5 text-stone-800' />
									Ustawienia profilu
								</h2>
								<p className='text-stone-500 text-xs mt-1'>
									Zarządzaj swoimi danymi osobowymi oraz adresem rozliczeniowym/zamieszkania.
								</p>
							</div>
							<form onSubmit={handleUpdateProfile} className='space-y-4 font-sans text-sm'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div className='space-y-1.5'>
										<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
											Adres E-mail
										</label>
										<div className='relative'>
											<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
											<input
												type='email'
												value={user.email}
												className='w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-stone-400 font-mono outline-none'
												readOnly
											/>
										</div>
									</div>
									<div className='space-y-1.5'>
										<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
											Rola w systemie
										</label>
										<div className='relative'>
											<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
											<input
												type='text'
												value={user.role === 'OWNER' ? 'Restaurator / Właściciel' : 'Smakosz / USER'}
												className='w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-stone-400 font-mono outline-none'
												readOnly
											/>
										</div>
									</div>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										Twoje imię / Etykieta
									</label>
									<div className='relative'>
										<UserIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='text'
											value={profileName}
											onChange={e => setProfileName(e.target.value)}
											placeholder='Jan Kowalski'
											className='w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
											required
										/>
									</div>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										Twoja Miejscowość zamieszkania
									</label>
									<div className='relative'>
										<MapPin className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='text'
											value={profileCity}
											onChange={e => setProfileCity(e.target.value)}
											placeholder='np. Łódź'
											className='w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
										/>
									</div>
								</div>
								<button
									type='submit'
									disabled={updatingProfile}
									className='px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50'>
									{updatingProfile ? 'Zapisywanie...' : 'Zaktualizuj dane'}
								</button>
							</form>
							<div className='pt-8 border-t border-stone-200 space-y-4'>
								<h3 className='text-sm font-bold font-mono text-red-700 uppercase flex items-center gap-1.5'>
									<AlertTriangle className='w-4 h-4' />
									Strefa Niebezpieczna
								</h3>
								<p className='text-stone-500 text-xs leading-relaxed'>
									{user.role === 'OWNER'
										? 'Usunięcie konta restauracji natychmiast zawiesi Twoje lokale i anuluje subskrypcje na 3-miesięczny okres karencji.'
										: 'Usunięcie konta jest nieodwracalne i skasuje profil oraz recenzje.'}
								</p>
								<button
									onClick={handleDeleteAccount}
									className='px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-mono text-xs uppercase tracking-wider font-bold cursor-pointer'>
									Usuń konto bezpowrotnie
								</button>
							</div>
						</section>
					)}
				</>
			) : (
				<div className='grid grid-cols-1 lg:grid-cols-12 gap-12 items-start text-left'>
					<section className='lg:col-span-7 space-y-6'>{renderGuideCarousel()}</section>
					<section className='lg:col-span-5 bg-white border border-stone-200 p-8 text-center space-y-6 shadow-sm'>
						<div className='w-12 h-12 bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center font-serif text-lg font-bold mx-auto'>
							!
						</div>
						<div className='space-y-2'>
							<h3 className='text-xl font-bold font-serif text-stone-900'>Dołącz do nas</h3>
							<p className='text-stone-500 text-sm font-sans text-center leading-relaxed'>
								Zgłoś swój lokal, śledź odwiedziny, dodawaj menu i zyskaj darmowych klientów już dziś!
							</p>
						</div>
						<div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
							<Link
								to='/login'
								className='w-full sm:w-auto px-6 py-2.5 border border-black text-stone-900 font-mono text-xs uppercase tracking-widest font-bold text-center cursor-pointer'>
								Zaloguj się
							</Link>
							<Link
								to='/register'
								className='w-full sm:w-auto px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest font-bold text-center cursor-pointer'>
								Rejestracja
							</Link>
						</div>
					</section>
				</div>
			)}

			{/* Bottom Carousel Guide for Owners */}
			{isOwner && (
				<section className='max-w-4xl mx-auto pt-10 border-t border-stone-200 space-y-6'>
					<h2 className='text-xl font-bold font-serif text-stone-900 text-center'>
						Konfiguracja i Automatyczne Pobieranie
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
					Napisz bezpośrednio na adres:{' '}
					<a href='mailto:app.bistromapa@gmail.com' className='font-mono font-bold text-black hover:underline'>
						app.bistromapa@gmail.com
					</a>
				</p>
			</section>
		</main>
	)
}
