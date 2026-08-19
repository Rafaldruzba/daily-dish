import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import './App.css'
import HomePage from './pages/HomePage'
import RestaurantsPage from './pages/RestaurantsPage'

function Navigation() {
	return (
		<nav className='navigation'>
			<NavLink to='/' end className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
				🍽️ Dzisiejsze dania
			</NavLink>

			<NavLink to='/restaurants' className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
				🏪 Restauracje
			</NavLink>
		</nav>
	)
}

function App() {
	return (
		<BrowserRouter>
			<div className='app'>
				<header className='topbar'>
					<div className='topbar-inner'>
						<NavLink to='/' className='logo'>
							<div className='logo-icon'>🍴</div>

							<div>
								<div className='logo-title'>DAILY DISH</div>

								<div className='logo-subtitle'>Co dziś jemy?</div>
							</div>
						</NavLink>

						<Navigation />
					</div>
				</header>

				<Routes>
					<Route path='/' element={<HomePage />} />

					<Route path='/restaurants' element={<RestaurantsPage />} />
				</Routes>
			</div>
		</BrowserRouter>
	)
}

export default App
