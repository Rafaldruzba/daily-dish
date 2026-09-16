'use client'

import { Navbar } from '@/components/ui/Navbar'
import { Footer } from '@/components/ui/Footer'
import { usePathname } from 'next/navigation'

export default function MainLayout({ children }: { children: React.ReactNode }) {
	const pathname = usePathname()
	const isMapPage = pathname?.startsWith('/map')

	return (
		<div className={`flex flex-col ${isMapPage ? 'h-screen overflow-hidden' : 'min-h-screen md:h-screen'}`}>
			<header className='shrink-0 sticky top-0 z-40 bg-white border-b border-stone-200 px-4 sm:px-6 py-4'>
				<div className='max-w-6xl mx-auto flex items-center justify-between'>
					<a href='/' className='flex items-center gap-2 group'>
						<img src='/bistro-logo.png' alt='Bistro Mapa' className='w-8 h-8' />
						<span className='font-mono text-base font-black tracking-widest text-stone-900 group-hover:text-stone-700 transition-colors'>
							BISTRO MAPA
						</span>
					</a>
					<Navbar />
				</div>
			</header>

			<div className={isMapPage ? 'flex-1 min-h-0 overflow-hidden' : 'flex-grow'}>{children}</div>

			{!isMapPage && <Footer />}
		</div>
	)
}
