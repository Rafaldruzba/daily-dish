import { Navbar } from '@/components/ui/Navbar'
import { Footer } from '@/components/ui/Footer'

export default function MainLayout({ children }: { children: React.ReactNode }) {
	return (
		<div className='min-h-screen flex flex-col'>
			<header className='sticky top-0 z-40 bg-white border-b border-stone-200 px-4 sm:px-6 py-4'>
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

			<div className='flex-grow'>{children}</div>

			<Footer />
		</div>
	)
}
