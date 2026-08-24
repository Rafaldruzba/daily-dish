import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { LocationProvider } from './context/LocationContext.tsx'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<LocationProvider>
					<App />
				</LocationProvider>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>
)
