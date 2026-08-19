import { useEffect, useState, type FormEvent } from 'react'

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

interface RestaurantForm {
	name: string
	slug: string
	phone: string
	address: string
	city: string
	facebookUrl: string
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'
const INITIAL_FORM_STATE: RestaurantForm = { name: '', slug: '', phone: '', address: '', city: '', facebookUrl: '' }

// --- UTILS (poza komponentem) ---
const generateSlug = (value: string) => {
	return value
		.toLowerCase()
		.trim()
		.normalize('NFD') // Oddziela znaki diakrytyczne
		.replace(/[\u0300-\u036f]/g, '') // Usuwa diakrytyki (ą->a, ł->l)
		.replace(/[^a-z0-9]+/g, '-') // Zamienia spacje i znaki specjalne na myślniki
		.replace(/^-+|-+$/g, '') // Usuwa myślniki z początku i końca
}

// --- KOMPONENT GŁÓWNY ---
export default function RestaurantsPage() {
	const [restaurants, setRestaurants] = useState<Restaurant[]>([])
	const [form, setForm] = useState<RestaurantForm>(INITIAL_FORM_STATE)

	// Statusy
	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	useEffect(() => {
		loadRestaurants()
	}, [])

	const loadRestaurants = async () => {
		try {
			setLoading(true)
			setError('')

			const response = await fetch(`${API_URL}/restaurants`)
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

	// Handlery formularza
	const updateField = (field: keyof RestaurantForm, value: string) => {
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
		try {
			setSaving(true)
			setError('')
			setSuccess('')

			const response = await fetch(`${API_URL}/restaurants`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(form),
			})

			const data = await response.json()
			if (!response.ok) throw new Error(data.message || 'Nie udało się dodać restauracji')

			setRestaurants(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
			setForm(INITIAL_FORM_STATE)
			setSuccess('Restauracja została dodana do whitelisty.')
		} catch (err) {
			console.error(err)
			setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd podczas zapisu')
		} finally {
			setSaving(false)
		}
	}

	// Akcje na liście
	const toggleRestaurantStatus = async (restaurant: Restaurant) => {
		try {
			const response = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ isActive: !restaurant.isActive }),
			})

			if (!response.ok) throw new Error()
			const updated = await response.json()

			setRestaurants(prev => prev.map(item => (item.id === updated.id ? updated : item)))
		} catch (err) {
			console.error(err)
			setError('Nie udało się zmienić statusu restauracji.')
		}
	}

	const deleteRestaurant = async (id: number) => {
		if (!window.confirm('Czy na pewno chcesz usunąć tę restaurację z whitelisty?')) return

		try {
			const response = await fetch(`${API_URL}/restaurants/${id}`, { method: 'DELETE' })
			if (!response.ok) throw new Error()

			setRestaurants(prev => prev.filter(item => item.id !== id))
		} catch (err) {
			console.error(err)
			setError('Nie udało się usunąć restauracji.')
		}
	}

	return (
		<main className='page admin-page'>
			<header className='page-header'>
				<p className='eyebrow'>ADMINISTRACJA</p>
				<h1>Zarządzanie Restauracjami</h1>
				<p className='subtitle'>Zarządzaj whitelistą restauracji, z których pobieramy dania dnia.</p>
			</header>

			<section className='form-section card'>
				<div className='card-header'>
					<h2>Dodaj restaurację</h2>
					<p className='text-muted'>Wypełnij dane, aby włączyć nową restaurację do scrapera.</p>
				</div>

				<form className='restaurant-form' onSubmit={handleSubmit}>
					<div className='form-grid'>
						<label className='form-group'>
							<span>
								Nazwa restauracji <span className='required'>*</span>
							</span>
							<input
								value={form.name}
								onChange={e => handleNameChange(e.target.value)}
								placeholder='np. Bistro Warszawa'
								required
							/>
						</label>

						<label className='form-group'>
							<span>
								Miasto <span className='required'>*</span>
							</span>
							<input
								value={form.city}
								onChange={e => updateField('city', e.target.value)}
								placeholder='np. Warszawa'
								required
							/>
						</label>

						<label className='form-group'>
							<span>
								Slug (identyfikator) <span className='required'>*</span>
							</span>
							<input value={form.slug} onChange={e => updateField('slug', e.target.value)} required />
						</label>

						<label className='form-group'>
							<span>Telefon</span>
							<input
								value={form.phone}
								onChange={e => updateField('phone', e.target.value)}
								placeholder='501 234 567'
							/>
						</label>

						<label className='form-group full-width'>
							<span>Adres ulicy</span>
							<input
								value={form.address}
								onChange={e => updateField('address', e.target.value)}
								placeholder='ul. Przykładowa 10'
							/>
						</label>

						<label className='form-group full-width'>
							<span>
								Link do Facebooka <span className='required'>*</span>
							</span>
							<input
								type='url'
								value={form.facebookUrl}
								onChange={e => updateField('facebookUrl', e.target.value)}
								placeholder='https://facebook.com/...'
								required
							/>
						</label>
					</div>

					<div className='form-actions'>
						<button className='button primary' type='submit' disabled={saving}>
							{saving ? 'Zapisywanie...' : '+ Dodaj restaurację'}
						</button>
					</div>
				</form>

				{success && <div className='alert success mt-4'>✓ {success}</div>}
				{error && <div className='alert error mt-4'>⚠ {error}</div>}
			</section>

			<section className='list-section mt-8'>
				<div className='section-header flex-between'>
					<div>
						<h2>Whitelista ({restaurants.length})</h2>
					</div>
					<button className='button secondary small' onClick={loadRestaurants} disabled={loading}>
						↻ Odśwież
					</button>
				</div>

				{loading ? (
					<div className='empty-state'>
						<div className='loader' />
						<p>Ładowanie restauracji...</p>
					</div>
				) : restaurants.length === 0 ? (
					<div className='empty-state'>
						<div className='empty-icon'>🏪</div>
						<h3>Brak restauracji</h3>
						<p>Lista jest pusta. Dodaj pierwszą restaurację korzystając z formularza.</p>
					</div>
				) : (
					<div className='restaurant-list'>
						{restaurants.map(restaurant => (
							<article className={`restaurant-row card ${!restaurant.isActive ? 'disabled' : ''}`} key={restaurant.id}>
								<div className='restaurant-info'>
									<div className='restaurant-avatar'>🍴</div>
									<div className='restaurant-details'>
										<h3>{restaurant.name}</h3>
										<p className='text-muted'>
											📍 {restaurant.city}
											{restaurant.address ? `, ${restaurant.address}` : ''}
											{restaurant.phone && <span className='ml-2'>• 📞 {restaurant.phone}</span>}
										</p>
									</div>
								</div>

								<div className='restaurant-actions'>
									<span className={`badge ${restaurant.isActive ? 'badge-active' : 'badge-inactive'}`}>
										{restaurant.isActive ? 'Scrapowanie aktywne' : 'Wyłączona'}
									</span>
									<button className='button secondary' onClick={() => toggleRestaurantStatus(restaurant)}>
										{restaurant.isActive ? 'Pauzuj' : 'Wznów'}
									</button>
									<button className='button danger' onClick={() => deleteRestaurant(restaurant.id)}>
										Usuń
									</button>
								</div>
							</article>
						))}
					</div>
				)}
			</section>
		</main>
	)
}
