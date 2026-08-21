import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, ArrowRight } from 'lucide-react'

export default function LoginPage() {
	const { login } = useAuth()
	const navigate = useNavigate()

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!email || !password) {
			setError('Wszystkie pola są wymagane.')
			return
		}

		try {
			setSubmitting(true)
			setError('')
			const result = await login(email, password)
			if (result.success) {
				navigate('/')
			} else {
				setError(result.message || 'Niepoprawny e-mail lub hasło.')
			}
		} catch (err) {
			setError('Wystąpił nieoczekiwany błąd.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<main className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa]">
			<div className="w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm">
				<div className="text-center mb-8">
					<span className="text-xs uppercase tracking-widest font-mono text-stone-400">Logowanie</span>
					<h1 className="text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1">
						Witaj ponownie
					</h1>
					<p className="text-stone-500 text-sm mt-2">
						Zaloguj się na swoje konto, aby zarządzać ulubionymi i restauracjami.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-6">
					{error && (
						<div className="p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800">
							{error}
						</div>
					)}

					<div className="space-y-2">
						<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
							Adres e-mail
						</label>
						<div className="relative">
							<Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
							<input
								type="email"
								value={email}
								onChange={(e) => setEmail(e.target.value)}
								placeholder="twoj@email.com"
								className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors"
								required
							/>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex justify-between items-center">
							<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600">
								Hasło
							</label>
						</div>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
							<input
								type="password"
								value={password}
								onChange={(e) => setPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors"
								required
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={submitting}
						className="w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
					>
						{submitting ? 'Logowanie...' : 'Zaloguj się'}
						<ArrowRight className="w-4 h-4" />
					</button>
				</form>

				<div className="text-center mt-8 pt-6 border-t border-stone-100">
					<p className="text-stone-500 text-xs">
						Nie masz konta?{' '}
						<Link
							to="/register"
							className="text-black font-mono font-bold hover:underline"
						>
							Utwórz konto
						</Link>
					</p>
				</div>
			</div>
		</main>
	)
}
