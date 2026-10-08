'use client'

import { useTranslations } from 'next-intl'

import React, { useState } from 'react'
import { Link } from '@/lib/navigation'
import { useLocale } from 'next-intl'

import { Lock, Mail, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from '@/lib/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

export default function LoginPage() {
	const t = useTranslations('Login')
	const { login } = useAuth()
	const router = useRouter()
	const locale = useLocale()
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
			setError(t('errors.field'))
			return
		}

		try {
			setSubmitting(true)
			setError('')
			const result = await login(email, password)
			if (result.success) {
				router.push('/')
			} else {
				setError(result.message || t('errors.incorrectData'))
			}
		} catch (err) {
			setError(t('errors.server'))
		} finally {
			setSubmitting(false)
		}
	}

	const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		if (!forgotEmail) {
			setForgotError(t('errors.email'))
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
				setForgotSuccess(data.message || t('success.link'))
			} else {
				setForgotError(data.message || t('errors.forgot'))
			}
		} catch (err) {
			setForgotError(t('errors.server2'))
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
							<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>{t('text.header')}</span>
							<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>
								{t('text.passwordForgot')}
							</h1>
							<p className='text-stone-500 text-sm mt-2'>{t('text.desc')}</p>
						</div>

						{forgotSuccess ? (
							<div className='space-y-6 text-center animate-scale-up'>
								<div className='p-6 bg-stone-50 border border-stone-100 rounded-none text-center space-y-3'>
									<CheckCircle className='w-12 h-12 text-black mx-auto' />
									<h3 className='font-serif font-bold text-stone-900 text-base'>{t('text.emailSent')}</h3>
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
									{t('text.back')}
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
										{t('text.email')}
									</label>
									<div className='relative'>
										<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
										<input
											type='email'
											value={forgotEmail}
											onChange={e => setForgotEmail(e.target.value)}
											placeholder={t('text.emailPlaceHolder')}
											className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
											required
										/>
									</div>
								</div>

								<button
									type='submit'
									disabled={forgotSubmitting}
									className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer'>
									{forgotSubmitting ? t('text.sending') : t('text.resetLink')}
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
									{t('text.cancel')}
								</button>
							</form>
						)}
					</div>
				) : (
					<>
						<div className='text-center mb-8'>
							<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>{t('text.login')}</span>
							<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>
								{t('text.welcomeBack')}
							</h1>
							<p className='text-stone-500 text-sm mt-2'>{t('text.welcomeBackDesc')}</p>
						</div>

						<form onSubmit={handleSubmit} className='space-y-6 text-left'>
							{error && (
								<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800'>{error}</div>
							)}

							<div className='space-y-2'>
								<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
									{t('text.addressEmail')}
								</label>
								<div className='relative'>
									<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
									<input
										type='email'
										value={email}
										onChange={e => setEmail(e.target.value)}
										placeholder={t('text.emailPlaceHolder')}
										className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
										required
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<div className='flex justify-between items-center'>
									<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600'>
										{t('text.password')}
									</label>
									<button
										type='button'
										onClick={() => {
											setShowForgotPassword(true)
											setForgotEmail(email) // Prefill email if typed
										}}
										className='text-stone-400 hover:text-black font-mono text-[10px] uppercase tracking-wider cursor-pointer transition-colors'>
										{t('text.passwordForgot')}
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
								{submitting ? t('text.loginDots') : t('text.loginBtn')}
								<ArrowRight className='w-4 h-4' />
							</button>
						</form>

						<div className='text-center mt-8 pt-6 border-t border-stone-100'>
							<p className='text-stone-500 text-xs'>
								{t('text.QAccount')}{' '}
								<Link href='/register' className='text-black font-mono font-bold hover:underline'>
									{t('text.AAccount')}
								</Link>
							</p>
						</div>
					</>
				)}
			</div>
		</main>
	)
}
