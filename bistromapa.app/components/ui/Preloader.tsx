'use client'

import { useState } from 'react'
import { useLocation } from '@/context/LocationContext'
import { MapPin } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/lib/navigation'

export function Preloader() {
	const router = useRouter()
	const t = useTranslations('Preloader')
	const { setCity, setLanguage } = useLocation()
	const [currentCity, setCurrentCity] = useState('')

	const pickLang = (lang: 'pl' | 'en') => {
		setLanguage(lang)
		router.replace('/', { locale: lang })
	}

	const handleStart = () => {
		if (currentCity.trim()) {
			setCity(currentCity.trim())
		}
	}

	return (
		<div className='fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4'>
			<div className='w-full max-w-md text-center'>
				<img src='/bistro-logo.png' alt='Bistro Mapa Logo' className='w-48 h-48 mx-auto' />
				<h1 className='text-4xl font-black font-serif tracking-tight text-stone-900 mb-2'>{t('title')}</h1>
				<p className='text-stone-500 mb-8'>{t('subtitle')}</p>
				<div className='relative mb-4'>
					<MapPin className='absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400' />
					<input
						type='text'
						value={currentCity}
						onChange={e => setCurrentCity(e.target.value)}
						onKeyDown={e => e.key === 'Enter' && handleStart()}
						placeholder={t('inputPlaceholder')}
						className='w-full pl-12 pr-4 py-4 border border-stone-300 rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-colors'
					/>
				</div>
				<button
					onClick={handleStart}
					disabled={!currentCity.trim()}
					className='w-full bg-orange-500 text-white font-bold py-4 rounded-md hover:bg-orange-600 transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed'>
					{t('searchBtn')}
				</button>
				<p className='text-xs text-stone-400 mt-3 font-mono'>({t('radius')})</p>
				<div className='mt-12'>
					<p className='text-xs text-stone-400 mb-2 font-mono uppercase tracking-widest'>Język / Language</p>
					<div className='flex items-center justify-center gap-2'>
						<button
							onClick={() => pickLang('pl')}
							className='px-3 py-1 border border-stone-200 rounded-md text-sm hover:bg-stone-100 transition-colors'>
							🇵🇱 {t('languagePolish')}
						</button>
						<button
							onClick={() => pickLang('en')}
							className='px-3 py-1 border border-stone-200 rounded-md text-sm hover:bg-stone-100 transition-colors'>
							🇬🇧 {t('languageEnglish')}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
