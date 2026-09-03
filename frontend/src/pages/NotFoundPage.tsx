import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Home, Compass } from 'lucide-react'

export default function NotFoundPage() {
	const navigate = useNavigate()
	const [countdown, setCountdown] = useState(5)

	useEffect(() => {
		const timer = setInterval(() => {
			setCountdown(prev => {
				if (prev <= 1) {
					clearInterval(timer)
					navigate('/')
					return 0
				}
				return prev - 1
			})
		}, 1000)

		return () => clearInterval(timer)
	}, [navigate])

	return (
		<main className='min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#fafafa] animate-fade-in'>
			<div className='w-full max-w-md bg-white border border-stone-200 p-8 md:p-10 shadow-sm text-center space-y-6'>
				<div className='relative w-24 h-24 bg-stone-50 border border-stone-200 flex items-center justify-center mx-auto rounded-none'>
					<span className='font-serif text-5xl font-black text-stone-900'>404</span>
					<div className='absolute -bottom-2 -right-2 w-8 h-8 bg-black text-white flex items-center justify-center'>
						<Compass className='w-4 h-4 animate-spin' style={{ animationDuration: '6s' }} />
					</div>
				</div>

				<div className='space-y-2'>
					<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>Błąd nawigacji</span>
					<h1 className='text-2xl font-bold font-serif text-stone-900'>Zagubiono drogę</h1>
					<p className='text-stone-500 text-xs leading-relaxed max-w-sm mx-auto font-sans'>
						Strona, której szukasz, nie istnieje lub została przeniesiona. Nie martw się, sprowadzimy Cię z powrotem na
						właściwy szlak.
					</p>
				</div>

				<div className='bg-stone-50 border border-stone-100 p-3 text-[11px] font-mono text-stone-500'>
					Automatyczne przekierowanie do strony głównej za <span className='font-bold text-black'>{countdown}s</span>...
				</div>

				<div className='pt-2'>
					<Link
						to='/'
						className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer'>
						<Home className='w-4 h-4' />
						Wróć do strony głównej
					</Link>
				</div>
			</div>
		</main>
	)
}
