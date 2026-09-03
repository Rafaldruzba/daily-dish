import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export default function LoginPage() {
	const { login } = useAuth()
	const navigate = useNavigate()

	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// Forgot Password States
	const [showForgotPassword, setShowForgotPassword] = useState(false)
	const [forgotEmail, setForgotEmail] = useState('')
	const [forgotError, setForgotError] = useState('')
	const [forgotSuccess, setForgotSuccess] = useState('')
	const [forgotSubmitting, setForgotSubmitting] = useState(false)

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

	const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!forgotEmail) {
			setForgotError('Adres e-mail jest wymagany.')
			return
		}

		try {
			setForgotSubmitting(true)
			setForgotError('')
			setForgotSuccess('')

			const res = await fetch(`${API_URL}/auth/forgot-password`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: forgotEmail }),
			})
			const data = await res.json()

			if (res.ok && data.success) {
				setForgotSuccess(data.message || 'Wysłano link resetujący hasło.')
			} else {
				setForgotError(data.message || 'Błąd podczas wysyłania prośby.')
			}
		} catch (err) {
			setForgotError('Wystąpił nieoczekiwany błąd serwera.')
		} finally {
			setForgotSubmitting(false)
		}
	}

	return (
		<main className='min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa]'>
			<div className='w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm animate-fade-in'>
				{showForgotPassword ? (
					<div className='space-y-6'>
						<div className='text-center mb-8'>
							<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>Odzyskiwanie hasła</span>
							<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>Zapomniałem hasła</h1>
							<p className='text-stone-500 text-sm mt-2'>
								Wpisz swój adres e-mail, a wyślemy Ci link do ustawienia nowego hasła.
							</p>
						</div>

						{forgotSuccess ? (
							<div className='space-y-6 text-center animate-scale-up'>
								<div className='p-6 bg-stone-50 border border-stone-100 rounded-none text-center space-y-3'>
									<CheckCircle className='w-12 h-12 text-black mx-auto' />
									<h3 className='font-serif font-bold text-stone-900 text-base'>E-mail został wysłany</h3>
									<p className='text-stone-600 text-xs leading-relaxed font-sans'>{forgotSuccess}</p>
								</div>
								<button
									onClick={() => {
										setShowForgotPassword(false)
										setForgotSuccess('')
										setForgotEmail('')
									}}
									className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer'>
									<ArrowLeft className='w-4 h-4' />
									Powrót do logowania
								</button>
							</div>
						) : (
							<form onSubmit={handleForgotPasswordSubmit} className='space-y-6 text-left'>
								{forgotError && (
									<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800'>
										{forgotError}
									</div>
								)}

								<div className='space-y-2'>
									<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
										Adres e-mail *
									</label>
									<div className='relative'>
										<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='email'
											value={forgotEmail}
											onChange={e => setForgotEmail(e.target.value)}
											placeholder='twoj@email.com'
											className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
											required
										/>
									</div>
								</div>

								<button
									type='submit'
									disabled={forgotSubmitting}
									className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer'>
									{forgotSubmitting ? 'Wysyłanie...' : 'Wyślij link resetujący'}
									<ArrowRight className='w-4 h-4' />
								</button>

								<button
									type='button'
									onClick={() => {
										setShowForgotPassword(false)
										setForgotError('')
									}}
									className='w-full border border-stone-200 text-stone-700 hover:border-black hover:text-black transition-colors py-2.5 font-mono text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer bg-white'>
									<ArrowLeft className='w-4 h-4' />
									Anuluj
								</button>
							</form>
						)}
					</div>
				) : (
					<>
						<div className='text-center mb-8'>
							<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>Logowanie</span>
							<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>Witaj ponownie</h1>
							<p className='text-stone-500 text-sm mt-2'>
								Zaloguj się na swoje konto, aby zarządzać ulubionymi i restauracjami.
							</p>
						</div>

						<form onSubmit={handleSubmit} className='space-y-6 text-left'>
							{error && (
								<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800'>
									{error}
								</div>
							)}

							<div className='space-y-2'>
								<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
									Adres e-mail
								</label>
								<div className='relative'>
									<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
									<input
										type='email'
										value={email}
										onChange={e => setEmail(e.target.value)}
										placeholder='twoj@email.com'
										className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
										required
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<div className='flex justify-between items-center'>
									<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600'>
										Hasło
									</label>
									<button
										type='button'
										onClick={() => {
											setShowForgotPassword(true)
											setForgotEmail(email) // Prefill email if typed
										}}
										className='text-stone-400 hover:text-black font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors'>
										Zapomniałem hasła
									</button>
								</div>
								<div className='relative'>
									<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
									<input
										type='password'
										value={password}
										onChange={e => setPassword(e.target.value)}
										placeholder='••••••••'
										className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
										required
									/>
								</div>
							</div>

							<button
								type='submit'
								disabled={submitting}
								className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer'>
								{submitting ? 'Logowanie...' : 'Zaloguj się'}
								<ArrowRight className='w-4 h-4' />
							</button>
						</form>

						<div className='text-center mt-8 pt-6 border-t border-stone-100'>
							<p className='text-stone-500 text-xs'>
								Nie masz konta?{' '}
								<Link to='/register' className='text-black font-mono font-bold hover:underline'>
									Utwórz konto
								</Link>
							</p>
						</div>
					</>
				)}
			</div>
		</main>
	)
}
