import React, { useState } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { Lock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function ResetPasswordPage() {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const token = searchParams.get('token')

	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [error, setError] = useState('')
	const [success, setSuccess] = useState('')
	const [submitting, setSubmitting] = useState(false)

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setError('')
		setSuccess('')

		if (!token) {
			setError('Brak prawidłowego tokenu resetującego w adresie URL.')
			return
		}

		if (!password || !confirmPassword) {
			setError('Wszystkie pola są wymagane.')
			return
		}

		if (password.length < 6) {
			setError('Hasło musi mieć co najmniej 6 znaków.')
			return
		}

		if (password !== confirmPassword) {
			setError('Hasła nie są identyczne.')
			return
		}

		try {
			setSubmitting(true)
			const res = await fetch(`${API_URL}/auth/reset-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ token, password }),
			})
			const data = await res.json()

			if (res.ok && data.success) {
				setSuccess(data.message || 'Hasło zostało pomyślnie zmienione.')
				setTimeout(() => navigate('/login'), 3000)
			} else {
				setError(data.message || 'Nie udało się zmienić hasła. Link mógł wygasnąć.')
			}
		} catch (err) {
			setError('Wystąpił nieoczekiwany błąd serwera.')
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<main className='min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa] animate-fade-in'>
			<div className='w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm'>
				<div className='text-center mb-8'>
					<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>Odzyskiwanie konta</span>
					<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>Ustaw nowe hasło</h1>
					<p className='text-stone-500 text-sm mt-2'>Wprowadź nowe, silne hasło, aby zabezpieczyć swoje konto.</p>
				</div>

				{!token ? (
					<div className='space-y-6 text-center'>
						<div className='p-4 bg-red-50 border border-red-200 text-xs font-mono text-red-700 flex items-center gap-2 text-left'>
							<AlertTriangle className='w-5 h-5 shrink-0' />
							<span>Nieprawidłowe lub uszkodzone łącze resetujące hasło.</span>
						</div>
						<Link
							to='/login'
							className='inline-block w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
							Wróć do logowania
						</Link>
					</div>
				) : success ? (
					<div className='space-y-6 text-center animate-scale-up'>
						<div className='p-6 bg-green-50 border border-green-200 rounded-none text-center space-y-3'>
							<CheckCircle className='w-12 h-12 text-green-600 mx-auto' />
							<h3 className='font-serif font-bold text-stone-900 text-base'>Hasło zostało zmienione</h3>
							<p className='text-stone-600 text-xs leading-relaxed font-sans'>{success}</p>
							<p className='text-stone-400 text-[10px] font-mono uppercase tracking-wider pt-2'>
								Przekierowanie do logowania za 3 sekundy...
							</p>
						</div>
						<Link
							to='/login'
							className='inline-block w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
							Zaloguj się teraz
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className='space-y-6 text-left'>
						{error && (
							<div className='p-4 bg-red-50 border-l-2 border-red-500 text-xs font-mono text-red-700'>
								{error}
							</div>
						)}

						<div className='space-y-2'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								Nowe hasło
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
								<input
									type='password'
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder='Co najmniej 6 znaków'
									className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									required
								/>
							</div>
						</div>

						<div className='space-y-2'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								Powtórz nowe hasło
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
								<input
									type='password'
									value={confirmPassword}
									onChange={e => setConfirmPassword(e.target.value)}
									placeholder='Powtórz nowe hasło'
									className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									required
								/>
							</div>
						</div>

						<button
							type='submit'
							disabled={submitting}
							className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer'>
							{submitting ? 'Zapisywanie...' : 'Zmień hasło'}
							<ArrowRight className='w-4 h-4' />
						</button>
					</form>
				)}
			</div>
		</main>
	)
}
