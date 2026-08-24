import { useEffect, useState, type FormEvent } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { RefreshCw, Search, Loader, MapPin, Phone, Star, ArrowRight, Navigation } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Restaurant } from './RestaurantsPage'

import { useLocation } from '../context/LocationContext'

// Import Leaflet CSS
import 'leaflet/dist/leaflet.css'

// Fix default marker icon issues with Vite bundling
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Delete and re-merge default options to resolve paths
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
	iconUrl: markerIcon,
	iconRetinaUrl: markerIcon2x,
	shadowUrl: markerShadow,
})

const API_URL = import.meta.env.VITE_API_URL || '/api'
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

// Component to dynamically re-center react-leaflet map
function ChangeMapView({ center }: { center: [number, number] }) {
	const map = useMap()
	useEffect(() => {
		map.setView(center, 13)
	}, [center, map])
	return null
}

interface RestaurantWithCoords extends Restaurant {
	coords: [number, number] | null
}

export default function MapPage() {
	const [restaurants, setRestaurants] = useState<RestaurantWithCoords[]>([])
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState('')
	const [searchQuery, setSearchQuery] = useState('')
	const [isSearching, setIsSearching] = useState(false)
	const [mapCenter, setMapCenter] = useState<[number, number]>([52.237, 21.017]) // Warsaw city center
	const [geocodingProgress, setGeocodingProgress] = useState('')
	const { city } = useLocation()

	// --- 1. Fetch Restaurants ---
	useEffect(() => {
		const fetchRestaurants = async () => {
			try {
				setLoading(true)
				const response = await fetch(`${API_URL}/restaurants?city=${encodeURIComponent(city || '')}`)
				if (!response.ok) throw new Error('Nie udało się pobrać restauracji')
				const data: Restaurant[] = await response.json()

				// Filter for approved, active restaurants
				const activeApproved = data.filter(r => r.isActive && r.status === 'APPROVED')

				// Initialize state with coordinates from localStorage if available (v3 cache)
				const withCoords = activeApproved.map(r => {
					const coords: [number, number] | null = r.latitude && r.longitude ? [r.latitude, r.longitude] : null
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

	// --- 2. Request Geolocation ---
	useEffect(() => {
		const setInitialCenter = async () => {
			if (city) {
				try {
					const res = await fetch(
						`${NOMINATIM_URL}?q=${encodeURIComponent(city)}&format=json&limit=1&email=rafaldruzba.00@gmail.com`,
					)
					const data = await res.json()
					if (data && data.length > 0) {
						const { lat, lon } = data[0]
						setMapCenter([parseFloat(lat), parseFloat(lon)])
						return // Exit if city is geocoded
					}
				} catch (err) {
					console.warn('Could not geocode user city, falling back to geolocation.', err)
				}
			}

			if ('geolocation' in navigator) {
				navigator.geolocation.getCurrentPosition(
					position => {
						const { latitude, longitude } = position.coords
						setMapCenter([latitude, longitude])
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
	}, [city])

	// --- 3. Geocode Restaurants Sequentially ---
	useEffect(() => {
		const geocodeUnmappedRestaurants = async () => {
			// Find restaurants that do not have coordinates yet
			const unmapped = restaurants.filter(r => r.coords === null)
			if (unmapped.length === 0) {
				setGeocodingProgress('')
				return
			}

			// Sequential processing to respect Nominatim API's 1 req/sec policy
			for (let i = 0; i < unmapped.length; i++) {
				const rest = unmapped[i]
				setGeocodingProgress(`Mapowanie lokalizacji lokali: ${i + 1}/${unmapped.length}...`)

				// Clean prefix (ul., al., pl., plac) from street names for extremely high geocoding success rate in Nominatim
				const cleanStreet = rest.address
					? rest.address.replace(/^(ul\.\s*|ul\s+|al\.\s*|al\s+|pl\.\s*|pl\s+|plac\s+)/i, '').trim()
					: ''

				// Extract street name only (without building number) in case the exact building number is not mapped in OpenStreetMap
				const streetOnly = cleanStreet.replace(/\s+\d+.*$/, '').trim()

				let coords: [number, number] | null = null

				try {
					// Krok 1: Strukturyzowane geokodowanie z pełnym adresem (najwyższa dokładność)
					let url = `${NOMINATIM_URL}?street=${encodeURIComponent(cleanStreet)}&city=${encodeURIComponent(rest.city)}&country=Poland&format=json&limit=1&email=rafaldruzba.00@gmail.com`
					let res = await fetch(url)
					let data = await res.json()

					if (data && data.length > 0) {
						coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
					} else {
						// Krok 2: Tekstowe wyszukiwanie z pełnym adresem
						const fullAddress = `${cleanStreet}, ${rest.city}, Poland`
						url = `${NOMINATIM_URL}?q=${encodeURIComponent(fullAddress)}&format=json&limit=1&email=rafaldruzba.00@gmail.com`
						res = await fetch(url)
						data = await res.json()

						if (data && data.length > 0) {
							coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
						} else if (streetOnly && streetOnly !== cleanStreet) {
							// Krok 3: Szukanie samej ulicy w danym mieście (bez numeru budynku) - strukturalnie (rozwiązuje błąd dla np. Żytnia 52)
							url = `${NOMINATIM_URL}?street=${encodeURIComponent(streetOnly)}&city=${encodeURIComponent(rest.city)}&country=Poland&format=json&limit=1&email=rafaldruzba.00@gmail.com`
							res = await fetch(url)
							data = await res.json()

							if (data && data.length > 0) {
								coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
							} else {
								// Krok 4: Szukanie samej ulicy - tekstowo
								const streetAddress = `${streetOnly}, ${rest.city}, Poland`
								url = `${NOMINATIM_URL}?q=${encodeURIComponent(streetAddress)}&format=json&limit=1&email=rafaldruzba.00@gmail.com`
								res = await fetch(url)
								data = await res.json()

								if (data && data.length > 0) {
									coords = [parseFloat(data[0].lat), parseFloat(data[0].lon)]
								}
							}
						}
					}

					// Krok 5: Ostateczny fallback na centrum miasta (jeśli ulica w ogóle nie istnieje w OSM)
					if (!coords) {
						url = `${NOMINATIM_URL}?city=${encodeURIComponent(rest.city)}&country=Poland&format=json&limit=1&email=rafaldruzba.00@gmail.com`
						let res = await fetch(url)
						let data = await res.json()

						if (data && data.length > 0) {
							const offsetLat = (Math.random() - 0.5) * 0.015
							const offsetLng = (Math.random() - 0.5) * 0.015
							coords = [parseFloat(data[0].lat) + offsetLat, parseFloat(data[0].lon) + offsetLng]
						}
					}

					if (coords) {
						// Cache result (v3 cache key)
						localStorage.setItem(`geo_cache_v3_${rest.id}`, JSON.stringify(coords))

						// Update state
						setRestaurants(prev => prev.map(item => (item.id === rest.id ? { ...item, coords } : item)))
					}
				} catch (err) {
					console.error(`Geocoding failed for restaurant ${rest.name}:`, err)
				}

				// Wait 1.1 seconds before next request to Nominatim to strictly stay under 1 req/sec limit
				await new Promise(resolve => setTimeout(resolve, 1100))
			}

			setGeocodingProgress('')
		}

		if (restaurants.length > 0) {
			geocodeUnmappedRestaurants()
		}
	}, [restaurants.length]) // Trigger when list of restaurants is loaded

	// --- 4. Handle Address Search ---
	const handleSearch = async (e: FormEvent) => {
		e.preventDefault()
		if (!searchQuery.trim()) return

		try {
			setIsSearching(true)
			setError('')
			const res = await fetch(
				`${NOMINATIM_URL}?q=${encodeURIComponent(searchQuery)}&format=json&limit=1&email=rafaldruzba.00@gmail.com`,
			)
			const data = await res.json()

			if (data && data.length > 0) {
				const { lat, lon } = data[0]
				setMapCenter([parseFloat(lat), parseFloat(lon)])
			} else {
				setError(`Nie znaleziono lokalizacji dla: "${searchQuery}"`)
			}
		} catch (err) {
			setError('Błąd podczas wyszukiwania lokalizacji.')
		} finally {
			setIsSearching(false)
		}
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
										to={`/restaurants`}
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

			{/* Right side area: Map */}
			<section className='w-full relative bg-stone-100 flex-1 md:flex-grow min-h-[40%] md:min-h-0'>
				<MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }} scrollWheelZoom={true}>
					<TileLayer
						attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
						url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
					/>

					{/* Recenter handler */}
					<ChangeMapView center={mapCenter} />

					{/* Restaurants markers */}
					{restaurants
						.filter(r => r.coords !== null)
						.map(rest => (
							<Marker key={rest.id} position={rest.coords as [number, number]}>
								<Popup>
									<div className='p-1 min-w-[200px] font-sans'>
										<Link to={`/restaurants/${rest.slug}`} className='group/title block'>
											<h4 className='font-serif text-sm font-bold text-stone-950 mb-1 cursor-pointer group-hover/title:underline'>
												{rest.name}
											</h4>
										</Link>
										<p className='text-xs text-stone-600 mb-1.5 flex items-center gap-1'>
											<MapPin className='w-3.5 h-3.5 text-stone-400 shrink-0' />
											{rest.address ? `${rest.address}, ${rest.city}` : rest.city}
										</p>
										{rest.phone && (
											<p className='text-xs text-stone-500 mb-1.5 flex items-center gap-1'>
												<Phone className='w-3.5 h-3.5 text-stone-400 shrink-0' />
												{rest.phone}
											</p>
										)}
										<div className='border-t border-stone-100 pt-2 flex flex-col gap-2 mt-2'>
											<div className='flex justify-between items-center'>
												{rest.rating && (
													<span className='flex items-center gap-0.5 text-[10px] font-mono bg-stone-50 px-1 py-0.5 rounded'>
														<Star className='w-2.5 h-2.5 fill-yellow-400 text-yellow-400' />
														{rest.rating.toFixed(1)}
													</span>
												)}
												<Link
													to={`/restaurants/${rest.slug}`}
													className='text-[11px] font-mono uppercase tracking-wider text-black font-bold flex items-center gap-0.5 hover:underline'>
													Oferty <ArrowRight className='w-3 h-3' />
												</Link>
											</div>

											<a
												href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${rest.name}, ${rest.address || ''}, ${rest.city}`)}`}
												target='_blank'
												rel='noopener noreferrer'
												className='w-full text-center py-1.5 border border-stone-200 hover:border-black text-[10px] font-mono uppercase tracking-wider flex items-center justify-center gap-1 hover:bg-stone-50 transition-colors font-bold text-stone-700'>
												<Navigation className='w-3 h-3' /> Pokaż w Google Maps
											</a>
										</div>
									</div>
								</Popup>
							</Marker>
						))}
				</MapContainer>
			</section>
		</main>
	)
}
