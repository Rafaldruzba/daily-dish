'use client'

import { useTranslations } from 'next-intl'

import { useState, useEffect, Suspense, type FormEvent } from 'react'
import { Link } from '@/lib/navigation'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

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
	Building2,
	X,
	Bolt,
} from 'lucide-react'
import { Payment, Restaurant, RestaurantForm } from '@/lib/types'
import { parseCuisinesInput } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'
import { trackEvent } from '@/lib/analytics'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'
const INITIAL_FORM_STATE: RestaurantForm = {
	name: '',
	slug: '',
	phone: '',
	address: '',
	city: '',
	facebookUrl: '',
	rating: 5,
	cuisines: '',
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

/**
 * Mapuje parametr ?tab= z URL na aktywny widok. URL jest jedynym \u017ar\u00f3d\u0142em prawdy \u2014
 * brak ?tab oznacza domy\u015blny widok dla danej roli.
 */
function resolveActiveTab(role: string | undefined, tab: string | null): string {
	if (role === 'ADMIN') {
		if (tab === 'approved') return 'admin-approved'
		if (tab === 'payments') return 'admin-payments'
		if (tab === 'reports') return 'admin-reports'
		if (tab === 'logs') return 'admin-logs'
		if (tab === 'removal') return 'admin-removal'
		return 'admin-pending'
	}

	if (role === 'OWNER') {
		if (tab === 'new') return 'new'
		if (tab === 'subscriptions') return 'subscriptions'
		if (tab === 'payments') return 'payments'
		if (tab === 'settings') return 'user-settings'
		return 'stats'
	}

	if (tab === 'reviews') return 'user-reviews'
	if (tab === 'settings') return 'user-settings'
	return 'user-favorites'
}

function ForRestaurantsContent() {
	const t = useTranslations('For-restaurants')
	const { user, token } = useAuth()
	const router = useRouter()
	const pathname = usePathname()
	const isAdmin = user?.role === 'ADMIN'
	const isOwner = user?.role === 'OWNER'

	const searchParams = useSearchParams()

	// Aktywny tab wynika wprost z URL — wcześniej równoległy stan useState i URL mogły się
	// rozjechać, a nieznany parametr (np. ?tab=subscriptions przy mapowaniu na 'sub')
	// po cichu spadał do widoku domyślnego, czyli statystyk.
	const activeTab = resolveActiveTab(user?.role, searchParams.get('tab'))

	const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([])
	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [form, setForm] = useState<RestaurantForm>(INITIAL_FORM_STATE)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [scraperLoading, setScraperLoading] = useState(false)

	const [deleteModal, setDeleteModal] = useState<{
		isOpen: boolean
		type: 'admin_restaurant' | 'owner_restaurant' | 'account'
		targetId: string
		targetName: string
		expectedPhrase: string
		typedPhrase: string
		digitsCode: string
	}>({
		isOpen: false,
		type: 'account',
		targetId: '',
		targetName: '',
		expectedPhrase: '',
		typedPhrase: '',
		digitsCode: '',
	})

	const openAdminRestaurantDelete = (id: string) => {
		const name = restaurants.find(r => r.id === id)?.name || 'Restauracja'
		const code = Math.floor(100000 + Math.random() * 900000).toString()
		setDeleteModal({
			isOpen: true,
			type: 'admin_restaurant',
			targetId: id,
			targetName: name,
			expectedPhrase: `${name} ${code}`,
			typedPhrase: '',
			digitsCode: code,
		})
	}

	const openOwnerRestaurantDelete = (id: string, name: string) => {
		const code = Math.floor(100000 + Math.random() * 900000).toString()
		setDeleteModal({
			isOpen: true,
			type: 'owner_restaurant',
			targetId: id,
			targetName: name,
			expectedPhrase: `${name} ${code}`,
			typedPhrase: '',
			digitsCode: code,
		})
	}

	const openAccountDelete = () => {
		const name = user?.email || user?.name || 'Konto'
		const code = Math.floor(100000 + Math.random() * 900000).toString()
		setDeleteModal({
			isOpen: true,
			type: 'account',
			targetId: 'me',
			targetName: name,
			expectedPhrase: `${name} ${code}`,
			typedPhrase: '',
			digitsCode: code,
		})
	}

	const handleConfirmDelete = async () => {
		if (deleteModal.typedPhrase.trim() !== deleteModal.expectedPhrase.trim()) return

		const { type, targetId } = deleteModal
		setDeleteModal(prev => ({ ...prev, isOpen: false }))

		try {
			if (type === 'admin_restaurant') {
				if (!token || !isAdmin) return
				setError('')
				const response = await fetch(`${API_URL}/restaurants/${targetId}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				})
				if (response.ok) {
					setRestaurants(prev => prev.filter(item => item.id !== targetId))
					setSuccess(t('delete-success'))
				} else {
					setError(t('delete-error'))
				}
			} else if (type === 'owner_restaurant') {
				if (!token) return
				setLoading(true)
				setError('')
				setSuccess('')
				const response = await fetch(`${API_URL}/restaurants/${targetId}`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				})
				const data = await response.json()
				if (response.ok && data.success) {
					setSuccess(data.message || t('delete-message'))
					loadOwnedRestaurants()
				} else {
					setError(data.message || t('delete-error'))
				}
			} else if (type === 'account') {
				if (!token) return
				setLoading(true)
				const res = await fetch(`${API_URL}/auth/me`, {
					method: 'DELETE',
					headers: { Authorization: `Bearer ${token}` },
				})
				if (res.ok) {
					localStorage.removeItem('dd_token')
					window.location.href = '/'
				} else {
					setError(t('delete-acc-error'))
				}
			}
		} catch (err) {
			console.error(err)
			setError(t('delete-error2'))
		} finally {
			if (type !== 'account') {
				setLoading(false)
			}
		}
	}

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
	const [profileNip, setProfileNip] = useState(user?.nip || '')

	const existingNip = user?.ownershipDeclaration?.nip || user?.nip || null

	const isNipLocked = Boolean(existingNip)

	const [updatingProfile, setUpdatingProfile] = useState(false)

	const [adminRemovalUsers, setAdminRemovalUsers] = useState<any[]>([])
	const [loadingRemovalUsers, setLoadingRemovalUsers] = useState(false)

	const [activeStep, setActiveStep] = useState(0)
	const steps = [
		{
			title: t('title1'),
			desc: t('desc1'),
		},
		{
			title: t('title2'),
			desc: t('desc2'),
		},
		{
			title: t('title3'),
			desc: t('desc3'),
		},
		{
			title: t('title4'),
			desc: t('desc4'),
		},
	]

	const updateField = (field: keyof RestaurantForm, value: string | number) => {
		setForm((prev: any) => ({ ...prev, [field]: value }))
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
							{t('back')}
						</button>
						<button
							disabled={activeStep === steps.length - 1}
							onClick={() => setActiveStep(p => Math.min(p + 1, steps.length - 1))}
							className='px-2 py-1 bg-black text-white hover:bg-stone-900 cursor-pointer'>
							{t('next')}
						</button>
					</div>
				</div>
			</div>
		)
	}

	// searchParams zamiast window.location — bez tego komponent wywala się przy renderowaniu na serwerze
	const successParam = searchParams.get('success')
	const cancelParam = searchParams.get('cancel')

	useEffect(() => {
		if (user) {
			setProfileName(user.name || '')
			setProfileCity(user.city || '')
			setProfileNip(user.nip || '')
		}
	}, [user, existingNip])

	useEffect(() => {
		if (successParam) {
			setSuccess(t('payment-success'))
			if (typeof window !== 'undefined') {
				window.history.replaceState({}, document.title, window.location.pathname)
			}
		}
		if (cancelParam) {
			setError(t('payment-cancelled'))
			if (typeof window !== 'undefined') {
				window.history.replaceState({}, document.title, window.location.pathname)
			}
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
			if (!res.ok) throw new Error(data.message || t('payment-error'))
			if (data.url) window.location.href = data.url
		} catch (err: any) {
			setError(err.message || t('stripe-error'))
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
			setSuccess(`${t('status-set')} ${status === 'APPROVED' ? t('status-approved') : t('status-declined')}`)
			loadAdminRestaurants()
		} catch (err) {
			setError(t('status-error'))
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
				setSuccess(
					`${t('scraping')} „${updated.name}” ${t('scraping2')} ${updated.isActive ? t('scraping-resumed') : t('scraping-stopped')}.`,
				)
			}
		} catch (err) {
			setError(t('scraping-error'))
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

	const loadAdminRemovalUsers = async () => {
		if (!token) return
		try {
			setLoadingRemovalUsers(true)
			const res = await fetch(`${API_URL}/auth/admin/removal-users`, {
				headers: { Authorization: `Bearer ${token}` },
			})
			if (res.ok) {
				const data = await res.json()
				setAdminRemovalUsers(data.users || [])
			}
		} catch (err) {
			console.error(err)
		} finally {
			setLoadingRemovalUsers(false)
		}
	}

	const handleTriggerScrape = async () => {
		if (!token || !isAdmin) return
		setScraperLoading(true)
		setError('')
		setSuccess('')
		try {
			const res = await fetch(`${API_URL}/dishes/admin/fetch-now`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await res.json()
			if (res.ok) {
				setSuccess(data.message || t('scraping-finished'))
			} else {
				setError(data.message || t('scraping-finished-error'))
			}
		} catch (err) {
			console.error(err)
			setError(t('server-error'))
		} finally {
			setScraperLoading(false)
		}
	}

	const handleRestoreRemovalUser = async (userId: string) => {
		if (!token) return
		if (!window.confirm(t('question'))) return
		try {
			setLoading(true)
			setError('')
			setSuccess('')
			const res = await fetch(`${API_URL}/auth/admin/restore-user/${userId}`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${token}` },
			})
			const data = await res.json()
			if (res.ok && data.success) {
				setSuccess(data.message || t('restore-success'))
				loadAdminRemovalUsers()
			} else {
				setError(data.message || t('restore-error'))
			}
		} catch (err) {
			console.error(err)
			setError(t('server-error'))
		} finally {
			setLoading(false)
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
		if (action === 'DELETE' && !window.confirm(t('question2'))) return
		try {
			setUpdatingReport(true)
			const res = await fetch(`${API_URL}/reports/admin/comments/${reportId}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ action }),
			})
			if (res.ok) {
				setSuccess(action === 'APPROVE' ? t('approve-comment') : t('delete-comment'))
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
				setSuccess(t('resolve-restaurant-report'))
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
		if (action === 'BLOCK' && !window.confirm(t('question3'))) return
		try {
			setLoading(true)
			const res = await fetch(`${API_URL}/restaurants/admin/${restaurantId}/subscription`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ action }),
			})
			if (res.ok) {
				setSuccess(t('subscription-plan-updated'))
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
				body: JSON.stringify({ name: profileName, city: profileCity, nip: isNipLocked ? undefined : profileNip }),
			})
			const data = await res.json()
			if (res.ok) {
				setSuccess(t('profile-updated'))
				setTimeout(() => window.location.reload(), 1000)
			} else {
				setError(data.message || t('profile-update-error'))
			}
		} catch (err) {
			console.error(err)
		} finally {
			setUpdatingProfile(false)
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
		setForm((prev: any) => ({ ...prev, name: value, slug: generateSlug(value) }))
	}

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault()
		if (!token) return
		try {
			const response = await fetch(`${API_URL}/restaurants`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
				body: JSON.stringify({ ...form, cuisines: parseCuisinesInput(form.cuisines) }),
			})
			const data = await response.json()
			if (!response.ok) throw new Error(data.message || 'Błąd.')
			setSuccess(`${t('candidature')} ${data.name}`)
			trackEvent('save_restaurant', {
				restaurant_id: 'not available',
				restaurant_name: form.name,
			})
			setForm(INITIAL_FORM_STATE)
			loadOwnedRestaurants()
		} catch (err: any) {
			setError(err.message || t('add-error'))
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
								{t('approve')}
							</button>
							<button
								onClick={() => handleStatusApproval(restaurant.id, 'REJECTED')}
								className='px-3 py-2 border border-red-200 text-red-500 hover:border-red-600 transition-colors font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer'>
								{t('reject')}
							</button>
						</>
					) : (
						<>
							<button
								onClick={() => toggleRestaurantStatus(restaurant)}
								className='p-2 border border-stone-200 hover:border-black text-stone-700 transition-colors font-mono text-[10px] uppercase tracking-wider cursor-pointer'>
								{restaurant.isActive ? t('pause') : t('resume')}
							</button>
							<button
								onClick={() => openAdminRestaurantDelete(restaurant.id)}
								className='p-2 border border-stone-200 hover:border-red-600 text-stone-500 hover:text-red-600 transition-colors font-mono text-[10px] uppercase tracking-wider cursor-pointer'>
								{t('delete')}
							</button>
						</>
					)}
					<Link
						href={`/restaurant/${restaurant.slug}`}
						className='px-3 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors font-mono text-[10px] uppercase tracking-wider font-bold cursor-pointer'>
						{t('view-profile')}
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
						{isAdmin ? t('admin-panel') : isOwner ? t('owner-panel') : user ? t('user-profile') : t('dedicated-panel')}
					</span>
					<h1 className='text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1'>
						{isAdmin
							? t('admin-panel-title')
							: isOwner
								? t('owner-panel-title')
								: user
									? t('user-profile-title')
									: t('dedicated-panel-title')}
					</h1>
					<p className='text-stone-500 text-sm md:text-base mt-2'>
						{isAdmin
							? t('admin-panel-description')
							: isOwner
								? t('owner-panel-description')
								: user
									? t('user-profile-description')
									: t('dedicated-panel-description')}
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
										onClick={() => router.push(pathname, { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-pending' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('pending-applications')} ({restaurants.filter(r => r.status === 'PENDING').length})
									</button>
									<button
										onClick={() => router.push('?tab=approved', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-approved' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('approved-applications')} (
										{restaurants.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE').length})
									</button>
									<button
										onClick={() => router.push('?tab=payments', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-payments' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('payments')}
									</button>
									<button
										onClick={() => router.push('?tab=reports', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-reports' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('moderation-reports')}
									</button>
									<button
										onClick={() => router.push('?tab=logs', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-logs' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('system-logs')}
									</button>
									<button
										onClick={() => router.push('?tab=removal', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'admin-removal' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('removal-requests')}
									</button>
								</>
							) : isOwner ? (
								<>
									<button
										onClick={() => router.push(pathname, { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'stats' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('locals-stats')}
									</button>
									<button
										onClick={() => router.push('?tab=new', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'new' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('report-new-restaurant')}
									</button>
									<button
										onClick={() => router.push('?tab=subscriptions', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'subscriptions' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('subscriptions')}
									</button>
									<button
										onClick={() => router.push('?tab=payments', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'payments' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('payments-history')}
									</button>
									<button
										onClick={() => router.push('?tab=settings', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-settings' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('account-settings')}
									</button>
								</>
							) : (
								<>
									<button
										onClick={() => router.push('?tab=favorites', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-favorites' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('fav-locals')}
									</button>
									<button
										onClick={() => router.push('?tab=reviews', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-reviews' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('my-reviews')}
									</button>
									<button
										onClick={() => router.push('?tab=settings', { scroll: false })}
										className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'user-settings' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
										{t('account-settings')}
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
									{t('pending-candidate')} ({restaurants.filter(r => r.status === 'PENDING').length})
								</h2>
								<button
									onClick={loadAdminRestaurants}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : restaurants.filter(r => r.status === 'PENDING').length === 0 ? (
								<p className='text-stone-400 text-xs font-mono italic'>{t('no-pending-reports')}</p>
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
									{t('approved-restaurants')} (
									{restaurants.filter(r => r.status === 'APPROVED' || r.status === 'ACTIVE').length})
								</h2>
								<div className='flex items-center gap-2'>
									<button
										onClick={handleTriggerScrape}
										disabled={scraperLoading}
										className='px-3 py-1.5 bg-black text-white hover:bg-stone-800 disabled:opacity-50 transition-colors font-mono text-[10px] uppercase tracking-wider font-bold flex items-center gap-1 cursor-pointer shadow-sm'>
										<Bolt className='w-3 h-3' /> {scraperLoading ? t('scraping-dot') : t('scrap-now')}
									</button>
									<button
										onClick={loadAdminRestaurants}
										className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
										<RefreshCw className='w-3 h-3' /> {t('refresh-scraper')}
									</button>
								</div>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
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
														{t('owner')}{' '}
														<strong>
															{r.user?.name || 'N/A'} ({r.user?.email || 'N/A'})
														</strong>
													</p>
													<p className='text-stone-500 font-mono'>
														{t('plan')} <strong>{r.subscription?.plan || 'Brak'}</strong>
													</p>
												</div>
												<div className='flex flex-wrap gap-2'>
													<button
														onClick={e => handleAdminSubscriptionUpdate(e, r.id, 'EXTEND_TRIAL')}
														className='px-2.5 py-1.5 border border-stone-200 font-mono text-[9px] uppercase font-bold bg-white text-stone-900 cursor-pointer'>
														{t('extend-trial')}
													</button>
													<button
														onClick={e => handleAdminSubscriptionUpdate(e, r.id, 'ACTIVATE_BASE')}
														className='px-2.5 py-1.5 border border-black font-mono text-[9px] uppercase font-bold bg-black text-white cursor-pointer'>
														{t('base-plan')}
													</button>
													<button
														onClick={e => handleAdminSubscriptionUpdate(e, r.id, 'BLOCK')}
														className='px-2.5 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 font-mono text-[9px] uppercase font-bold cursor-pointer'>
														{t('block')}
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
									{t('all-payments')} ({adminPayments.length})
								</h2>
								<button
									onClick={loadAdminPayments}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono cursor-pointer'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loadingPayments ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : adminPayments.length === 0 ? (
								<p className='text-stone-500 text-xs'>{t('no-payments')}</p>
							) : (
								<div className='overflow-x-auto border border-stone-200'>
									<table className='min-w-full bg-white text-xs font-mono divide-y divide-stone-200'>
										<thead className='bg-stone-50'>
											<tr>
												<th className='px-6 py-3 text-left'>{t('tr-th1')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th2')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th3')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th4')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th5')}</th>
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
								<h2 className='text-xl font-bold font-serif text-stone-900'>{t('moderation-reports')}</h2>
								<button
									onClick={loadModerationReports}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono cursor-pointer'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loadingReports ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : (
								<div className='space-y-6'>
									<div className='space-y-3'>
										<h3 className='text-base font-bold font-serif text-stone-900 flex items-center gap-1.5'>
											<MessageSquare className='w-4 h-4' />
											{t('reported-comments')} ({commentReports.length})
										</h3>
										{commentReports.length === 0 ? (
											<p className='text-stone-500 text-xs italic p-4 border border-dashed'>
												{t('no-reported-comments')}
											</p>
										) : (
											<div className='space-y-3'>
												{commentReports.map(cr => (
													<div key={cr.id} className='border p-4 bg-white text-xs space-y-2'>
														<p>
															{t('reported-by')}: <strong>{cr.user?.name}</strong> • {t('reason')}:
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
																{t('restore')}
															</button>
															<button
																onClick={() => handleResolveCommentReport(cr.id, 'DELETE')}
																disabled={updatingReport}
																className='px-2 py-1 border border-red-200 text-red-500 text-[10px] font-mono cursor-pointer bg-red-50 disabled:opacity-50'>
																{t('delete-comment2')}
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
											{t('restaurant-reports')} ({restaurantReports.length})
										</h3>
										{restaurantReports.length === 0 ? (
											<p className='text-stone-500 text-xs italic p-4 border border-dashed'>
												{t('no-restaurant-reports')}
											</p>
										) : (
											<div className='space-y-3'>
												{restaurantReports.map(rr => (
													<div key={rr.id} className='border p-4 bg-white text-xs space-y-2'>
														<h4 className='font-bold'>
															{rr.restaurant?.name} ({rr.restaurant?.city})
														</h4>
														<p className='text-stone-600'>
															<strong>{t('report')}</strong> {rr.details} ({t('reason')} {rr.reason})
														</p>
														<div className='flex justify-between items-center text-[10px] text-stone-400 font-mono'>
															<span>
																{t('report-guy')} {rr.user?.name}
															</span>
															<button
																onClick={() => handleResolveRestaurantReport(rr.id)}
																disabled={updatingReport}
																className='px-2 py-1 border cursor-pointer bg-white disabled:opacity-50'>
																{t('resolved')}
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
								<h2 className='text-xl font-bold font-serif text-stone-900'>
									{t('system-logs')} ({adminLogs.length})
								</h2>
								<button
									onClick={loadAdminLogs}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono cursor-pointer'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loadingLogs ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : adminLogs.length === 0 ? (
								<p className='text-stone-500 text-xs'>{t('no-logs')}</p>
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

					{isAdmin && activeTab === 'admin-removal' && (
						<section className='space-y-6 text-left animate-fade-in'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900'>
									{t('account-in-removal')} ({adminRemovalUsers.length})
								</h2>
								<button
									onClick={loadAdminRemovalUsers}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white shadow-xs'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							<p className='text-stone-500 text-xs mt-1 leading-relaxed max-w-4xl'>
								{t('account-in-removal-description')}
							</p>

							{loadingRemovalUsers ? (
								<div className='py-12 text-center border border-dashed border-stone-200 bg-stone-50'>
									<RefreshCw className='w-6 h-6 text-stone-300 animate-spin mx-auto mb-2' />
									<p className='font-mono text-[10px] uppercase text-stone-400'>{t('loading-removal-acc')}</p>
								</div>
							) : adminRemovalUsers.length === 0 ? (
								<p className='text-stone-400 text-xs font-mono italic p-12 border border-dashed text-center bg-stone-50'>
									{t('no-removal-accounts')}
								</p>
							) : (
								<div className='space-y-4'>
									{adminRemovalUsers.map(u => (
										<div
											key={u.id}
											className='border border-stone-200 p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm text-xs'>
											<div className='space-y-2.5 flex-grow text-left'>
												<h3 className='text-base font-bold font-serif text-stone-900'>
													{u.name || 'Właściciel bez nazwy'} ({u.email})
												</h3>
												<p className='text-stone-500 font-mono text-[10px] uppercase tracking-wider font-bold'>
													{t('related-removal-accounts')}
												</p>
												<ul className='list-disc pl-4 font-sans text-stone-600 space-y-1'>
													{u.restaurants?.map((r: any) => {
														const daysLeft = r.removalRequestedAt
															? getDaysLeft(
																	new Date(
																		new Date(r.removalRequestedAt).setMonth(
																			new Date(r.removalRequestedAt).getMonth() + 3,
																		),
																	).toISOString(),
																)
															: 90
														return (
															<li key={r.id}>
																<strong>{r.name}</strong> ({r.city}) — {t('remaining')}{' '}
																<strong className='text-red-600 font-mono'>
																	{daysLeft} {t('days')}
																</strong>{' '}
																{t('grace-period')}
															</li>
														)
													})}
												</ul>
											</div>
											<div className='flex flex-wrap gap-2 shrink-0'>
												<button
													onClick={() => handleRestoreRemovalUser(u.id)}
													className='px-3.5 py-2.5 bg-black hover:bg-stone-900 text-white font-mono text-[10px] uppercase font-bold tracking-widest cursor-pointer transition-colors shadow-sm'>
													{t('restore-period-account')}
												</button>
											</div>
										</div>
									))}
								</div>
							)}
						</section>
					)}

					{isOwner && activeTab === 'stats' && (
						<section className='space-y-6'>
							<div className='flex justify-between items-center'>
								<h2 className='text-xl font-bold font-serif text-stone-900 text-left'>{t('your-stats-and-locals')}</h2>
								<button
									onClick={loadOwnedRestaurants}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : ownedRestaurants.length === 0 ? (
								<p className='text-stone-500 text-xs p-12 border border-dashed text-center bg-stone-50'>
									{t('any-assigned-restaurants')}
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
													<Link href={`/restaurant/${rest.slug}`}>
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
														{t('visits')}
													</span>
													<span className='block font-serif text-2xl font-black text-stone-900'>{rest.views || 0}</span>
												</div>
											</div>
											<div className='pt-4 border-t flex justify-between items-center text-xs font-mono'>
												<div className='flex flex-col gap-1'>
													<span className='text-stone-500'>
														{t('robot')}{' '}
														<strong className={rest.isActive ? 'text-green-700' : 'text-red-500'}>
															{rest.isActive ? t('active') : t('suspended')}
														</strong>
													</span>
													<span className='text-stone-500'>
														{t('plan')}{' '}
														<strong className='text-stone-900'>{rest.subscription?.plan || 'Free Trial'}</strong>
													</span>
													<span className='text-stone-500'>
														{t('expiration-date')}{' '}
														<strong className='text-stone-900'>
															{rest.subscription?.currentPeriodEnd
																? dateFormatter.format(new Date(rest.subscription.currentPeriodEnd))
																: t('unknown-date')}
														</strong>
													</span>
												</div>
												<button
													onClick={() => openOwnerRestaurantDelete(rest.id, rest.name)}
													className='px-2.5 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 transition-all text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer shadow-sm'
													title='Usuń restaurację bezpowrotnie'>
													<Trash2 className='w-3.5 h-3.5' /> {t('delete-local')}
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
								<h2 className='text-xl font-bold font-serif text-stone-900'>{t('report-new-restaurant')}</h2>
							</div>
							<form onSubmit={handleSubmit} className='space-y-4 font-sans text-xs'>
								<div className='space-y-1.5'>
									<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
										{t('local-name')}
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
											{t('local-city')}
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
											{t('local-address')}
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
										{t('local-facebook-url')}
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
										{t('types-of-cuisine')}
									</label>
									<input
										type='text'
										value={form.cuisines}
										onChange={e => updateField('cuisines', e.target.value)}
										placeholder='np. pizza, kuchnia wloska'
										className='w-full px-4 py-2.5 bg-white border border-stone-200 outline-none text-sm'
									/>
									<p className='text-[9px] text-stone-400 font-mono'>{t('local-create-desc')}</p>
								</div>
								<div className='space-y-1.5'>
									<label className='text-[10px] font-mono text-stone-600 uppercase font-bold block'>
										{t('local-phone')}
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
										<strong>{t('create-info')}</strong> {t('create-info-desc')}
									</p>
								</div>
								<button
									type='submit'
									className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest font-bold cursor-pointer'>
									{t('submit-a-restaurant')}
								</button>
							</form>
						</section>
					)}

					{isOwner && activeTab === 'subscriptions' && (
						<section className='space-y-8 text-left'>
							<div>
								<h2 className='text-xl font-bold font-serif text-stone-900'>{t('abonaments-yr')}</h2>
								<p className='text-stone-500 text-xs mt-1'>{t('abonaments-yr-desc')}</p>
							</div>
							{loading ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : ownedRestaurants.length === 0 ? (
								<p className='text-stone-500 text-xs p-6 border border-dashed bg-stone-50'>{t('submit-one')}</p>
							) : (
								<div className='space-y-6'>
									{ownedRestaurants.map(rest => {
										const trialDays =
											rest.subscription?.plan === 'FREE_TRIAL' ? getDaysLeft(rest.subscription.currentPeriodEnd) : 0
										const hasActiveBase = rest.subscriptions?.some(
											(s: any) => s.type === 'BASE' && s.status === 'ACTIVE',
										)
										const hasPromotion = rest.subscriptions?.some(
											(s: any) => s.type === 'PROMOTION' && s.status === 'ACTIVE',
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
															{t('pending-approval')}
														</span>
													) : (
														<div className='flex flex-wrap gap-2'>
															{hasActiveBase ? (
																<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-green-100 text-green-800 uppercase'>
																	{t('active-abo')}
																</span>
															) : trialDays > 0 ? (
																<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-blue-100 text-blue-800 uppercase'>
																	Free Trial ({trialDays} {t('days')})
																</span>
															) : (
																<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-red-100 text-red-800 uppercase'>
																	{t('abo-pause')}
																</span>
															)}
															<span className='px-2.5 py-1 text-[9px] font-mono font-bold bg-blue-100 text-blue-800'>
																{t('expiration-date')}
																{rest.subscription?.currentPeriodEnd
																	? ' ' + dateFormatter.format(new Date(rest.subscription.currentPeriodEnd))
																	: t('unknown-date')}
															</span>
														</div>
													)}
												</div>
												{rest.status !== 'PENDING' && (
													<div className='grid grid-cols-1 md:grid-cols-2 gap-6 pt-2'>
														{/* Base Plan */}
														<div className='border p-6 bg-stone-50 flex flex-col justify-between space-y-6 text-left shadow-xs'>
															<div className='space-y-3.5'>
																<h4 className='font-serif font-black text-stone-900 text-base flex items-center gap-1.5'>
																	<span>🍽️</span> {t('base-plan-price')}
																</h4>
																<p className='text-xs text-stone-500 leading-relaxed font-sans'>
																	{t('base-plan-price-desc')}
																</p>
																<ul className='text-xs text-stone-600 font-sans space-y-2 list-disc pl-4'>
																	<li>{t('base-plan-list1')}</li>
																	<li>{t('base-plan-list2')}</li>
																	<li>{t('base-plan-list3')}</li>
																	<li>{t('base-plan-list4')}</li>
																</ul>
															</div>
															{hasActiveBase ? (
																<div className='px-3 py-2 border border-dashed border-stone-200 text-xs font-mono uppercase text-stone-400 text-center font-bold bg-white'>
																	{t('active-plan')}
																</div>
															) : (
																<button
																	onClick={() => handleCheckout(rest.id, 'BASE')}
																	className='w-full py-2.5 bg-black hover:bg-stone-900 text-white text-xs font-mono uppercase tracking-widest font-bold cursor-pointer text-center transition-all shadow-sm'>
																	{t('activate')}
																</button>
															)}
														</div>

														{/* Promotion Plan */}
														<div className='border p-6 bg-stone-50 flex flex-col justify-between space-y-6 text-left shadow-xs'>
															<div className='space-y-3.5'>
																<h4 className='font-serif font-black text-stone-900 text-base flex items-center gap-1.5'>
																	<span>🚀</span> {t('promotion-plan')}
																</h4>
																<p className='text-xs text-stone-500 leading-relaxed font-sans'>
																	{t('promotion-plan-desc')}
																</p>
																<ul className='text-xs text-stone-600 font-sans space-y-2 list-disc pl-4'>
																	<li>{t('promotion-plan-list1')}</li>
																	<li>{t('promotion-plan-list2')}</li>
																</ul>
															</div>
															{hasPromotion ? (
																<div className='px-3 py-2 border border-dashed border-stone-200 text-xs font-mono uppercase text-stone-400 text-center font-bold bg-white'>
																	{t('active-plan')}
																</div>
															) : (
																<button
																	onClick={() => handleCheckout(rest.id, 'PROMOTION')}
																	className='w-full py-2.5 bg-black hover:bg-stone-900 text-white text-xs font-mono uppercase tracking-widest font-bold cursor-pointer text-center transition-all shadow-sm'>
																	{t('activate2')}
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
								{t('payments-history')}
							</h2>
							{payments.length === 0 ? (
								<div className='py-12 border border-dashed text-center bg-stone-50 p-6 mt-4'>
									<p className='text-stone-500 text-sm'>{t('payments-history-desc')}</p>
								</div>
							) : (
								<div className='overflow-x-auto border border-stone-200 mt-4'>
									<table className='min-w-full divide-y divide-stone-200 bg-white font-mono text-xs text-stone-800'>
										<thead className='bg-stone-50'>
											<tr>
												<th className='px-6 py-3 text-left'>{t('payment-id')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th2')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th3')}</th>
												<th className='px-6 py-3 text-left'>{t('tr-th5')}</th>
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
									{t('fav-restaurants')} ({userFavorites.length})
								</h2>
								<button
									onClick={loadUserFavorites}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loadingFavorites ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : userFavorites.length === 0 ? (
								<div className='py-16 border border-dashed text-center bg-stone-50 p-6'>
									<Heart className='w-10 h-10 text-stone-300 mx-auto mb-3' />
									<p className='text-stone-500 text-sm'>{t('fav-restaurants-desc')} </p>
								</div>
							) : (
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									{userFavorites.map(f => (
										<div
											key={f.id}
											className='border p-5 bg-white flex justify-between items-center gap-4 hover:border-black shadow-sm'>
											<div className='space-y-1'>
												<Link href={`/restaurant/${f.slug}`}>
													<h4 className='font-serif font-bold text-stone-900 hover:underline'>{f.name}</h4>
												</Link>
												<p className='text-[10px] text-stone-500 font-mono'>
													{f.city}, {f.address}
												</p>
											</div>
											<Link
												href={`/restaurant/${f.slug}`}
												className='px-3 py-1.5 bg-black text-white hover:bg-stone-900 font-mono text-[9px] uppercase tracking-wider font-bold shrink-0'>
												{t('daily-menu')}
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
									{t('reviews-posted')} ({userReviews.length})
								</h2>
								<button
									onClick={loadUserReviews}
									className='px-3 py-1.5 border border-stone-200 text-xs font-mono flex items-center gap-1 cursor-pointer bg-white'>
									<RefreshCw className='w-3 h-3' /> {t('refresh')}
								</button>
							</div>
							{loadingUserReviews ? (
								<p className='text-stone-400 text-xs font-mono'>{t('loading')}</p>
							) : userReviews.length === 0 ? (
								<div className='py-16 border border-dashed text-center bg-stone-50 p-6'>
									<MessageSquare className='w-10 h-10 text-stone-300 mx-auto mb-3' />
									<p className='text-stone-500 text-sm'>{t('reviews-info')}</p>
								</div>
							) : (
								<div className='grid grid-cols-1 gap-4'>
									{userReviews.map(review => (
										<div key={review.id} className='border p-5 bg-white space-y-3 shadow-sm'>
											<div className='flex items-center justify-between border-b pb-2'>
												<Link href={`/restaurant/${review.restaurant?.slug}`}>
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
									{t('profile-settings')}
								</h2>
								<p className='text-stone-500 text-xs mt-1'>{t('profile-settings-desc')}</p>
							</div>
							<form onSubmit={handleUpdateProfile} className='space-y-4 font-sans text-sm'>
								<div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
									<div className='space-y-1.5'>
										<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
											{t('email')}
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
											{t('role')}
										</label>
										<div className='relative'>
											<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
											<input
												type='text'
												value={user.role === 'OWNER' ? t('restaurateur') : t('user')}
												className='w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 text-stone-400 font-mono outline-none'
												readOnly
											/>
										</div>
									</div>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										{t('name-label')}
									</label>
									<div className='relative'>
										<UserIcon className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='text'
											value={profileName}
											onChange={e => setProfileName(e.target.value)}
											placeholder={t('name-label-placeholder')}
											className='w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
											required
										/>
									</div>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										{t('city-residence')}
									</label>
									<div className='relative'>
										<MapPin className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='text'
											value={profileCity}
											onChange={e => setProfileCity(e.target.value)}
											placeholder={t('city-residence-placeholder')}
											className='w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
										/>
									</div>
								</div>
								<div className='space-y-1.5'>
									<label className='text-xs uppercase tracking-wider font-mono font-bold text-stone-600 block'>
										{t('nip')} {isNipLocked ? t('nip-blocked') : t('nip-optional')}
									</label>
									<div className='relative'>
										<Building2 className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='text'
											value={profileNip}
											pattern='\d*'
											maxLength={10}
											disabled={isNipLocked}
											onChange={e => setProfileNip(e.target.value)}
											placeholder={existingNip || t('nip-placeholder')}
											className={`w-full pl-10 pr-4 py-2.5 border font-mono text-sm transition-colors focus:outline-none ${
												isNipLocked
													? 'bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed'
													: 'bg-white border-stone-200 text-stone-900 focus:border-black'
											}`}
										/>
									</div>
									{isNipLocked && <p className='text-xs text-stone-500 mt-1'>{t('nip-info')}</p>}
								</div>
								<button
									type='submit'
									disabled={updatingProfile}
									className='px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest font-bold transition-all cursor-pointer disabled:opacity-50'>
									{updatingProfile ? t('saving') : t('update')}
								</button>
							</form>
							<div className='pt-8 border-t border-stone-200 space-y-4'>
								<h3 className='text-sm font-bold font-mono text-red-700 uppercase flex items-center gap-1.5'>
									<AlertTriangle className='w-4 h-4' />
									{t('danger-zone')}
								</h3>
								<p className='text-stone-500 text-xs leading-relaxed'>
									{user.role === 'OWNER' ? t('danger-zone-info1') : t('danger-zone-info2')}
								</p>
								<button
									onClick={openAccountDelete}
									className='px-4 py-2 border border-red-200 text-red-600 hover:bg-red-50 font-mono text-xs uppercase tracking-wider font-bold cursor-pointer'>
									{t('danger-delete')}
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
							<h3 className='text-xl font-bold font-serif text-stone-900'>{t('join-us')}</h3>
							<p className='text-stone-500 text-sm font-sans text-center leading-relaxed'>{t('join-us-desc')}</p>
						</div>
						<div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
							<Link
								href='/login'
								className='w-full sm:w-auto px-6 py-2.5 border border-black text-stone-900 font-mono text-xs uppercase tracking-widest font-bold text-center cursor-pointer'>
								{t('login')}
							</Link>
							<Link
								href='/register'
								className='w-full sm:w-auto px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest font-bold text-center cursor-pointer'>
								{t('register')}
							</Link>
						</div>
					</section>
				</div>
			)}

			{/* Bottom Carousel Guide for Owners */}
			{isOwner && (
				<section className='max-w-4xl mx-auto pt-10 border-t border-stone-200 space-y-6'>
					<h2 className='text-xl font-bold font-serif text-stone-900 text-center'>{t('bottom-guide')}</h2>
					{renderGuideCarousel()}
				</section>
			)}

			{/* Support Block Banner */}
			<section className='bg-stone-50 border border-stone-200 p-6 md:p-8 text-center max-w-4xl mx-auto shadow-sm'>
				<div className='flex items-center justify-center gap-2 mb-2'>
					<Mail className='w-4 h-4 text-stone-600' />
					<h4 className='font-serif text-base font-bold text-stone-900'> {t('support')}</h4>
				</div>
				<p className='text-stone-500 text-xs md:text-sm'>
					Napisz bezpośrednio na adres:{' '}
					<a href={`mailto:${process.env.NEXT_PUBLIC_MAIL}`} className='font-mono font-bold text-black hover:underline'>
						{process.env.NEXT_PUBLIC_MAIL}
					</a>
				</p>
			</section>

			{/* --- DELETE CONFIRMATION MODAL --- */}
			{deleteModal.isOpen && (
				<div className='fixed inset-0 bg-black/40 flex items-center justify-center px-4 py-12 z-50 animate-fade-in'>
					<div className='bg-white border border-stone-200 w-full max-w-md p-6 md:p-8 shadow-xl space-y-6 text-left relative animate-scale-up rounded-none'>
						<button
							onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
							className='absolute right-4 top-4 p-1 text-stone-400 hover:text-black transition-colors cursor-pointer'>
							<X className='w-5 h-5' />
						</button>
						<div className='border-b border-stone-100 pb-3'>
							<h3 className='text-xl font-bold font-serif text-stone-900 flex items-center gap-1.5'>
								<AlertTriangle className='w-5 h-5 text-red-600 shrink-0' />
								{deleteModal.type === 'account' ? t('confirm-delete-acc') : t('confirm-delete-local')}
							</h3>
							<p className='text-stone-400 text-[10px] font-mono uppercase tracking-wider block mt-1'>
								{t('additional-confirmation')}
							</p>
						</div>

						<div className='space-y-4 font-sans text-xs'>
							<p className='text-stone-600 leading-relaxed'>
								{deleteModal.type === 'account'
									? user?.role === 'OWNER'
										? t('delete-warning1')
										: t('delete-warning2')
									: `„${deleteModal.targetName}” ${t('delete-warning3')}`}
							</p>

							<div className='bg-stone-50 border border-stone-200 p-3 select-all font-mono text-center text-xs font-bold text-stone-800 tracking-wider break-all'>
								{deleteModal.expectedPhrase}
							</div>

							<div className='space-y-1.5'>
								<label className='text-[10px] uppercase tracking-wider font-mono font-bold text-stone-600 block'>
									{t('verification-phrase')}
								</label>
								<input
									type='text'
									value={deleteModal.typedPhrase}
									onChange={e => setDeleteModal(prev => ({ ...prev, typedPhrase: e.target.value }))}
									placeholder={t('verification-phrase-placeholder')}
									className='w-full px-3 py-2 border border-stone-200 focus:outline-none focus:border-black font-mono text-xs bg-white animate-pulse'
								/>
							</div>

							<div className='flex gap-2 pt-2 font-mono text-[10px] uppercase tracking-wider font-bold'>
								<button
									type='button'
									onClick={() => setDeleteModal(prev => ({ ...prev, isOpen: false }))}
									className='flex-1 py-2.5 border border-stone-200 text-stone-600 hover:border-black hover:text-black transition-colors cursor-pointer text-center'>
									{t('cancel')}
								</button>
								<button
									type='button'
									disabled={deleteModal.typedPhrase.trim() !== deleteModal.expectedPhrase.trim()}
									onClick={handleConfirmDelete}
									className='flex-1 py-2.5 bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer text-center font-bold uppercase'>
									{t('delete-permanently')}
								</button>
							</div>
						</div>
					</div>
				</div>
			)}
		</main>
	)
}

// useSearchParams wymaga granicy Suspense przy prerenderowaniu statycznym
export default function ForRestaurantsPage() {
	return (
		<Suspense
			fallback={
				<main className='min-h-screen flex items-center justify-center'>
					<p className='font-mono text-xs uppercase tracking-widest text-stone-400'>Ładowanie...</p>
				</main>
			}>
			<ForRestaurantsContent />
		</Suspense>
	)
}
