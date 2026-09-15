import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AuthProvider } from './context/AuthContext.tsx'
import { LocationProvider } from './context/LocationContext.tsx'
import { BrowserRouter } from 'react-router-dom'
import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'

createRoot(document.getElementById('root')!).render(
	<StrictMode>
		<BrowserRouter>
			<AuthProvider>
				<GoogleReCaptchaProvider reCaptchaKey={import.meta.env.VITE_RECAPTCHA_PUBLIC}>
					<LocationProvider>
						<App />
					</LocationProvider>
				</GoogleReCaptchaProvider>
			</AuthProvider>
		</BrowserRouter>
	</StrictMode>,
)
