import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

export interface User {
	id: string
	email: string
	name: string | null
	role: string
	city: string | null
}

interface AuthContextType {
	user: User | null
	token: string | null
	favorites: string[] // IDs of favorite restaurants
	loading: boolean
	login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>
	register: (
		email: string,
		password: string,
		name?: string,
		accountType?: string,
		city?: string,
		nip?: string,
		ownerPhone?: string,
		representsSelf?: boolean,
		acceptedTerms?: boolean
	) => Promise<{ success: boolean; message?: string }>
	verifyRegister: (email: string, code: string) => Promise<{ success: boolean; message?: string }>
	logout: () => void
	toggleFavorite: (restaurantId: string) => Promise<boolean>
	isFavorite: (restaurantId: string) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const API_URL = import.meta.env.VITE_API_URL || '/api'

export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<User | null>(null)
	const [token, setToken] = useState<string | null>(localStorage.getItem('dd_token'))
	const [favorites, setFavorites] = useState<string[]>([])
	const [loading, setLoading] = useState(true)

	// Fetch current user and favorites on load if token exists
	useEffect(() => {
		async function initAuth() {
			if (!token) {
				setLoading(false)
				return
			}

			try {
				// Get user profile
				const userRes = await fetch(`${API_URL}/auth/me`, {
					headers: {
						Authorization: `Bearer ${token}`,
					},
				})

				if (userRes.ok) {
					const userData = await userRes.json()
					setUser(userData.user)

					// Get favorite restaurants
					const favsRes = await fetch(`${API_URL}/restaurants/favorites`, {
						headers: {
							Authorization: `Bearer ${token}`,
						},
					})

					if (favsRes.ok) {
						const favsData = await favsRes.json()
						setFavorites(favsData.map((r: { id: string }) => r.id))
					}
				} else {
					// Token expired or invalid
					handleLogout()
				}
			} catch (error) {
				console.error('Błąd inicjalizacji sesji:', error)
			} finally {
				setLoading(false)
			}
		}

		initAuth()
	}, [token])

	const handleLogout = () => {
		setUser(null)
		setToken(null)
		setFavorites([])
		localStorage.removeItem('dd_token')
	}

	const login = async (email: string, password: string) => {
		try {
			const res = await fetch(`${API_URL}/auth/login`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, password }),
			})

			const data = await res.json()

			if (!res.ok) {
				return { success: false, message: data.message || 'Błąd logowania' }
			}

			localStorage.setItem('dd_token', data.token)
			setToken(data.token)
			setUser(data.user)
			return { success: true }
		} catch (error) {
			console.error('Logowanie error:', error)
			return { success: false, message: 'Nie udało się połączyć z serwerem.' }
		}
	}

	const register = async (
		email: string,
		password: string,
		name?: string,
		accountType?: string,
		city?: string,
		nip?: string,
		ownerPhone?: string,
		representsSelf?: boolean,
		acceptedTerms?: boolean
	) => {
		try {
			const res = await fetch(`${API_URL}/auth/register`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					password,
					name,
					accountType,
					city,
					nip,
					ownerPhone,
					representsSelf,
					acceptedTerms,
				}),
			})

			const data = await res.json()

			if (!res.ok) {
				return { success: false, message: data.message || 'Błąd rejestracji' }
			}

			return { success: true, message: data.message }
		} catch (error) {
			console.error('Rejestracja error:', error)
			return { success: false, message: 'Nie udało się połączyć z serwerem.' }
		}
	}

	const verifyRegister = async (email: string, code: string) => {
		try {
			const res = await fetch(`${API_URL}/auth/register/verify`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ email, code }),
			})

			const data = await res.json()

			if (!res.ok) {
				return { success: false, message: data.message || 'Błąd weryfikacji' }
			}

			localStorage.setItem('dd_token', data.token)
			setToken(data.token)
			setUser(data.user)
			return { success: true }
		} catch (error) {
			console.error('Weryfikacja error:', error)
			return { success: false, message: 'Nie udało się połączyć z serwerem.' }
		}
	}

	const toggleFavorite = async (restaurantId: string): Promise<boolean> => {
		if (!token || !user) return false

		const alreadyFav = favorites.includes(restaurantId)
		const method = alreadyFav ? 'DELETE' : 'POST'

		try {
			const res = await fetch(`${API_URL}/restaurants/${restaurantId}/favorite`, {
				method,
				headers: {
					Authorization: `Bearer ${token}`,
				},
			})

			if (res.ok) {
				if (alreadyFav) {
					setFavorites(prev => prev.filter(id => id !== restaurantId))
				} else {
					setFavorites(prev => [...prev, restaurantId])
				}
				return true
			}
			return false
		} catch (error) {
			console.error('Błąd przełączania ulubionych:', error)
			return false
		}
	}

	const isFavorite = (restaurantId: string) => {
		return favorites.includes(restaurantId)
	}

	const value = {
		user,
		token,
		favorites,
		loading,
		login,
		register,
		verifyRegister,
		logout: handleLogout,
		toggleFavorite,
		isFavorite,
	}

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
	const context = useContext(AuthContext)
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider')
	}
	return context
}
