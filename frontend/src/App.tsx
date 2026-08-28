import { Routes, Route, NavLink, Link } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import HomePage from './pages/HomePage'
import RestaurantsPage from './pages/RestaurantsPage'
import ForRestaurantsPage from './pages/ForRestaurantsPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import MapPage from './pages/MapPage'
import RestaurantDetailPage from './pages/RestaurantDetailPage'
import { Utensils, Store, LogIn, LogOut, User, Menu, X, Building, Map, MapPin } from 'lucide-react'
import { useState } from 'react'
import { useLocation } from './context/LocationContext'
import { Preloader } from './components/Preloader'

function Navigation() {
	const { user, logout } = useAuth()
	const { city, setCity } = useLocation()
	const [isOpen, setIsOpen] = useState(false)

	const handleChangeCity = () => {
		// Resetting the city will trigger the Preloader
		setCity('')
		localStorage.removeItem('user_city')
		window.location.reload() // Force a reload to re-evaluate the context state
	}
	console.log(user?.role)
	console.log(user?.id)

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

				<NavLink
					to='/'
					end
					className={({ isActive }) =>
						`px-4 py-2 border-b-2 transition-colors ${
							isActive ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-black'
						}`
					}>
					<span className='flex items-center gap-1.5'>
						<Utensils className='w-3.5 h-3.5' />
						Dania dnia
					</span>
				</NavLink>

				<NavLink
					to='/restaurants'
					className={({ isActive }) =>
						`px-4 py-2 border-b-2 transition-colors ${
							isActive ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-black'
						}`
					}>
					<span className='flex items-center gap-1.5'>
						<Store className='w-3.5 h-3.5' />
						Katalog
					</span>
				</NavLink>

				<NavLink
					to='/map'
					className={({ isActive }) =>
						`px-4 py-2 border-b-2 transition-colors ${
							isActive ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-black'
						}`
					}>
					<span className='flex items-center gap-1.5'>
						<Map className='w-3.5 h-3.5' />
						Mapa lokali
					</span>
				</NavLink>

				<NavLink
					to='/for-restaurants'
					className={({ isActive }) =>
						`px-4 py-2 border-b-2 transition-colors ${
							isActive ? 'border-black text-black font-bold' : 'border-transparent text-stone-500 hover:text-black'
						}`
					}>
					<span className='flex items-center gap-1.5'>
						<Building className='w-3.5 h-3.5' />
						{user ? 'PROFIL' : 'DLA RESTAURACJI'}
					</span>
				</NavLink>

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
							Wyloguj
						</button>
					</div>
				) : (
					<div className='flex items-center gap-2'>
						<Link
							to='/login'
							className='px-3 py-1.5 text-stone-700 hover:text-black transition-colors flex items-center gap-1.5'>
							<LogIn className='w-3.5 h-3.5' />
							Zaloguj
						</Link>
						<Link
							to='/register'
							className='px-3 py-1.5 bg-black text-white hover:bg-stone-900 transition-colors flex items-center gap-1.5'>
							Zarejestruj
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
						<NavLink
							to='/'
							end
							onClick={() => setIsOpen(false)}
							className={({ isActive }) =>
								`py-2 flex items-center gap-2 ${isActive ? 'text-black font-bold' : 'text-stone-500'}`
							}>
							<Utensils className='w-4 h-4' />
							Dania dnia
						</NavLink>

						<NavLink
							to='/restaurants'
							onClick={() => setIsOpen(false)}
							className={({ isActive }) =>
								`py-2 flex items-center gap-2 ${isActive ? 'text-black font-bold' : 'text-stone-500'}`
							}>
							<Store className='w-4 h-4' />
							Katalog
						</NavLink>

						<NavLink
							to='/map'
							onClick={() => setIsOpen(false)}
							className={({ isActive }) =>
								`py-2 flex items-center gap-2 ${isActive ? 'text-black font-bold' : 'text-stone-500'}`
							}>
							<Map className='w-4 h-4' />
							Mapa lokali
						</NavLink>

						<NavLink
							to='/for-restaurants'
							onClick={() => setIsOpen(false)}
							className={({ isActive }) =>
								`py-2 flex items-center gap-2 ${isActive ? 'text-black font-bold' : 'text-stone-500'}`
							}>
							<Building className='w-4 h-4' />
							{user ? 'PROFIL' : 'DLA RESTAURACJI'}
						</NavLink>
					</div>

					<hr className='border-stone-100 my-1' />

					{user ? (
						<div className='flex flex-col gap-3'>
							<div className='flex flex-col gap-0.5 normal-case font-sans text-stone-600 text-xs'>
								<span className='font-semibold text-stone-900 flex items-center gap-1'>
									<User className='w-3.5 h-3.5' />
									{user.name || 'Użytkownik'}
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
								Wyloguj
							</button>
						</div>
					) : (
						<div className='flex flex-col gap-2'>
							<Link
								to='/login'
								onClick={() => setIsOpen(false)}
								className='w-full py-2 border border-stone-200 text-stone-700 hover:border-black hover:text-black transition-colors flex items-center justify-center gap-1.5'>
								<LogIn className='w-3.5 h-3.5' />
								Zaloguj
							</Link>
							<Link
								to='/register'
								onClick={() => setIsOpen(false)}
								className='w-full py-2 bg-black text-white hover:bg-stone-900 transition-colors flex items-center justify-center gap-1.5 text-center'>
								Zarejestruj
							</Link>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

function AppContent() {
	return (
		<div className='min-h-screen bg-[#fdfdfd] text-stone-900 flex flex-col font-sans selection:bg-black selection:text-white'>
			{/* Topbar */}
			<header className='sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-stone-200'>
				<div className='max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4'>
					<Link to='/' className='flex items-center gap-2.5 group'>
						<div className='w-8 h-8 bg-black text-white flex items-center justify-center font-serif text-lg font-bold group-hover:scale-105 transition-transform'>
							D
						</div>
						<div>
							<span className='font-mono text-sm font-black tracking-widest block text-stone-900 leading-none'>
								DAILY DISH
							</span>
							<span className='text-[10px] text-stone-400 font-sans tracking-wide block mt-1'>
								B&W Minimal Food Discoverer
							</span>
						</div>
					</Link>

					<Navigation />
				</div>
			</header>

			{/* Main Content Area */}
			<div className='flex-grow'>
				<Routes>
					<Route path='/' element={<HomePage />} />
					<Route path='/restaurants' element={<RestaurantsPage />} />
					<Route path='/restaurants/:slug' element={<RestaurantDetailPage />} />
					<Route path='/map' element={<MapPage />} />
					<Route path='/for-restaurants' element={<ForRestaurantsPage />} />
					<Route path='/login' element={<LoginPage />} />
					<Route path='/register' element={<RegisterPage />} />
				</Routes>
			</div>

			{/* Footer */}
			<footer className='border-t border-stone-200 bg-white py-12 px-4 mt-auto'>
				<div className='max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6'>
					<div className='flex items-center gap-2'>
						<span className='font-mono text-xs tracking-widest text-stone-400 uppercase'>
							© {new Date().getFullYear()} Daily Dish. Wszystkie prawa zastrzeżone.
						</span>
					</div>

					<div className='flex items-center gap-6 font-mono text-xs text-stone-400'>
						<a href='#' className='hover:text-black transition-colors'>
							Regulamin
						</a>
						<span>•</span>
						<a href='#' className='hover:text-black transition-colors'>
							Prywatność
						</a>
						<span>•</span>
						<a
							href='https://github.com'
							target='_blank'
							rel='noreferrer'
							className='hover:text-black transition-colors'>
							GitHub
						</a>
					</div>
				</div>
			</footer>
		</div>
	)
}

function App() {
	const { city } = useLocation()

	if (!city) {
		return <Preloader />
	}

	return <AppContent />
}

export default App
