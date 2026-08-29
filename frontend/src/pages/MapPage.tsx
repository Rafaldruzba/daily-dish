import { useEffect, useState, type FormEvent } from 'react'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import { RefreshCw, Search, Loader, MapPin, Phone, Star, ArrowRight, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Restaurant } from './RestaurantsPage'

import { useLocation } from '../context/LocationContext'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface Coords {
	lat: number
	lng: number
}

interface RestaurantWithCoords extends Restaurant {
	coords: Coords | null
}

const DEFAULT_CENTER: Coords = { lat: 52.237049, lng: 21.017532 } // Warsaw city center

export default function MapPage() {
	const [restaurants, setRestaurants] = useState<RestaurantWithCoords[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [searchQuery, setSearchQuery] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [mapCenter, setMapCenter] = useState<Coords>(DEFAULT_CENTER)
	const [geocodingProgress, setGeocodingProgress] = useState('')
	const [selectedRestaurant, setSelectedRestaurant] = useState<RestaurantWithCoords | null>(null)
	const { city } = useLocation()

	// Load Google Maps API Script
	const { isLoaded, loadError } = useJsApiLoader({
		id: 'google-map-script',
		googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
	})

	// --- 1. Fetch Restaurants ---
	useEffect(() => {
		const fetchRestaurants = async () => {
			try {
				setLoading(true)
				const response = await fetch(`${API_URL}/restaurants?city=${encodeURIComponent(city || '')}`)
				if (!response.ok) throw new Error('Nie udało się pobrać restauracji')
				const data: Restaurant[] = await response.json()

				// Filter for approved, active restaurants
				const activeApproved = data.filter(r => r.isActive && (r.status === 'APPROVED' || r.status === 'ACTIVE'))

				const withCoords = activeApproved.map(r => {
					// Read from DB coordinates if available
					let coords: Coords | null = r.latitude && r.longitude ? { lat: r.latitude, lng: r.longitude } : null
					
					// Fallback to localStorage cache
					if (!coords) {
						const cached = localStorage.getItem(`geo_cache_v3_${r.id}`)
						if (cached) {
							try {
								coords = JSON.parse(cached)
							} catch (e) {
								console.error('Error parsing geocoding cache:', e)
							}
						}
					}
					
					return {
						...r,
						coords,
					}
				})

				setRestaurants(withCoords)
			} catch (err) {
				console.error(err)
				setError('Nie udało się połączyć z serwerem restauracji.')
			} finally {
				setLoading(false)
			}
		}
		fetchRestaurants()
	}, [city])

	// --- 2. Request Geolocation and Center Map ---
	useEffect(() => {
		if (!isLoaded) return

		const setInitialCenter = async () => {
			if (city) {
				const geocoder = new google.maps.Geocoder()
				geocoder.geocode({ address: `${city}, Poland` }, (results, status) => {
					if (status === 'OK' && results && results[0]) {
						const location = results[0].geometry.location
						setMapCenter({ lat: location.lat(), lng: location.lng() })
					} else {
						console.warn('Could not geocode user city, falling back to geolocation.')
						fallbackToBrowserGeolocation()
					}
				})
			} else {
				fallbackToBrowserGeolocation()
			}
		}

		const fallbackToBrowserGeolocation = () => {
			if ('geolocation' in navigator) {
				navigator.geolocation.getCurrentPosition(
					position => {
						const { latitude, longitude } = position.coords
						setMapCenter({ lat: latitude, lng: longitude })
					},
					err => {
						console.warn('Geolocation error:', err)
						setError('Nie udało się pobrać Twojej dokładnej lokalizacji. Wyświetlanie domyślnej mapy.')
					},
					{ timeout: 8000 },
				)
			}
		}

		setInitialCenter()
	}, [city, isLoaded])

	// --- 3. Geocode Restaurants Sequentially ---
	useEffect(() => {
		if (!isLoaded) return

		const geocodeUnmappedRestaurants = async () => {
			const unmapped = restaurants.filter(r => r.coords === null)
			if (unmapped.length === 0) {
				setGeocodingProgress('')
				return
			}

			const geocoder = new google.maps.Geocoder()

			for (let i = 0; i < unmapped.length; i++) {
				const rest = unmapped[i]
				setGeocodingProgress(`Mapowanie lokalizacji lokali: ${i + 1}/${unmapped.length}...`)

				const fullAddress = `${rest.address || ''}, ${rest.city}, Poland`

				try {
					await new Promise<void>((resolve) => {
						geocoder.geocode({ address: fullAddress }, (results, status) => {
							if (status === 'OK' && results && results[0]) {
								const location = results[0].geometry.location
								const coords = { lat: location.lat(), lng: location.lng() }
								
								// Cache result in localStorage
								localStorage.setItem(`geo_cache_v3_${rest.id}`, JSON.stringify(coords))

								// Update state
								setRestaurants(prev => prev.map(item => (item.id === rest.id ? { ...item, coords } : item)))
							} else {
								console.warn(`Geocoding failed for ${rest.name} with status: ${status}`)
							}
							resolve()
						})
					})
				} catch (err) {
					console.error(`Geocoding error for ${rest.name}:`, err)
				}

				// Small delay to respect Google Geocoding API limits (200ms is perfectly fine for Google)
				await new Promise(resolve => setTimeout(resolve, 200))
			}

			setGeocodingProgress('')
		}

		if (restaurants.length > 0) {
			geocodeUnmappedRestaurants()
		}
	}, [restaurants.length, isLoaded])

	// --- 4. Handle Address Search ---
	const handleSearch = async (e: FormEvent) => {
		e.preventDefault()
		if (!searchQuery.trim() || !isLoaded) return

		try {
			setIsSearching(true)
			setError('')
			
			const geocoder = new google.maps.Geocoder()
			geocoder.geocode({ address: searchQuery }, (results, status) => {
				if (status === 'OK' && results && results[0]) {
					const location = results[0].geometry.location
					setMapCenter({ lat: location.lat(), lng: location.lng() })
				} else {
					setError(`Nie znaleziono lokalizacji dla: "${searchQuery}"`)
				}
				setIsSearching(false)
			})
		} catch (err) {
			setError('Błąd podczas wyszukiwania lokalizacji.')
			setIsSearching(false)
		}
	}

	if (loadError) {
		return (
			<div className='flex items-center justify-center h-[calc(100dvh-4rem)] bg-stone-50 font-mono text-xs text-red-500 p-4 text-center'>
				Błąd ładowania Map Google. Spróbuj ponownie później.
			</div>
		)
	}

	if (!isLoaded) {
		return (
			<div className='flex flex-col items-center justify-center h-[calc(100dvh-4rem)] bg-stone-50'>
				<RefreshCw className='w-8 h-8 text-stone-300 animate-spin mb-2' />
				<p className='font-mono text-xs text-stone-400 uppercase tracking-widest'>Ładowanie mapy...</p>
			</div>
		)
	}

	return (
		<main className='flex flex-col md:flex-row h-[calc(100dvh-4rem)] overflow-hidden'>
			{/* Left side panel: Info & Search */}
			<section className='w-full md:w-96 border-b md:border-b-0 md:border-r border-stone-200 bg-white flex flex-col z-10 shadow-md flex-1 md:flex-none min-h-0'>
				{/* Search header */}
				<div className='p-4 border-b border-stone-100'>
					<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400 mb-2'>Wyszukaj lokalizację</h2>
					<form onSubmit={handleSearch} className='relative'>
						<input
							type='text'
							value={searchQuery}
							onChange={e => setSearchQuery(e.target.value)}
							placeholder='Wpisz miasto lub adres...'
							className='w-full pl-3 pr-12 py-2 bg-stone-50 border border-stone-200 focus:outline-none focus:border-black text-sm font-mono transition-colors'
						/>
						<button
							type='submit'
							disabled={isSearching}
							className='absolute right-1.5 top-1/2 -translate-y-1/2 bg-black text-white hover:bg-stone-900 transition-colors p-1.5 font-mono text-xs disabled:opacity-50 cursor-pointer'>
							{isSearching ? <Loader className='w-3.5 h-3.5 animate-spin' /> : <Search className='w-3.5 h-3.5' />}
						</button>
					</form>
					{error && <p className='text-[11px] text-red-600 font-mono mt-1'>{error}</p>}
				</div>

				{/* Progress and status indicators */}
				{geocodingProgress && (
					<div className='px-4 py-2 bg-stone-50 border-b border-stone-100 flex items-center gap-2'>
						<Loader className='w-3 h-3 text-stone-500 animate-spin' />
						<span className='font-mono text-[10px] text-stone-500 uppercase tracking-wider'>{geocodingProgress}</span>
					</div>
				)}

				{/* Restaurant list */}
				<div className='flex-grow overflow-y-auto divide-y divide-stone-100'>
					<div className='p-4'>
						<h3 className='font-mono text-xs uppercase tracking-wider font-semibold text-stone-700 mb-3'>
							Lokale w pobliżu ({restaurants.filter(r => r.coords !== null).length})
						</h3>
					</div>

					{loading ? (
						<div className='p-8 text-center'>
							<RefreshCw className='w-6 h-6 text-stone-300 animate-spin mx-auto mb-2' />
							<p className='font-mono text-[10px] text-stone-400 uppercase tracking-widest'>Pobieranie lokali...</p>
						</div>
					) : restaurants.length === 0 ? (
						<div className='p-8 text-center'>
							<p className='font-mono text-xs text-stone-500'>Brak aktywnych restauracji w systemie.</p>
						</div>
					) : (
						restaurants.map(rest => (
							<div
								key={rest.id}
								className='p-4 hover:bg-stone-50 transition-colors cursor-pointer group'
								onClick={() => {
									if (rest.coords) {
										setMapCenter(rest.coords)
										setSelectedRestaurant(rest)
									}
								}}>
								<div className='flex justify-between items-start gap-2'>
									<h4 className='font-serif text-base font-bold text-stone-900 group-hover:text-black'>{rest.name}</h4>
									{rest.rating && (
										<span className='flex items-center gap-0.5 text-xs font-mono bg-stone-100 px-1.5 py-0.5 rounded'>
											<Star className='w-3 h-3 fill-yellow-400 text-yellow-400' />
											{rest.rating.toFixed(1)}
										</span>
									)}
								</div>

								<p className='text-xs text-stone-500 mt-1 flex items-center gap-1'>
									<MapPin className='w-3 h-3 shrink-0' />
									{rest.address ? `${rest.address}, ${rest.city}` : rest.city}
								</p>

								{rest.phone && (
									<p className='text-[11px] text-stone-400 mt-0.5 flex items-center gap-1'>
										<Phone className='w-3 h-3 shrink-0' />
										{rest.phone}
									</p>
								)}

								<div className='mt-3 pt-2.5 border-t border-stone-100 flex items-center justify-between gap-2'>
									<a
										href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rest.name}, ${rest.address || ''}, ${rest.city}`)}`}
										target='_blank'
										rel='noopener noreferrer'
										className='text-[10px] font-mono uppercase tracking-wider text-stone-500 hover:text-black flex items-center gap-1 font-semibold'
										onClick={e => e.stopPropagation()}>
										<Navigation className='w-3 h-3' /> Google Maps
									</a>
									<Link
										to={`/restaurants/${rest.slug}`}
										className='text-[11px] font-mono uppercase tracking-wider text-stone-600 hover:text-black flex items-center gap-1 font-bold group-hover:translate-x-0.5 transition-transform'
										onClick={e => e.stopPropagation()}>
										Zobacz dania <ArrowRight className='w-3 h-3' />
									</Link>
								</div>
							</div>
						))
					)}
				</div>
			</section>

			{/* Right side area: Google Map */}
			<section className='w-full relative bg-stone-100 flex-1 md:flex-grow min-h-[40%] md:min-h-0'>
				<GoogleMap
					mapContainerStyle={{ height: '100%', width: '100%' }}
					center={mapCenter}
					zoom={13}
					options={{
						disableDefaultUI: false,
						zoomControl: true,
						mapTypeControl: false,
						scaleControl: true,
						streetViewControl: false,
						rotateControl: false,
						fullscreenControl: true,
					}}
				>
					{/* Restaurants markers */}
					{restaurants
						.filter(r => r.coords !== null)
						.map(rest => (
							<MarkerF 
								key={rest.id} 
								position={rest.coords as Coords}
								onClick={() => setSelectedRestaurant(rest)}
							/>
						))}

					{/* Selected Restaurant InfoWindow */}
					{selectedRestaurant && selectedRestaurant.coords && (
						<InfoWindowF
							position={selectedRestaurant.coords}
							onCloseClick={() => setSelectedRestaurant(null)}
						>
							<div className='p-1 min-w-[200px] font-sans text-stone-900'>
								<Link to={`/restaurants/${selectedRestaurant.slug}`} className='group/title block'>
									<h4 className='font-serif text-sm font-bold text-stone-950 mb-1 cursor-pointer group-hover/title:underline'>
										{selectedRestaurant.name}
									</h4>
								</Link>
								<p className='text-xs text-stone-600 mb-1.5 flex items-center gap-1'>
									<MapPin className='w-3.5 h-3.5 text-stone-400 shrink-0' />
									{selectedRestaurant.address ? `${selectedRestaurant.address}, ${selectedRestaurant.city}` : selectedRestaurant.city}
								</p>
								{selectedRestaurant.phone && (
									<p className='text-xs text-stone-500 mb-1.5 flex items-center gap-1'>
										<Phone className='w-3.5 h-3.5 text-stone-400 shrink-0' />
										{selectedRestaurant.phone}
									</p>
								)}
								<div className='border-t border-stone-100 pt-2 flex flex-col gap-2 mt-2'>
									<div className='flex justify-between items-center'>
										{selectedRestaurant.rating && (
											<span className='flex items-center gap-0.5 text-[10px] font-mono bg-stone-50 px-1 py-0.5 rounded'>
												<Star className='w-2.5 h-2.5 fill-yellow-400 text-yellow-400' />
												{selectedRestaurant.rating.toFixed(1)}
											</span>
										)}
										<Link
											to={`/restaurants/${selectedRestaurant.slug}`}
											className='text-[11px] font-mono uppercase tracking-wider text-black font-bold flex items-center gap-0.5 hover:underline'>
											Oferty <ArrowRight className='w-3 h-3' />
										</Link>
									</div>

									<a
										href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedRestaurant.name}, ${selectedRestaurant.address || ''}, ${selectedRestaurant.city}`)}`}
										target='_blank'
										rel='noopener noreferrer'
										className='w-full text-center py-1.5 border border-stone-200 hover:border-black text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-stone-50 transition-colors font-bold text-stone-700'>
										<Navigation className='w-3 h-3' /> Pokaż w Google Maps
									</a>
								</div>
							</div>
						</InfoWindowF>
					)}
				</GoogleMap>
			</section>
		</main>
	)
}
