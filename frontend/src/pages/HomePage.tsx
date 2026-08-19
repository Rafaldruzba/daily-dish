import { useEffect, useState } from 'react'

interface Restaurant {
	id: number
	name: string
	slug: string
	phone: string | null
	address: string | null
	city: string
	facebookUrl: string | null
	isActive: boolean
}

interface DailyDish {
	id: number
	name: string
	description: string | null
	price: string | number | null
	imageUrl: string | null
	sourceUrl: string | null
	date: string
	restaurant: Restaurant
}

const API_URL = 'http://localhost:3000/api'

function HomePage() {
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
			timer = setInterval(() => {
				setFetchingTime(prev => prev + 1)
			}, 1000)
		}
		return () => clearInterval(timer)
	}, [fetching])

	const loadTodayDishes = async () => {
		try {
			setLoading(true)
			setError('')

			const response = await fetch(`${API_URL}/dishes/today`)

			if (!response.ok) {
				throw new Error('Nie udało się pobrać dzisiejszych dań')
			}

			const data = await response.json()
			setDishes(data)
		} catch (error) {
			console.error(error)
			setError('Nie udało się połączyć z serwerem.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadTodayDishes()
	}, [])

	const fetchTodayDishes = async () => {
		try {
			setFetching(true)
			setError('')
			setMessage('')

			const response = await fetch(`${API_URL}/dishes/fetch`, {
				method: 'POST',
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się pobrać dań')
			}

			const successful = data.results.filter((result: { status: string }) => result.status === 'success').length
			const notFound = data.results.filter((result: { status: string }) => result.status === 'not_found').length

			setMessage(`Pobrano: ${successful} • Brak dania: ${notFound}`)
			await loadTodayDishes()
		} catch (error) {
			console.error(error)
			setError(error instanceof Error ? error.message : 'Nie udało się pobrać dań')
		} finally {
			setFetching(false)
		}
	}

	const formatPrice = (price: string | number | null) => {
		if (price === null) return null
		return `${Number(price).toFixed(2).replace('.', ',')} zł`
	}

	return (
		<main className='page'>
			<section className='hero'>
				<div>
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
				<div className='section-header'>
					<div>
						<h2>Dzisiejsze dania</h2>
						<p>
							{new Date().toLocaleDateString('pl-PL', {
								weekday: 'long',
								day: 'numeric',
								month: 'long',
							})}
						</p>
					</div>

					<span className='dish-count'>
						{dishes.length} {dishes.length === 1 ? 'danie' : 'dań'}
					</span>
				</div>

				{/* Baner informujący o aktywnym przeszukiwaniu Facebooka */}
				{fetching && (
					<div
						className='fetching-banner'
						style={{
							display: 'flex',
							alignItems: 'center',
							gap: '1rem',
							padding: '1rem',
							marginBottom: '1.5rem',
							backgroundColor: '#e0f2fe',
							border: '1px solid #bae6fd',
							borderRadius: '8px',
							color: '#0369a1',
						}}>
						<div className='loader' />
						<div>
							<strong>Przeszukiwanie profili na Facebooku w toku ({fetchingTime}s)...</strong>
							<p style={{ margin: 0, fontSize: '0.9rem' }}>
								Scraper pobiera najnowsze posty z restauracji. Może to potrwać od 15 do 45 sekund.
							</p>
						</div>
					</div>
				)}

				{message && <div className='success'>✓ {message}</div>}
				{error && <div className='error'>{error}</div>}

				{loading ? (
					<div className='empty'>
						<div className='loader' />
						<p>Ładowanie dań z bazy...</p>
					</div>
				) : dishes.length === 0 ? (
					<div className='empty'>
						<div className='empty-icon'>🍽️</div>
						<h3>Brak dzisiejszych dań</h3>
						<p>Kliknij „Pobierz dania”, żeby sprawdzić restauracje.</p>
						<button className='button primary' onClick={fetchTodayDishes} disabled={fetching}>
							{fetching ? `⏳ Pobieranie (${fetchingTime}s)...` : '🔄 Pobierz dania'}
						</button>
					</div>
				) : (
					<div className='dish-grid'>
						{dishes.map(dish => (
							<article className='dish-card' key={dish.id}>
								{dish.imageUrl ? (
									<img className='dish-image' src={dish.imageUrl} alt={dish.name} />
								) : (
									<div className='dish-image-placeholder'>🍽️</div>
								)}

								<div className='dish-body'>
									<div className='restaurant-name'>{dish.restaurant.name}</div>
									<h3>{dish.name}</h3>
									{dish.description && <p className='dish-description'>{dish.description}</p>}

									<div className='dish-footer'>
										{formatPrice(dish.price) && <strong>{formatPrice(dish.price)}</strong>}
										{dish.restaurant.phone && <a href={`tel:${dish.restaurant.phone}`}>📞 {dish.restaurant.phone}</a>}
									</div>

									{dish.sourceUrl && (
										<a className='source-link' href={dish.sourceUrl} target='_blank' rel='noreferrer'>
											Zobacz źródło →
										</a>
									)}
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</main>
	)
}

export default HomePage
