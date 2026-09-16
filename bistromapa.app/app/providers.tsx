'use client'

import { GoogleReCaptchaProvider } from 'react-google-recaptcha-v3'
import { AuthProvider } from '@/context/AuthContext'
import { LocationProvider } from '@/context/LocationContext'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
	const recaptchaKey = process.env.NEXT_PUBLIC_RECAPTCHA_PUBLIC

	// Jeśli nie ma klucza reCAPTCHA, nie wrapperuj w provider (unika błędu)
	if (!recaptchaKey) {
		return (
			<LocationProvider>
				<AuthProvider>
					{children}
				</AuthProvider>
			</LocationProvider>
		)
	}

	return (
		<GoogleReCaptchaProvider reCaptchaKey={recaptchaKey!}>
			<LocationProvider>
				<AuthProvider>
					{children}
				</AuthProvider>
			</LocationProvider>
		</GoogleReCaptchaProvider>
	)
}