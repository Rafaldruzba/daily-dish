import { useState, useEffect, type FormEvent } from 'react'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { Plus, CheckCircle, BarChart2, RefreshCw, Mail, HelpCircle, Check, X } from 'lucide-react'

interface Subscription {
	id: string
	plan: string
	status: string
	currentPeriodEnd: string
}

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
	subscription?: Subscription | null
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

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  createdAt: string;
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

	const [activeTab, setActiveTab] = useState('stats'); // 'stats', 'new', 'payments'

	const [ownedRestaurants, setOwnedRestaurants] = useState<Restaurant[]>([])
	const [form, setForm] = useState<RestaurantForm>(INITIAL_FORM_STATE)
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

  const [payments, setPayments] = useState<Payment[]>([]);

	useEffect(() => {
		if (activeTab === 'payments' && ownedRestaurants.length > 0) {
			loadPaymentHistory(ownedRestaurants[0].id);
		}
	}, [activeTab, ownedRestaurants]);

  const loadPaymentHistory = async (restaurantId: string) => {
    try {
      const res = await fetch(`${API_URL}/payments/history/${restaurantId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPayments(data);
    } catch (err) {
      setError('Nie udało się pobrać historii płatności.');
    }
  };

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
				<div className='max-w-2xl'>
					<span className='text-xs font-mono uppercase tracking-widest text-stone-400'>
						{isOwnerOrAdmin ? 'Panel Właściciela' : 'Dedykowany Panel'}
					</span>
					<h1 className='text-3xl md:text-4xl font-black font-serif tracking-tight text-stone-900 mt-1'>
						{isOwnerOrAdmin ? 'Twój Panel Biznesowy' : 'Dla Restauracji'}
					</h1>
					<p className='text-stone-500 text-sm md:text-base mt-2'>
						{isOwnerOrAdmin
							? 'Zarządzaj swoimi lokalami, śledź wyświetlenia i kontroluj status subskrypcji.'
							: 'Dołącz do platformy Daily Dish i dotrzyj do setek głodnych klientów w Twojej okolicy – całkowicie za darmo.'}
					</p>
				</div>
			</section>

      {isOwnerOrAdmin ? (
        <>
          <div className="border-b border-stone-200 mb-8">
            <nav className="-mb-px flex space-x-6" aria-label="Tabs">
              <button onClick={() => setActiveTab('stats')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'stats' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
                Lokale i statystyki
              </button>
              <button onClick={() => setActiveTab('new')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'new' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
                Zgłoś nową restaurację
              </button>
              <button onClick={() => setActiveTab('subscriptions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'subscriptions' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
                Subskrypcje
              </button>
              <button onClick={() => setActiveTab('payments')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-mono uppercase text-xs tracking-wider ${activeTab === 'payments' ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'}`}>
                Historia płatności
              </button>
            </nav>
          </div>

          {activeTab === 'stats' && (
            <section className='space-y-6'>
              <h2 className='text-xl font-bold font-serif text-stone-900'>Twoje lokale ({ownedRestaurants.length})</h2>
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
                    const daysLeft = getDaysLeft(rest.subscription?.currentPeriodEnd || null)

                    return (
                      <Link to={`/restaurants/${rest.slug}`} key={rest.id}>
                        <article className='border border-stone-200 p-6 bg-white space-y-4 hover:border-black transition-colors'>
                          <div className='flex justify-between items-start gap-4 text-left'>
                            <div>
                              <h3 className='text-lg font-bold font-serif text-stone-900'>{rest.name}</h3>
                              <span className='font-mono text-[9px] tracking-wider text-stone-400 uppercase'>
                                {rest.city} • ID: {rest.slug}
                              </span>
                            </div>
                            <span className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider ${rest.status === 'APPROVED' ? 'bg-stone-100 text-stone-900' : rest.status === 'REJECTED' ? 'bg-stone-50 text-stone-400 border border-stone-200' : 'bg-black text-white'}`}>
                              {rest.status === 'APPROVED' ? 'Zatwierdzona' : rest.status === 'REJECTED' ? 'Odrzucona' : 'Oczekuje na akceptację'}
                            </span>
                          </div>
                          <div className='grid grid-cols-3 gap-4 pt-2 border-t border-stone-100'>
                            <div className='bg-stone-50 p-3'>
                              <span className='text-[9px] font-mono text-stone-400 uppercase block'>Wyświetlenia</span>
                              <span className='text-xl font-bold font-mono text-stone-900 flex items-center gap-1 mt-1'><BarChart2 className='w-4 h-4 text-stone-600' />{rest.views}</span>
                            </div>
                            <div className='bg-stone-50 p-3'>
                              <span className='text-[9px] font-mono text-stone-400 uppercase block'>Subskrypcja</span>
                              <span className='text-xs font-bold font-mono text-stone-900 block mt-1'>
                                {rest.subscription?.plan === 'FREE_TRIAL' ? 'Free Trial' : rest.subscription?.plan === 'PREMIUM_MONTHLY' ? 'Premium' : rest.subscription?.plan === 'PREMIUM_YEARLY' ? 'Gold' : 'Brak'}
                              </span>
                            </div>
                            <div className='bg-stone-50 p-3'>
                              <span className='text-[9px] font-mono text-stone-400 uppercase block'>Wygasa za</span>
                              <span className='text-xs font-bold font-mono text-stone-900 block mt-1'>
                                {rest.subscription?.status === 'ACTIVE' ? `${daysLeft} dni` : 'Wygasła'}
                              </span>
                            </div>
                          </div>
                          
                        </article>
                      </Link>
                    )
                  })}
                </div>
              )}
            </section>
          )}

          {activeTab === 'new' && (
            <section>
              <div className='bg-white border border-stone-200 p-6 md:p-8 space-y-6'>
                <div className='border-b border-stone-100 pb-4'>
                  <h2 className='text-xl font-bold font-serif text-stone-900'>Zgłoś nową restaurację</h2>
                  <p className='text-stone-500 text-xs mt-1'>Zgłoś nowy lokal, który ma zostać poddany procesowi moderacji dewelopera.</p>
                </div>
                <form onSubmit={handleSubmit} className='space-y-4'>
                  <div className='space-y-1'><label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>Nazwa restauracji *</label><input type='text' value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder='np. Restauracja u Mariana' className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono' required /></div>
                  <div className='grid grid-cols-2 gap-4'><div className='space-y-1'><label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>Miasto *</label><input type='text' value={form.city} onChange={e => updateField('city', e.target.value)} placeholder='np. Gdańsk' className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono' required /></div><div className='space-y-1'><label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>Identyfikator Slug *</label><input type='text' value={form.slug} className='w-full px-4 py-2.5 bg-stone-50 border border-stone-200 text-sm text-stone-500 font-mono focus:outline-none' readOnly required /></div></div>
                  <div className='space-y-1'><label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>Telefon kontaktowy *</label><input type='tel' value={form.phone} onChange={e => updateField('phone', e.target.value)} placeholder='np. 505 101 202' className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono' required /></div>
                  <div className='space-y-1'><label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>Ulica i numer *</label><input type='text' value={form.address} onChange={e => updateField('address', e.target.value)} placeholder='np. ul. Szeroka 12' className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono' required /></div>
                  <div className='space-y-1'><label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>Adres URL Facebooka *</label><input type='url' value={form.facebookUrl} onChange={e => updateField('facebookUrl', e.target.value)} placeholder='https://facebook.com/fanpage' className='w-full px-4 py-2.5 bg-white border border-stone-200 focus:outline-none focus:border-black text-sm text-stone-900 font-mono' required /></div>
                  <button type='submit' disabled={saving} className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2'><Plus className='w-4 h-4' />{saving ? 'Zgłaszanie...' : 'Zgłoś restaurację'}</button>
                </form>
                {success && <div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800 flex items-start gap-2'><CheckCircle className='w-4 h-4 text-stone-800 shrink-0 mt-0.5' /><span>{success}</span></div>}
                {error && <div className='p-4 bg-stone-50 border-l-2 border-stone-300 text-xs font-mono text-stone-500'>{error}</div>}
              </div>
            </section>
          )}

          {activeTab === 'subscriptions' && (
            <section className="space-y-8 text-left">
              <div>
                <h2 className='text-xl font-bold font-serif text-stone-900'>Twoje aktywne subskrypcje</h2>
                <p className="text-stone-500 text-xs mt-1">Lista Twoich restauracji wraz z przypisanymi okresami ważności planów abonamentowych.</p>
              </div>

              {ownedRestaurants.length === 0 ? (
                <div className='py-8 text-center border border-dashed border-stone-200 bg-stone-50 p-6'>
                  <p className='text-stone-500 text-xs font-mono uppercase'>Nie masz jeszcze żadnych zarejestrowanych restauracji.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {ownedRestaurants.map(rest => {
                    const planName = rest.subscription?.plan === 'FREE_TRIAL' ? 'Darmowy Okres Próbny' : rest.subscription?.plan === 'PREMIUM_MONTHLY' ? 'Abonament Premium' : rest.subscription?.plan === 'PREMIUM_YEARLY' ? 'Pakiet Gold' : 'Brak Subskrypcji';
                    const expDate = rest.subscription?.currentPeriodEnd ? new Date(rest.subscription.currentPeriodEnd).toLocaleDateString('pl-PL') : 'Nieokreślono';
                    return (
                      <div key={rest.id} className="border border-stone-200 p-5 bg-white space-y-3 shadow-sm">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-serif font-bold text-stone-900">{rest.name}</h4>
                            <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400">{rest.city}</span>
                          </div>
                          <span className={`px-2 py-0.5 text-[9px] font-mono uppercase font-bold tracking-wider ${rest.subscription?.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-stone-100 text-stone-600'}`}>
                            {rest.subscription?.status === 'ACTIVE' ? 'Aktywna' : 'Nieaktywna'}
                          </span>
                        </div>
                        <div className="border-t border-stone-100 pt-3 space-y-1 font-mono text-xs">
                          <p className="text-stone-500">Abonament: <strong className="text-stone-900">{planName}</strong></p>
                          <p className="text-stone-500">Ważność do: <strong className="text-stone-900">{expDate}</strong></p>
                        </div>
                        <div className="pt-2">
                          <span className="text-[10px] text-stone-400 font-sans italic">
                            {rest.subscription?.plan === 'FREE_TRIAL' ? '✓ Dzienny FB bot scraper, podstawowe statystyki.' : '✓ Wszystkie funkcje odblokowane (oferty stałe, promowanie, priorytet).'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <hr className="border-stone-200" />

              <div>
                <h2 className='text-xl font-bold font-serif text-stone-900'>Dostępne pakiety abonamentowe</h2>
                <p className="text-stone-500 text-xs mt-1 font-sans">Wybierz pakiet dopasowany do potrzeb Twojego lokalu gastronomicznego.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Free Trial Card */}
                <div className="border border-stone-200 p-6 bg-stone-50 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 font-bold">Pakiet na start</span>
                    <h3 className="font-serif font-black text-2xl text-stone-900">Darmowy Test</h3>
                    <p className="font-mono text-lg font-bold text-stone-900">0 PLN <span className="text-xs font-mono text-stone-400">/ 30 dni</span></p>
                    <p className="text-stone-500 text-xs leading-relaxed font-sans">Darmowy okres próbny na przetestowanie bota. Dostępny wyłącznie przy zgłoszeniu pierwszego lokalu.</p>
                    <ul className="space-y-2 pt-2 text-xs font-mono text-stone-600">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-black shrink-0" /> FB Bot Scraper (12:00)</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-black shrink-0" /> Wyświetlenia i statystyki</li>
                      <li className="flex items-center gap-2 text-stone-400 line-through"><X className="w-3.5 h-3.5 text-stone-300 shrink-0" /> Oferty całoroczne (Standard)</li>
                      <li className="flex items-center gap-2 text-stone-400 line-through"><X className="w-3.5 h-3.5 text-stone-300 shrink-0" /> Promowanie potraw</li>
                    </ul>
                  </div>
                </div>

                {/* Premium Monthly Card */}
                <div className="border-2 border-black p-6 bg-white flex flex-col justify-between space-y-6 relative shadow-md">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black text-white px-3 py-1 text-[8px] font-mono uppercase font-bold tracking-widest">Najczęściej Wybierany</div>
                  <div className="space-y-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-orange-600 font-bold">Pełen zestaw funkcji</span>
                    <h3 className="font-serif font-black text-2xl text-stone-900">Abonament Premium</h3>
                    <p className="font-mono text-lg font-bold text-stone-900">99 PLN <span className="text-xs font-mono text-stone-400">/ miesiąc</span></p>
                    <p className="text-stone-500 text-xs leading-relaxed font-sans">Wszystko czego potrzebujesz, aby skutecznie prowadzić promocję potraw leśnych, pizz i deserów.</p>
                    <ul className="space-y-2 pt-2 text-xs font-mono text-stone-600">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-700 shrink-0" /> FB Bot Scraper o 12:00</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-700 shrink-0" /> Oferty całoroczne (Standard)</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-700 shrink-0" /> Promowanie dań na głównej</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-green-700 shrink-0" /> Zaawansowane menu (kategorie)</li>
                    </ul>
                  </div>
                </div>

                {/* Premium Yearly Card */}
                <div className="border border-stone-200 p-6 bg-stone-50 flex flex-col justify-between space-y-6">
                  <div className="space-y-3">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-stone-400 font-bold">Oszczędność 389 PLN</span>
                    <h3 className="font-serif font-black text-2xl text-stone-900">Pakiet Gold</h3>
                    <p className="font-mono text-lg font-bold text-stone-900">799 PLN <span className="text-xs font-mono text-stone-400">/ rok</span></p>
                    <p className="text-stone-500 text-xs leading-relaxed font-sans">Abonament Premium opłacony z góry na cały rok z dodatkowym, priorytetowym wsparciem deweloperskim.</p>
                    <ul className="space-y-2 pt-2 text-xs font-mono text-stone-600">
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-black shrink-0" /> FB Bot o najwyższym priorytecie</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-black shrink-0" /> Wszystkie funkcje planu Premium</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-black shrink-0" /> Priorytetowa pomoc techniczna</li>
                      <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-black shrink-0" /> Bezpośredni kontakt (0% prowizji)</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section>
              <h2 className='text-xl font-bold font-serif text-stone-900 border-b border-stone-100 pb-2'>Historia płatności</h2>
              {payments.length === 0 ? (
                <div className='py-12 text-center border border-dashed border-stone-200 bg-stone-50 p-6 mt-4'>
                  <p className='text-stone-500 text-sm'>Brak historii płatności dla tej restauracji.</p>
                </div>
              ) : (
                <div className="overflow-x-auto mt-4">
                  <table className="min-w-full bg-white border border-stone-200">
                    <thead className="bg-stone-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500">ID Płatności</th>
                        <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500">Data</th>
                        <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500">Kwota</th>
                        <th className="px-6 py-3 text-left text-xs font-mono uppercase tracking-wider text-stone-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-200">
                      {payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-stone-500">{payment.id.split('-')[0]}...</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-800">{new Date(payment.createdAt).toLocaleDateString('pl-PL')}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-stone-900">{payment.amount.toFixed(2)} {payment.currency}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${payment.status === 'SUCCEEDED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
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
							<p className='text-stone-500 text-sm max-w-md mx-auto'>
								Aby móc dodać profil restauracji i śledzić statystyki wyświetleń oraz subskrypcje, musisz najpierw
								założyć konto typu Właściciel.
							</p>
						</div>
						<div className='flex flex-col sm:flex-row items-center justify-center gap-3'>
							<Link
								to='/login'
								className='w-full sm:w-auto px-6 py-2.5 border border-black hover:bg-stone-50 text-stone-900 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
								Zaloguj się
							</Link>
							<Link
								to='/register'
								className='w-full sm:w-auto px-6 py-2.5 bg-black text-white hover:bg-stone-900 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
								Zarejestruj konto
							</Link>
						</div>
					</section>
				</div>
			)}

			{/* Bottom Carousel Guide for Owners (Visible when logged in at the bottom) */}
			{isOwnerOrAdmin && (
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
