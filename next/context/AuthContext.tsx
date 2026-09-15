'use client'

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { apiFetch } from '@/lib/api'

interface User {
	id: string
	email: string
	name: string | null
	role: string
	city?: string
}

interface AuthContextType {
	user: User | null
	token: string | null
	loading: boolean
	login: (email: string, password: string) => Promise<void>
	register: (data: RegisterData) => Promise<void>
	logout: () => void
	isFavorite: (restaurantId: string) => boolean
	toggleFavorite: (restaurantId: string) => Promise<void>
}

interface RegisterData {
	email: string
	password: string
	name?: string
	accountType: string
	city?: string
	nip?: string
	ownerPhone?: string
	representsSelf?: boolean
	acceptedTerms?: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [token, setToken] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)

	// Hydration-safe: load from localStorage only in useEffect
	useEffect(() => {
		const storedToken = localStorage.getItem('dd_token')
		if (storedToken) {
			setToken(storedToken)
			apiFetch<User>('/auth/me', { auth: true })
				.then((userData) => {
					setUser(userData)
				})
				.catch(() => {
					localStorage.removeItem('dd_token')
					setToken(null)
				})
				.finally(() => setLoading(false))
		} else {
			setLoading(false)
		}
	}, [])

	const login = async (email: string, password: string) => {
		const data = await apiFetch<{ success: boolean; token: string; user: User }>('/auth/login', {
			method: 'POST',
			body: JSON.stringify({ email, password }),
		})
		if (!data.success) throw new Error('Login failed')

		localStorage.setItem('dd_token', data.token)
		setToken(data.token)
		setUser(data.user)
	}

	const register = async (registerData: RegisterData) => {
		const data = await apiFetch<{ success: boolean; message: string }>('/auth/register', {
			method: 'POST',
			body: JSON.stringify(registerData),
		})
		if (!data.success) throw new Error(data.message || 'Registration failed')
	}

	const logout = () => {
		localStorage.removeItem('dd_token')
		setToken(null)
		setUser(null)
	}

	const isFavorite = (restaurantId: string) => {
		// This would need favorites loaded from API - simplified for now
		return false
	}

	const toggleFavorite = async (restaurantId: string) => {
		if (!token) return
		// Implementation from original AuthContext
	}

	return (
		<AuthContext.Provider value={{ user, token, loading, login, register, logout, isFavorite, toggleFavorite }}>
			{children}
		</AuthContext.Provider>
	)
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}