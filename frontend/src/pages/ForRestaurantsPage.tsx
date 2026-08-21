import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle, BarChart2, CreditCard, Lock, RefreshCw, Mail, HelpCircle } from 'lucide-react'

interface Restaurant {
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
	trialEndsAt: string | null
	subscriptionEndsAt: string | null
}

interface RestaurantForm {
	name: string
	slug: string
	phone: string
	address: string
	city: string
	facebookUrl: string
	rating: number
}

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

	const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([])
	const [form, setForm] = useState<RestaurantForm>(INITIAL_FORM_STATE)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	// Payment simulation state
	const [checkoutId, setCheckoutId] = useState<string | null>(null)
	const [processingPayment, setProcessingPayment] = useState(false)

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
			loadOwnedRestaurants()
		} else {
			setLoading(false)
		}
	}, [token, isOwnerOrAdmin])

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
			setError('Nie udało się pobrać statystyk Twoich restauracji.')
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

			setSuccess(`Kandydatura restauracji „${data.name}” została zgłoszona! Oczekuje na zatwierdzenie przez developera.`)
			setForm(INITIAL_FORM_STATE)
			loadOwnedRestaurants()
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił błąd podczas dodawania.')
		} finally {
			setSaving(false)
		}
	}

	// Simulation of payment gateway (Stripe/PayU)
	const handlePaySubscription = async (restaurantId: string) => {
		setCheckoutId(restaurantId)
	}

	const confirmMockPayment = async () => {
		if (!checkoutId || !token) return

		try {
			setProcessingPayment(true)
			// Send update to set subscription to ACTIVE
			const res = await fetch(`${API_URL}/restaurants/${checkoutId}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`,
				},
				body: JSON.stringify({
					subscriptionPlan: 'ACTIVE',
					subscriptionEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
				}),
			})

			if (!res.ok) throw new Error()

			setSuccess('Płatność zrealizowana pomyślnie! Subskrypcja została przedłużona o 30 dni.')
			setCheckoutId(null)
			loadOwnedRestaurants()
		} catch (err) {
			setError('Błąd przetwarzania płatności.')
		} finally {
			setProcessingPayment(false)
		}
	}

	// Calculate remaining trial days
	const getDaysLeft = (endsAtStr: string | null) => {
		if (!endsAtStr) return 0
		const diff = new Date(endsAtStr).getTime() - Date.now()
		const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
		return days > 0 ? days : 0
	}

	const renderGuideCarousel = () => {
		return (
			<div className="bg-stone-50 border border-stone-200 p-6 md:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between min-h-[350px] shadow-sm text-left">
				{/* Step Indicator bar at the top */}
				<div className="absolute top-0 left-0 right-0 h-1 bg-stone-200">
					<div 
						className="bg-black h-full transition-all duration-300" 
						style={{ width: `${((activeStep + 1) / steps.length) * 100}%` }}
					></div>
				</div>

				<div className="space-y-4">
					<div className="flex justify-between items-center">
						<span className="font-mono text-[10px] tracking-widest uppercase bg-black text-white px-2.5 py-1 font-bold">
							Krok {activeStep + 1} z {steps.length}
						</span>
						<span className="font-mono text-[11px] font-bold text-stone-400 flex items-center gap-1">
							<HelpCircle className="w-3.5 h-3.5" /> Instrukcja krok po kroku
						</span>
					</div>

					<div className="space-y-3 min-h-[160px] flex flex-col justify-center">
						<h3 className="text-lg md:text-xl font-bold font-serif text-stone-900">{steps[activeStep].title}</h3>
						<p className="text-stone-600 text-xs md:text-sm leading-relaxed font-sans whitespace-pre-line">
							{steps[activeStep].desc}
						</p>
					</div>
				</div>

				{/* Carousel Controls */}
				<div className="flex items-center justify-between pt-4 border-t border-stone-200">
					<div className="flex gap-1.5">
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

					<div className="flex gap-2 font-mono text-[10px] uppercase tracking-wider font-bold">
						<button
							disabled={activeStep === 0}
							onClick={() => setActiveStep(p => Math.max(p - 1, 0))}
							className="px-3 py-1.5 border border-stone-200 hover:border-black bg-white text-stone-800 transition-all disabled:opacity-35 disabled:hover:border-stone-200 cursor-pointer"
						>
							Wstecz
						</button>
						<button
							disabled={activeStep === steps.length - 1}
							onClick={() => setActiveStep(p => Math.min(p + 1, steps.length - 1))}
							className="px-3 py-1.5 bg-black text-white hover:bg-stone-900 transition-all disabled:opacity-35 disabled:hover:bg-black cursor-pointer"
						>
							Dalej
						</button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 md:py-12 flex-grow space-y-12">
			{/* Header */}
			<section className="border-b border-stone-200 pb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
				<div className="max-w-2xl">
					<span className="text-xs font-mono uppercase tracking-widest text-stone-400">
						{isOwnerOrAdmin ? 'Panel Właściciela' : 'Dedykowany Panel'}
					</span>
					<h1 className="text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1">
						{isOwnerOrAdmin ? 'Twój Panel Biznesowy' : 'Dla Restauracji'}
					</h1>
					<p className="text-stone-500 text-sm md:text-base mt-2">
						{isOwnerOrAdmin
							? 'Zarządzaj swoimi lokalami, śledź wyświetlenia i kontroluj status subskrypcji.'
							: 'Dołącz do platformy Daily Dish i dotrzyj do setek głodnych klientów w Twojej okolicy – całkowicie za darmo.'}
					</p>
				</div>
			</section>

			{/* Sub-panels depending on account role */}
			{isOwnerOrAdmin ? (
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
					{/* Left: Your Restaurants & Stats */}
					<section className="lg:col-span-7 space-y-6">
						<h2 className="text-xl font-bold font-serif text-stone-900 border-b border-stone-100 pb-2">
							Twoje lokale i statystyki ({ownedRestaurants.length})
						</h2>

						{loading ? (
							<div className="py-12 text-center border border-dashed border-stone-200">
								<RefreshCw className="w-6 h-6 text-stone-300 animate-spin mx-auto mb-2" />
								<p className="font-mono text-xs text-stone-400 uppercase">Ładowanie danych...</p>
							</div>
						) : ownedRestaurants.length === 0 ? (
							<div className="py-12 text-center border border-dashed border-stone-200 bg-stone-50 p-6">
								<p className="text-stone-500 text-sm">Nie masz jeszcze przypisanych lokali. Dodaj swój pierwszy lokal za pomocą formularza obok!</p>
							</div>
						) : (
							<div className="space-y-4">
								{ownedRestaurants.map(rest => {
									const isTrial = rest.subscriptionPlan === 'FREE_TRIAL'
									const daysLeft = getDaysLeft(rest.trialEndsAt)

									return (
										<article key={rest.id} className="border border-stone-200 p-6 bg-white space-y-4">
											<div className="flex justify-between items-start gap-4 text-left">
												<div>
													<Link to={`/restaurants/${rest.slug}`} className="hover:underline cursor-pointer block">
														<h3 className="text-lg font-bold font-serif text-stone-900">{rest.name}</h3>
													</Link>
													<span className="font-mono text-[9px] tracking-wider text-stone-400 uppercase">{rest.city} • ID: {rest.slug}</span>
												</div>
												<span className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider ${
													rest.status === 'APPROVED' ? 'bg-stone-100 text-stone-900' :
													rest.status === 'REJECTED' ? 'bg-stone-50 text-stone-400 border border-stone-200' :
													'bg-black text-white'
												}`}>
													{rest.status === 'APPROVED' ? 'Zatwierdzona' :
													 rest.status === 'REJECTED' ? 'Odrzucona' :
													 'Oczekuje na akceptację'}
												</span>
											</div>

											{/* Analytics & Subscription indicators */}
											<div className="grid grid-cols-3 gap-4 pt-2 border-t border-stone-100">
												<div className="bg-stone-50 p-3">
													<span className="text-[9px] font-mono text-stone-400 uppercase block">Wyświetlenia</span>
													<span className="text-xl font-bold font-mono text-stone-900 flex items-center gap-1 mt-1">
														<BarChart2 className="w-4 h-4 text-stone-600" />
														{rest.views}
													</span>
												</div>
												<div className="bg-stone-50 p-3">
													<span className="text-[9px] font-mono text-stone-400 uppercase block">Subskrypcja</span>
													<span className="text-xs font-bold font-mono text-stone-900 block mt-1">
														{isTrial ? 'Free Trial' : rest.subscriptionPlan === 'ACTIVE' ? 'Aktywna' : 'Wygasła'}
													</span>
												</div>
												<div className="bg-stone-50 p-3">
													<span className="text-[9px] font-mono text-stone-400 uppercase block">Wygasa za</span>
													<span className="text-xs font-bold font-mono text-stone-900 block mt-1">
														{isTrial ? `${daysLeft} dni` : '30 dni'}
													</span>
												</div>
											</div>

											{/* Pay Action if required */}
											{rest.status === 'APPROVED' && (rest.subscriptionPlan === 'FREE_TRIAL' || rest.subscriptionPlan === 'EXPIRED') && (
												<div className="pt-2">
													<button
														onClick={() => handlePaySubscription(rest.id)}
														className="w-full bg-black hover:bg-stone-900 text-white font-mono text-xs uppercase tracking-widest py-2 flex items-center justify-center gap-2 cursor-pointer"
													>
														<CreditCard className="w-4 h-4" />
														Opłać Abonament (99 PLN / msc)
													</button>
												</div>
											)}
										</article>
									)
								})}
							</div>
						)}
					</section>

					{/* Right: Submit form or checkout */}
					<section className="lg:col-span-5">
						{checkoutId ? (
							<div className="bg-white border border-stone-200 p-8 space-y-6">
								<div className="border-b border-stone-100 pb-4">
									<span className="text-[10px] font-mono uppercase tracking-widest text-stone-400 flex items-center gap-1">
										<Lock className="w-3 h-3 text-stone-500" /> Bezpieczna Transakcja Mock
									</span>
									<h2 className="text-2xl font-bold font-serif text-stone-900 mt-1">Szybka płatność</h2>
									<p className="text-stone-500 text-xs mt-1">
										Symulacja bramki płatniczej PayU / Stripe.
									</p>
								</div>

								<div className="space-y-4">
									<div className="border p-4 bg-stone-50 space-y-2">
										<p className="text-xs font-mono text-stone-700">Subskrypcja: <strong>Abonament Premium</strong></p>
										<p className="text-xs font-mono text-stone-700">Koszt: <strong>99.00 PLN / miesiąc</strong></p>
									</div>

									<button
										onClick={confirmMockPayment}
										disabled={processingPayment}
										className="w-full bg-green-700 hover:bg-green-800 text-white font-mono text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 cursor-pointer"
									>
										{processingPayment ? 'Przetwarzanie...' : 'Zatwierdź testową płatność'}
									</button>

									<button
										onClick={() => setCheckoutId(null)}
										className="w-full border border-stone-200 hover:border-black text-stone-700 font-mono text-xs uppercase tracking-widest py-3 flex items-center justify-center gap-2 cursor-pointer"
									>
										Anuluj
									</button>
								</div>
							</div>
						) : (
							<div className="bg-white border border-stone-200 p-6 md:p-8 space-y-6">
								<div className="border-b border-stone-100 pb-4">
									<h2 className="text-xl font-bold font-serif text-stone-900">Zgłoś kolejną restaurację</h2>
									<p className="text-stone-500 text-xs mt-1">
										Zgłoś nowy lokal, który ma zostać poddany procesowi moderacji dewelopera.
									</p>
								</div>

								<form onSubmit={handleSubmit} className="space-y-4">
									<div className="space-y-1">
										<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
											Nazwa restauracji *
										</label>
										<input
											type="text"
											value={form.name}
											onChange={e => handleNameChange(e.target.value)}
											placeholder="np. Restauracja u Mariana"
											className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono"
											required
										/>
									</div>

									<div className="grid grid-cols-2 gap-4">
										<div className="space-y-1">
											<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
												Miasto *
											</label>
											<input
												type="text"
												value={form.city}
												onChange={e => updateField('city', e.target.value)}
												placeholder="np. Gdańsk"
												className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono"
												required
											/>
										</div>

										<div className="space-y-1">
											<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
												Identyfikator Slug *
											</label>
											<input
												type="text"
												value={form.slug}
												className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm text-stone-500 font-mono focus:outline-none"
												readOnly
												required
											/>
										</div>
									</div>

									<div className="space-y-1">
										<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
											Telefon kontaktowy *
										</label>
										<input
											type="tel"
											value={form.phone}
											onChange={e => updateField('phone', e.target.value)}
											placeholder="np. 505 101 202"
											className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono"
											required
										/>
									</div>

									<div className="space-y-1">
										<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
											Ulica i numer *
										</label>
										<input
											type="text"
											value={form.address}
											onChange={e => updateField('address', e.target.value)}
											placeholder="np. ul. Szeroka 12"
											className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono"
											required
										/>
									</div>

									<div className="space-y-1">
										<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
											Adres URL Facebooka *
										</label>
										<input
											type="url"
											value={form.facebookUrl}
											onChange={e => updateField('facebookUrl', e.target.value)}
											placeholder="https://facebook.com/fanpage"
											className="w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono"
											required
										/>
									</div>

									<button
										type="submit"
										disabled={saving}
										className="w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
									>
										<Plus className="w-4 h-4" />
										{saving ? 'Zgłaszanie...' : 'Zgłoś restaurację'}
									</button>
								</form>

								{success && (
									<div className="p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800 flex items-start gap-2">
										<CheckCircle className="w-4 h-4 text-stone-800 shrink-0 mt-0.5" />
										<span>{success}</span>
									</div>
								)}
								{error && (
									<div className="p-4 bg-stone-50 border-l-2 border-stone-300 text-xs font-mono text-stone-500">
										{error}
									</div>
								)}
							</div>
						)}
					</section>
				</div>
			) : (
				// SaaS Landing Page for Non-owners (using the reusable Carousel Guide)
				<div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
					<section className="lg:col-span-7 space-y-6">
						{renderGuideCarousel()}
					</section>

					<section className="lg:col-span-5 bg-white border border-stone-200 p-8 text-center space-y-6 shadow-sm">
						<div className="w-12 h-12 bg-stone-100 border border-stone-200 text-stone-800 flex items-center justify-center font-serif text-lg font-bold mx-auto">
							!
						</div>
						<div className="space-y-2">
							<h3 className="text-xl font-bold font-serif text-stone-900">Dołącz do nas</h3>
							<p className="text-stone-500 text-sm max-w-md mx-auto">
								Aby móc dodać profil restauracji i śledzić statystyki wyświetleń oraz subskrypcje, musisz najpierw założyć konto typu Właściciel.
							</p>
						</div>
						<div className="flex flex-col sm:flex-row items-center justify-center gap-3">
							<Link to="/login" className="w-full sm:w-auto px-6 py-2.5 border border-black hover:bg-stone-50 text-stone-900 font-mono text-xs uppercase tracking-widest text-center cursor-pointer">
								Zaloguj się
							</Link>
							<Link to="/register" className="w-full sm:w-auto px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest text-center cursor-pointer">
								Zarejestruj konto
							</Link>
						</div>
					</section>
				</div>
			)}

			{/* Bottom Carousel Guide for Owners (Visible when logged in at the bottom) */}
			{isOwnerOrAdmin && (
				<section className="max-w-4xl mx-auto pt-10 border-t border-stone-200 space-y-6">
					<h2 className="text-xl font-bold font-serif text-stone-900 text-center">
						Jak poprawnie skonfigurować posty i automatyczne pobieranie?
					</h2>
					{renderGuideCarousel()}
				</section>
			)}

			{/* Support Block Banner */}
			<section className="bg-stone-50 border border-stone-200 p-6 md:p-8 text-center max-w-4xl mx-auto shadow-sm">
				<div className="flex items-center justify-center gap-2 mb-2">
					<Mail className="w-4 h-4 text-stone-600" />
					<h4 className="font-serif text-base font-bold text-stone-900">Potrzebujesz pomocy technicznej?</h4>
				</div>
				<p className="text-stone-500 text-xs md:text-sm">
					Nasz zespół jest gotów Ci pomóc w integracji Twojego fanpage na Facebooku lub konfiguracji bota. Napisz do nas bezpośrednio na adres:{' '}
					<a href="mailto:rafaldruzba.00@gmail.com" className="font-mono font-bold text-black hover:underline">
						rafaldruzba.00@gmail.com
					</a>
				</p>
			</section>
		</main>
	)
}
