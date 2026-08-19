import { useEffect, useState, type FormEvent } from 'react'

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

interface RestaurantForm {
	name: string
	slug: string
	phone: string
	address: string
	city: string
	facebookUrl: string
}

const API_URL = 'http://localhost:3000/api'

const emptyForm: RestaurantForm = {
	name: '',
	slug: '',
	phone: '',
	address: '',
	city: '',
	facebookUrl: '',
}

function RestaurantsPage() {
	const [restaurants, setRestaurants] = useState<Restaurant[]>([])

	const [form, setForm] = useState<RestaurantForm>(emptyForm)

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')

	const loadRestaurants = async () => {
		try {
			setLoading(true)
			setError('')

			const response = await fetch(`${API_URL}/restaurants`)

			if (!response.ok) {
				throw new Error()
			}

			const data = await response.json()

			setRestaurants(data)
		} catch (error) {
			console.error(error)
			setError('Nie udało się pobrać restauracji.')
		} finally {
			setLoading(false)
		}
	}

	useEffect(() => {
		loadRestaurants()
	}, [])

	const updateField = (field: keyof RestaurantForm, value: string) => {
		setForm(previous => ({
			...previous,
			[field]: value,
		}))
	}

	const generateSlug = (value: string) => {
		return value
			.toLowerCase()
			.trim()
			.replace(/[ąáàä]/g, 'a')
			.replace(/[ćč]/g, 'c')
			.replace(/[ęéèë]/g, 'e')
			.replace(/[ł]/g, 'l')
			.replace(/[ńñ]/g, 'n')
			.replace(/[óöò]/g, 'o')
			.replace(/[śš]/g, 's')
			.replace(/[źżž]/g, 'z')
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
	}

	const handleNameChange = (value: string) => {
		setForm(previous => ({
			...previous,
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
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(form),
			})

			const data = await response.json()

			if (!response.ok) {
				throw new Error(data.message || 'Nie udało się dodać restauracji')
			}

			setRestaurants(previous => [...previous, data].sort((a, b) => a.name.localeCompare(b.name)))

			setForm(emptyForm)

			setSuccess('Restauracja została dodana do whitelisty.')
		} catch (error) {
			console.error(error)

			setError(error instanceof Error ? error.message : 'Nie udało się dodać restauracji')
		} finally {
			setSaving(false)
		}
	}

	const toggleRestaurant = async (restaurant: Restaurant) => {
		try {
			const response = await fetch(`${API_URL}/restaurants/${restaurant.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					isActive: !restaurant.isActive,
				}),
			})

			if (!response.ok) {
				throw new Error()
			}

			const updated = await response.json()

			setRestaurants(previous => previous.map(item => (item.id === updated.id ? updated : item)))
		} catch (error) {
			console.error(error)

			setError('Nie udało się zmienić statusu restauracji.')
		}
	}

	const deleteRestaurant = async (id: number) => {
		if (!window.confirm('Czy na pewno chcesz usunąć tę restaurację?')) {
			return
		}

		try {
			const response = await fetch(`${API_URL}/restaurants/${id}`, {
				method: 'DELETE',
			})

			if (!response.ok) {
				throw new Error()
			}

			setRestaurants(previous => previous.filter(item => item.id !== id))
		} catch (error) {
			console.error(error)

			setError('Nie udało się usunąć restauracji.')
		}
	}

	return (
		<main className='page'>
			<section className='page-title'>
				<p className='eyebrow'>ADMINISTRACJA</p>

				<h1>Restauracje</h1>

				<p>Zarządzaj whitelistą restauracji, z których pobieramy dania dnia.</p>
			</section>

			<section className='form-card'>
				<div className='section-header'>
					<div>
						<h2>Dodaj restaurację</h2>

						<p>Restauracja zostanie dodana do whitelisty.</p>
					</div>
				</div>

				<form onSubmit={handleSubmit}>
					<div className='form-grid'>
						<label>
							Nazwa restauracji *
							<input
								value={form.name}
								onChange={event => handleNameChange(event.target.value)}
								placeholder='np. Bistro Warszawa'
								required
							/>
						</label>

						<label>
							Miasto *
							<input
								value={form.city}
								onChange={event => updateField('city', event.target.value)}
								placeholder='np. Warszawa'
								required
							/>
						</label>

						<label>
							Slug *
							<input value={form.slug} onChange={event => updateField('slug', event.target.value)} required />
						</label>

						<label>
							Telefon
							<input
								value={form.phone}
								onChange={event => updateField('phone', event.target.value)}
								placeholder='501 234 567'
							/>
						</label>

						<label className='full-width'>
							Adres
							<input
								value={form.address}
								onChange={event => updateField('address', event.target.value)}
								placeholder='ul. Przykładowa 10'
							/>
						</label>

						<label className='full-width'>
							Facebook
							<input
								type='url'
								value={form.facebookUrl}
								onChange={event => updateField('facebookUrl', event.target.value)}
								placeholder='https://facebook.com/...'
							/>
						</label>
					</div>

					<button className='button primary' type='submit' disabled={saving}>
						{saving ? 'Dodawanie...' : '+ Dodaj restaurację'}
					</button>
				</form>

				{success && <div className='success'>✓ {success}</div>}

				{error && <div className='error'>{error}</div>}
			</section>

			<section className='restaurants-section'>
				<div className='section-header'>
					<div>
						<h2>Whitelista</h2>

						<p>
							{restaurants.length} {restaurants.length === 1 ? 'restauracja' : 'restauracji'}
						</p>
					</div>

					<button className='button secondary' onClick={loadRestaurants}>
						↻ Odśwież
					</button>
				</div>

				{loading ? (
					<div className='empty'>
						<div className='loader' />
						<p>Ładowanie restauracji...</p>
					</div>
				) : restaurants.length === 0 ? (
					<div className='empty'>
						<div className='empty-icon'>🏪</div>

						<h3>Brak restauracji</h3>

						<p>Dodaj pierwszą restaurację powyżej.</p>
					</div>
				) : (
					<div className='restaurant-list'>
						{restaurants.map(restaurant => (
							<article className='restaurant-card' key={restaurant.id}>
								<div className='restaurant-info'>
									<div className='restaurant-icon'>🍴</div>

									<div>
										<h3>{restaurant.name}</h3>

										<p>
											📍 {restaurant.city}
											{restaurant.address ? `, ${restaurant.address}` : ''}
										</p>

										{restaurant.phone && <p>📞 {restaurant.phone}</p>}
									</div>
								</div>

								<div className='restaurant-actions'>
									<span className={restaurant.isActive ? 'status active' : 'status inactive'}>
										{restaurant.isActive ? 'Aktywna' : 'Wyłączona'}
									</span>

									<button onClick={() => toggleRestaurant(restaurant)}>
										{restaurant.isActive ? 'Wyłącz' : 'Włącz'}
									</button>

									<button className='delete-button' onClick={() => deleteRestaurant(restaurant.id)}>
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

export default RestaurantsPage
