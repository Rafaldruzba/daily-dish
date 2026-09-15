import { Metadata } from 'next'
import { Navbar } from '@/components/ui/Navbar'
import { Footer } from '@/components/ui/Footer'
import { Preloader } from '@/components/ui/Preloader'
import { useLocation } from '@/context/LocationContext'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
	title: 'BistroMapa — Znajdź restauracje w swojej okolicy',
	description: 'Znajdź restauracje w swojej okolicy. Sprawdź menu, zdjęcia, opinie i odkrywaj nowe miejsca w BistroMapie.',
	openGraph: {
		title: 'BistroMapa — Znajdź restauracje w swojej okolicy',
		description: 'Znajdź restauracje w swojej okolicy. Sprawdź menu, zdjęcia, opinie i odkrywaj nowe miejsca w BistroMapie.',
		images: ['/og-image.jpg'],
	},
}

async function getDishes(city: string) {
	try {
		const res = await fetch(`${process.env.BACKEND_API_URL || 'http://localhost:3000'}/api/dishes/today?city=${encodeURIComponent(city)}`, {
			cache: 'no-store',
		})
		if (!res.ok) return []
		return res.json()
	} catch {
		return []
	}
}

async function getStats() {
	try {
		const res = await fetch(`${process.env.BACKEND_API_URL || 'http://localhost:3000'}/api/stats`, {
			cache: 'no-store',
		})
		if (!res.ok) return { views: 0 }
		return res.json()
	} catch {
		return { views: 0 }
	}
}

export default async function HomePage() {
	const { city } = useLocation()
	const [dishes, stats] = await Promise.all([
		getDishes(city),
		getStats(),
	])

	return (
		<div className='min-h-screen bg-[#fdfdfd] text-stone-900 flex flex-col font-sans selection:bg-black selection:text-white'>
			<Navbar />
			<div className='flex-grow flex flex-col'>
				<HomeClient initialDishes={dishes} initialStats={stats} city={city} />
			</div>
			<Footer />
			<Preloader />
		</div>
	)
}