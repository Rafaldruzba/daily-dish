import { useEffect, useState } from 'react'

// --- TYPY ---
export interface Restaurant {
	id: number
	name: string
	slug: string
	phone: string | null
	address: string | null
	city: string
	facebookUrl: string | null
	isActive: boolean
}

export interface DailyDish {
	id: number
	name: string
	description: string | null
	price: string | number | null
	imageUrl: string | null
	sourceUrl: string | null
	date: string
	restaurant: Restaurant
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

// --- UTILS ---
const formatCurrency = (price: string | number | null) => {
	if (price === null) return null
	return new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' }).format(Number(price))
}

const formatDate = (date: Date = new Date()) => {
	return new Intl.DateTimeFormat('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' }).format(date)
}

// --- SUB-KOMPONENTY ---
const FetchingBanner = ({ time }: { time: number }) => (
	<div className='fetching-banner'>
		<div className='loader' />
		<div>
			<strong>Przeszukiwanie profili na Facebooku w toku ({time}s)...</strong>
			<p className='text-sm text-muted'>
				Scraper pobiera najnowsze posty z restauracji. Może to potrwać od 15 do 45 sekund.
			</p>
		</div>
	</div>
)

const DishCard = ({ dish }: { dish: DailyDish }) => (
	<article className='dish-card'>
		{dish.imageUrl ? (
			<img className='dish-image' src={dish.imageUrl} alt={`Zdjęcie dania: ${dish.name}`} loading='lazy' />
		) : (
			<div className='dish-image-placeholder'>🍽️</div>
		)}

		<div className='dish-body'>
			<div className='restaurant-name'>{dish.restaurant.name}</div>
			<h3 className='dish-title'>{dish.name}</h3>
			{dish.description && <p className='dish-description'>{dish.description}</p>}

			<div className='dish-footer'>
				{dish.price && <strong className='dish-price'>{formatCurrency(dish.price)}</strong>}
				{dish.restaurant.phone && (
					<a className='dish-phone' href={`tel:${dish.restaurant.phone}`}>
						📞 {dish.restaurant.phone}
					</a>
				)}
			</div>

			{dish.sourceUrl && (
				<a className='source-link' href={dish.sourceUrl} target='_blank' rel='noopener noreferrer'>
					Zobacz źródło →
				</a>
			)}
		</div>
	</article>
)

// --- KOMPONENT GŁÓWNY ---
export default function HomePage() {
	const [dishes, setDishes] = useState<DailyDish[]>([])
	const [loading, setLoading] = useState(true)
	const [fetching, setFetching] = useState(false)
	const [fetchingTime, setFetchingTime] = useState(0)
	const [error, setError] = useState('')
	const [message, setMessage] = useState('')

	// Licznik czasu podczas pobierania ze scrapera
	useEffect(() => {
		let timer: ReturnType<typeof setInterval>
		if (fetching) {
			setFetchingTime(0)
			timer = setInterval(() => setFetchingTime(prev => prev + 1), 1000)
		}
		return () => clearInterval(timer)
	}, [fetching])

	// Pobieranie danych przy starcie
	useEffect(() => {
		loadTodayDishes()
	}, [])

	const loadTodayDishes = async () => {
		try {
			setLoading(true)
			setError('')

			const response = await fetch(`${API_URL}/dishes/today`)
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

	const fetchTodayDishes = async () => {
		try {
			setFetching(true)
			setError('')
			setMessage('')

			const response = await fetch(`${API_URL}/dishes/fetch`, { method: 'POST' })
			const data = await response.json()

			if (!response.ok) throw new Error(data.message || 'Nie udało się pobrać dań')

			const successful = data.results.filter((r: { status: string }) => r.status === 'success').length
			const notFound = data.results.filter((r: { status: string }) => r.status === 'not_found').length

			setMessage(`Pobrano: ${successful} • Brak dania: ${notFound}`)
			await loadTodayDishes()
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd.')
		} finally {
			setFetching(false)
		}
	}

	return (
		<main className='page'>
			<section className='hero'>
				<div className='hero-content'>
					<p className='eyebrow'>DZISIAJ</p>
					<h1>Co dziś jemy?</h1>
					<p className='hero-description'>Sprawdź dania dnia z naszych ulubionych restauracji.</p>
				</div>

				<div className='hero-actions'>
					<button className='button secondary' onClick={loadTodayDishes} disabled={loading || fetching}>
						↻ Odśwież
					</button>
					<button className='button primary' onClick={fetchTodayDishes} disabled={fetching || loading}>
						{fetching ? `⏳ Pobieranie (${fetchingTime}s)...` : '🔄 Pobierz dania'}
					</button>
				</div>
			</section>

			<section className='dishes-section'>
				<header className='section-header'>
					<div>
						<h2>Dzisiejsze dania</h2>
						<p className='date-label'>{formatDate()}</p>
					</div>
					<span className='badge count-badge'>
						{dishes.length} {dishes.length === 1 ? 'danie' : 'dań'}
					</span>
				</header>

				{/* Komunikaty */}
				{fetching && <FetchingBanner time={fetchingTime} />}
				{message && <div className='alert success'>✓ {message}</div>}
				{error && <div className='alert error'>⚠ {error}</div>}

				{/* Stany ładowania i puste dane */}
				{loading ? (
					<div className='empty-state'>
						<div className='loader' />
						<p>Ładowanie dań z bazy...</p>
					</div>
				) : dishes.length === 0 && !fetching ? (
					<div className='empty-state'>
						<div className='empty-icon'>🍽️</div>
						<h3>Brak dzisiejszych dań</h3>
						<p>Kliknij „Pobierz dania”, żeby sprawdzić restauracje.</p>
					</div>
				) : (
					<div className='dish-grid'>
						{dishes.map(dish => (
							<DishCard key={dish.id} dish={dish} />
						))}
					</div>
				)}
			</section>
		</main>
	)
}
