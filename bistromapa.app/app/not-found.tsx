import Link from 'next/link'
import { UtensilsCrossed, Home, Search, ChefHat } from 'lucide-react'
import { getTranslations, getLocale } from 'next-intl/server'
import CountdownTimer from '@/components/ui/CountdownTimer'

export default async function NotFoundPage() {
	// 1. Pobieramy język wyryty przez middleware next-intl
	let locale = 'pl'
	try {
		locale = await getLocale()
	} catch {
		locale = 'pl'
	}

	// 2. Pobieramy tłumaczenia
	let t
	try {
		t = await getTranslations({ locale, namespace: 'NotFound' })
	} catch {
		t = (key: string) => key
	}

	// 3. Budujemy adresy URL z prefiksem języka (/pl lub /en)
	const homeUrl = `/${locale}`
	const restaurantsUrl = `/${locale}/restaurants`

	return (
		<main className='min-h-[85vh] w-full flex items-center justify-center px-4 py-12 bg-gradient-to-b from-stone-50 via-amber-50/20 to-stone-100/50'>
			<div className='w-full max-w-lg bg-white/90 backdrop-blur-md border border-stone-200/80 rounded-3xl p-6 sm:p-10 shadow-xl text-center space-y-6 sm:space-y-8 relative overflow-hidden'>
				{/* Tło dekoracyjne */}
				<div className='absolute -top-12 -right-12 w-32 h-32 bg-amber-100/50 rounded-full blur-2xl pointer-events-none' />
				<div className='absolute -bottom-12 -left-12 w-32 h-32 bg-stone-200/40 rounded-full blur-2xl pointer-events-none' />

				{/* Badge 404 */}
				<div className='relative mx-auto w-28 h-28 sm:w-32 sm:h-32 bg-stone-900 text-white rounded-3xl flex flex-col items-center justify-center shadow-lg transform -rotate-2 hover:rotate-0 transition-transform duration-300 group cursor-default'>
					<span className='font-serif text-4xl sm:text-5xl font-black tracking-wider text-amber-400'>404</span>
					<span className='text-[10px] sm:text-xs font-mono uppercase tracking-widest text-stone-300 flex items-center gap-1 mt-1'>
						<ChefHat className='w-3.5 h-3.5 text-amber-400' /> Przepalono
					</span>

					<div className='absolute -bottom-3 -right-3 w-10 h-10 bg-amber-500 text-stone-950 rounded-2xl flex items-center justify-center shadow-md border-2 border-white transform rotate-12 group-hover:scale-110 transition-transform'>
						<UtensilsCrossed className='w-5 h-5' />
					</div>
				</div>

				{/* Nagłówki i tekst */}
				<div className='space-y-3 sm:space-y-4'>
					<div className='inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-600 font-mono text-[11px] uppercase tracking-wider font-semibold border border-stone-200/60'>
						<span>🍽️ Błąd w zamówieniu</span>
					</div>

					<h1 className='text-2xl sm:text-3xl font-bold font-serif text-stone-900 tracking-tight'>
						Pusty talerz! Tego dania nie ma w menu.
					</h1>

					<p className='text-stone-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto font-sans'>
						Przeszukaliśmy całą kuchnię i zajrzeliśmy pod każdy stolik, ale ten adres wyparował. Pewnie kelner zjadł go
						po drodze do Twojego stolika! 🍕
					</p>
				</div>

				{/* Odliczanie skierowane na zlokalizowany URL strony głównej */}
				<CountdownTimer label='Zaraz przekierujemy Cię do głównej karty dań za' secondsUnit=' s' targetUrl={homeUrl} />

				{/* Linki z natywnego Next.js z uwzględnieniem /pl lub /en */}
				<div className='pt-2 flex flex-col sm:flex-row gap-3 justify-center items-center'>
					<Link
						href={homeUrl}
						className='w-full sm:w-auto flex-1 bg-stone-900 hover:bg-black text-white px-5 py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg active:scale-[0.98]'>
						<Home className='w-4 h-4 text-amber-400' />
						Karta Główna
					</Link>

					<Link
						href={restaurantsUrl}
						className='w-full sm:w-auto flex-1 bg-stone-100 hover:bg-stone-200 text-stone-800 px-5 py-3.5 rounded-xl font-mono text-xs uppercase tracking-wider font-semibold flex items-center justify-center gap-2 transition-all border border-stone-200 active:scale-[0.98]'>
						<Search className='w-4 h-4 text-stone-600' />
						Szukaj Lokali
					</Link>
				</div>
			</div>
		</main>
	)
}
