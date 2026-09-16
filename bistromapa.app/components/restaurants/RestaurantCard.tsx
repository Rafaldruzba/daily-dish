'use client'

import { useAuth } from '@/context/AuthContext'
import { useLocation } from '@/context/LocationContext'
import { Restaurant } from '@/lib/types'
import { formatCuisine } from '@/lib/format'
import { Heart, MapPin, Phone, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface RestaurantCardProps {
	restaurant: Restaurant
}

export default function RestaurantCard({ restaurant }: RestaurantCardProps) {
	const router = useRouter()
	const { city } = useLocation()
	const { user, toggleFavorite, isFavorite } = useAuth()

	const isFav = isFavorite(restaurant.id)
	const isPromoted =
		restaurant.isPromoted ||
		(restaurant.subscription?.status === 'ACTIVE' && restaurant.subscription?.type === 'PROMOTION')

	const isUserVicinity = city && restaurant.city.toLowerCase().trim() === city.toLowerCase().trim()

	return (
		<div
			key={restaurant.id}
			onClick={e => {
				if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('a')) {
					return
				}
				router.push(`/restaurant/${restaurant.slug}`)
			}}
			className={`cursor-pointer relative overflow-hidden p-6 border bg-white flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 transition-all ${
				!restaurant.isActive
					? 'opacity-65 border-stone-200'
					: isUserVicinity
						? 'border-stone-300 hover:border-black hover:shadow-sm bg-stone-50/20'
						: 'border-stone-200 hover:border-black hover:shadow-sm'
			}`}>
			{isPromoted && (
				<div className='absolute top-0 left-0 w-16 h-16 overflow-hidden pointer-events-none z-10'>
					<div className='absolute top-[8px] left-[-24px] w-20 h-5 bg-green-600 text-white flex items-center justify-center -rotate-45 font-mono text-[8px] font-bold shadow-sm'>
						★
					</div>
				</div>
			)}

			<div className='space-y-3 flex-grow pl-2 text-left'>
				<div className='flex flex-wrap items-start sm:items-center gap-3'>
					<div className='w-8 h-8 bg-stone-100 flex items-center justify-center font-serif text-sm font-bold border border-stone-200 text-stone-800 shrink-0'>
						R
					</div>
					<div>
						<div className='flex items-center gap-2 flex-wrap'>
							<h3 className='text-base font-bold font-serif text-stone-900'>{restaurant.name}</h3>

							{restaurant.rating ? (
								<span className='flex items-center text-xs text-stone-900 bg-stone-100 px-2 py-0.5 font-bold font-mono'>
									<Star className='w-3 h-3 fill-black mr-0.5' />
									{Number(restaurant.rating).toFixed(1)}
								</span>
							) : (
								<span className='text-[10px] text-stone-400 font-mono'>Brak ocen</span>
							)}

							{isUserVicinity && (
								<span className='text-[9px] font-mono font-bold uppercase tracking-wider bg-black text-white px-2 py-0.5'>
									W Twojej okolicy
								</span>
							)}
						</div>
						{restaurant.cuisines && restaurant.cuisines.length > 0 && (
							<span className='flex flex-wrap gap-1.5 mt-1.5'>
								{restaurant.cuisines.map(cuisine => (
									<span
										key={cuisine}
										className='font-mono text-[9px] tracking-wider text-stone-500 uppercase border border-stone-200 bg-stone-50 px-1.5 py-0.5'>
										{formatCuisine(cuisine)}
									</span>
								))}
							</span>
						)}
					</div>
				</div>

				<div className='grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs text-stone-500 font-sans'>
					<p className='flex items-center gap-1.5'>
						<MapPin className='w-3.5 h-3.5 text-stone-400 shrink-0' />
						{restaurant.city}
						{restaurant.address ? `, ${restaurant.address}` : ''}
					</p>

					{restaurant.phone && (
						<p className='flex items-center gap-1.5'>
							<Phone className='w-3.5 h-3.5 text-stone-400 shrink-0' />
							<a href={`tel:${restaurant.phone}`} className='hover:text-black'>
								{restaurant.phone}
							</a>
						</p>
					)}
				</div>
			</div>
			{/* Actions */}
			<div className='flex flex-wrap items-center gap-3 shrink-0 self-end sm:self-auto'>
				{!restaurant.isActive && (
					<span className='text-[10px] font-mono uppercase bg-stone-100 text-stone-500 border border-stone-200 px-2 py-1 font-bold'>
						Scrapowanie wstrzymane
					</span>
				)}

				{user && (restaurant.status === 'APPROVED' || restaurant.status === 'ACTIVE') && (
					<button
						onClick={() => toggleFavorite(restaurant.id)}
						className={`p-2 border rounded-full transition-all flex items-center justify-center gap-1 text-xs cursor-pointer ${
							isFav
								? 'border-red-200 bg-red-50 text-red-500 hover:scale-105 shadow-sm'
								: 'border-stone-200 text-stone-400 hover:text-black hover:border-stone-400'
						}`}>
						<Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
						{isFav && <span className='font-mono text-[10px] uppercase tracking-wider mr-1'>Ulubiona</span>}
					</button>
				)}

				<Link
					href={`/restaurant/${restaurant.slug}`}
					className='px-3 py-2 border border-black text-black hover:bg-black hover:text-white transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer font-bold'>
					Zobacz profil
				</Link>

				{restaurant.facebookUrl && (
					<button
						type='button'
						onClick={e => {
							e.preventDefault()
							e.stopPropagation()
							window.open(restaurant.facebookUrl as string, '_blank', 'noopener,noreferrer')
						}}
						className='px-3 py-2 border border-stone-200 text-stone-600 hover:border-black hover:bg-stone-50 transition-colors font-mono text-[10px] uppercase tracking-wider flex items-center gap-1 cursor-pointer bg-white'>
						Facebook
					</button>
				)}
			</div>
		</div>
	)
}
