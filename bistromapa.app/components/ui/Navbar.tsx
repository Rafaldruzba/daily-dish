'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Utensils, Store, LogIn, LogOut, User, Menu, X, Building, Map, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useLocation } from '@/context/LocationContext'
import { useTranslations } from 'next-intl'

export function Navbar() {
	const t = useTranslations('Navbar')
	const { user, logout } = useAuth()
	const { city, setCity, setLanguage, language } = useLocation()
	const pathname = usePathname()
	const router = useRouter()
	const [isOpen, setIsOpen] = useState(false)

	const handleChangeCity = () => {
		setCity('')
		localStorage.removeItem('user_city')
		window.location.reload()
	}

	const handleLanguageChange = (lang: 'pl' | 'en') => {
		setLanguage(lang)

		// pathname np. /restaurants/lodz
		// usuwamy obecny locale i dokładamy nowy
		const segments = pathname.split('/').filter(Boolean)

		if (segments[0] === 'pl' || segments[0] === 'en') {
			segments[0] = lang
		} else {
			segments.unshift(lang)
		}

		const newPath = '/' + segments.join('/')

		router.push(newPath)
		setIsOpen(false)
	}

	const navLinkClass = (active: boolean) =>
		`px-4 py-2 border-b-2 transition-colors ${
			active ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-black'
		}`

	const isPolish = language === 'pl'

	return (
		<div className='relative'>
			{/* Mobile menu button */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className='md:hidden p-2 text-stone-700 hover:text-black focus:outline-none cursor-pointer'
				aria-label='Toggle Menu'>
				{isOpen ? <X className='w-6 h-6' /> : <Menu className='w-6 h-6' />}
			</button>

			{/* Desktop Navigation */}
			<nav className='hidden md:flex items-center gap-1 font-mono text-xs uppercase tracking-wider'>
				<button
					onClick={handleChangeCity}
					className='flex items-center gap-2 bg-stone-100 border border-stone-200 px-3 py-1.5 hover:bg-stone-200 hover:border-stone-300 transition-colors'>
					<MapPin className='w-3.5 h-3.5 text-stone-500' />
					<span className='text-stone-700 font-semibold'>{city}</span>
				</button>

				<div className='h-4 w-px bg-stone-200 mx-2'></div>

				<Link href={`/${language}`} className={navLinkClass(pathname === `/${language}`)}>
					<span className='flex items-center gap-1.5'>
						<Utensils className='w-3.5 h-3.5' />
						{t('home')}
					</span>
				</Link>

				<Link href={`/${language}/restaurants`} className={navLinkClass(pathname === `/${language}/restaurants`)}>
					<span className='flex items-center gap-1.5'>
						<Store className='w-3.5 h-3.5' />
						{t('catalog')}
					</span>
				</Link>

				<Link href={`/${language}/map`} className={navLinkClass(pathname === `/${language}/map`)}>
					<span className='flex items-center gap-1.5'>
						<Map className='w-3.5 h-3.5' />
						{t('map')}
					</span>
				</Link>

				<Link
					href={`/${language}/for-restaurants`}
					className={navLinkClass(pathname === `/${language}/for-restaurants`)}>
					<span className='flex items-center gap-1.5'>
						<Building className='w-3.5 h-3.5' />
						{user ? t('profile') : t('for-restaurants')}
					</span>
				</Link>

				<div className='h-4 w-px bg-stone-200 mx-2'></div>

				{/* Language switch */}
				<div className='flex items-center border border-stone-200 bg-stone-50'>
					<button
						onClick={() => handleLanguageChange('pl')}
						className={`px-2.5 py-1.5 transition-colors ${
							isPolish ? 'bg-black text-white' : 'text-stone-500 hover:text-black hover:bg-stone-100'
						}`}>
						PL
					</button>

					<button
						onClick={() => handleLanguageChange('en')}
						className={`px-2.5 py-1.5 transition-colors ${
							!isPolish ? 'bg-black text-white' : 'text-stone-500 hover:text-black hover:bg-stone-100'
						}`}>
						EN
					</button>
				</div>

				<div className='h-4 w-px bg-stone-200 mx-2'></div>

				{user ? (
					<div className='flex items-center gap-3'>
						<span className='text-stone-400 flex items-center gap-1 text-[11px] font-sans normal-case'>
							<User className='w-3.5 h-3.5 text-stone-500' />
							{user.name || user.email}

							{user.role === 'ADMIN' && (
								<span className='text-[9px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 ml-1 font-mono'>
									Admin
								</span>
							)}
						</span>

						<button
							onClick={logout}
							className='px-3 py-1.5 border border-stone-200 text-stone-700 hover:border-black hover:text-black transition-colors flex items-center gap-1.5 cursor-pointer'>
							<LogOut className='w-3.5 h-3.5' />
							{t('logout')}
						</button>
					</div>
				) : (
					<div className='flex items-center gap-2'>
						<Link
							href={`/${language}/login`}
							className='px-3 py-1.5 text-stone-700 hover:text-black transition-colors flex items-center gap-1.5'>
							<LogIn className='w-3.5 h-3.5' />
							{t('login')}
						</Link>

						<Link
							href={`/${language}/register`}
							className='px-3 py-1.5 bg-black text-white hover:bg-stone-900 transition-colors flex items-center gap-1.5'>
							{t('register')}
						</Link>
					</div>
				)}
			</nav>

			{/* Mobile Navigation Dropdown */}
			{isOpen && (
				<div className='absolute right-0 top-12 w-64 bg-white border border-stone-200 shadow-lg py-3 px-4 z-50 flex flex-col gap-2 font-mono text-xs uppercase tracking-wider md:hidden'>
					<button
						onClick={handleChangeCity}
						className='w-full flex items-center gap-2 bg-stone-50 border border-stone-200 px-3 py-2.5 hover:bg-stone-100 hover:border-stone-300 transition-colors mb-2'>
						<MapPin className='w-4 h-4 text-stone-500' />
						<span className='text-stone-800 font-semibold normal-case'>{city}</span>
					</button>

					<div className='flex flex-col gap-3'>
						<Link
							href={`/${language}`}
							onClick={() => setIsOpen(false)}
							className={`py-2 flex items-center gap-2 ${
								pathname === `/${language}` ? 'text-black font-bold' : 'text-stone-500'
							}`}>
							<Utensils className='w-4 h-4' />
							{t('home')}
						</Link>

						<Link
							href={`/${language}/restaurants`}
							onClick={() => setIsOpen(false)}
							className={`py-2 flex items-center gap-2 ${
								pathname === `/${language}/restaurants` ? 'text-black font-bold' : 'text-stone-500'
							}`}>
							<Store className='w-4 h-4' />
							{t('catalog')}
						</Link>

						<Link
							href={`/${language}/map`}
							onClick={() => setIsOpen(false)}
							className={`py-2 flex items-center gap-2 ${
								pathname === `/${language}/map` ? 'text-black font-bold' : 'text-stone-500'
							}`}>
							<Map className='w-4 h-4' />
							{t('map')}
						</Link>

						<Link
							href={`/${language}/for-restaurants`}
							onClick={() => setIsOpen(false)}
							className={`py-2 flex items-center gap-2 ${
								pathname === `/${language}/for-restaurants` ? 'text-black font-bold' : 'text-stone-500'
							}`}>
							<Building className='w-4 h-4' />
							{user ? t('profile') : t('for-restaurants')}
						</Link>
					</div>

					<hr className='border-stone-100 my-1' />

					{/* Mobile language switch */}
					<div className='flex items-center justify-between py-2'>
						<span className='text-[10px] text-stone-400 tracking-widest'>{t('language')}</span>

						<div className='flex items-center border border-stone-200 bg-stone-50'>
							<button
								onClick={() => handleLanguageChange('pl')}
								className={`px-3 py-1.5 transition-colors ${
									isPolish ? 'bg-black text-white' : 'text-stone-500 hover:text-black hover:bg-stone-100'
								}`}>
								PL
							</button>

							<button
								onClick={() => handleLanguageChange('en')}
								className={`px-3 py-1.5 transition-colors ${
									!isPolish ? 'bg-black text-white' : 'text-stone-500 hover:text-black hover:bg-stone-100'
								}`}>
								EN
							</button>
						</div>
					</div>

					<hr className='border-stone-100 my-1' />

					{user ? (
						<div className='flex flex-col gap-3'>
							<div className='flex flex-col gap-0.5 normal-case font-sans text-stone-600 text-xs'>
								<span className='font-semibold text-stone-900 flex items-center gap-1'>
									<User className='w-3.5 h-3.5' />
									{user.name || t('user')}
								</span>

								<span className='text-[10px] text-stone-400'>{user.email}</span>

								{user.role === 'ADMIN' && (
									<span className='text-[8px] uppercase tracking-widest bg-black text-white px-1.5 py-0.5 w-max font-mono mt-1'>
										Admin
									</span>
								)}
							</div>

							<button
								onClick={() => {
									logout()
									setIsOpen(false)
								}}
								className='w-full py-2 border border-stone-200 text-stone-700 hover:border-black hover:text-black transition-colors flex items-center justify-center gap-1.5 cursor-pointer'>
								<LogOut className='w-3.5 h-3.5' />
								{t('logout')}
							</button>
						</div>
					) : (
						<div className='flex flex-col gap-2'>
							<Link
								href={`/${language}/login`}
								onClick={() => setIsOpen(false)}
								className='w-full py-2 border border-stone-200 text-stone-700 hover:border-black hover:text-black transition-colors flex items-center justify-center gap-1.5'>
								<LogIn className='w-3.5 h-3.5' />
								{t('login')}
							</Link>

							<Link
								href={`/${language}/register`}
								onClick={() => setIsOpen(false)}
								className='w-full py-2 bg-black text-white hover:bg-stone-900 transition-colors flex items-center justify-center gap-1.5 text-center'>
								{t('register')}
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
