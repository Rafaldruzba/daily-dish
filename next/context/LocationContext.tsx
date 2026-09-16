'use client'

import { LocationContextType } from '@/lib/types'
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

const LocationContext = createContext<LocationContextType | undefined>(undefined)

const DEFAULT_LANGUAGE = 'pl'

export function LocationProvider({ children }: { children: ReactNode }) {
	const [city, setCityState] = useState<string>('')
	const [language, setLanguageState] = useState<string>(DEFAULT_LANGUAGE)

	// Hydration-safe: read from localStorage only in useEffect
	useEffect(() => {
		const storedCity = localStorage.getItem('user_city')
		const storedLang = localStorage.getItem('user_language')
		if (storedCity) setCityState(storedCity)
		if (storedLang) setLanguageState(storedLang)
	}, [])

	const setCity = (newCity: string) => {
		setCityState(newCity)
		if (newCity) {
			localStorage.setItem('user_city', newCity)
		} else {
			localStorage.removeItem('user_city')
		}
	}

	const setLanguage = (lang: string) => {
		setLanguageState(lang)
		localStorage.setItem('user_language', lang)
	}

	return (
		<LocationContext.Provider value={{ city, setCity, language, setLanguage }}>{children}</LocationContext.Provider>
	)
}

export function useLocation() {
	const context = useContext(LocationContext)
	if (context === undefined) {
		throw new Error('useLocation must be used within a LocationProvider')
	}
	return context
}
