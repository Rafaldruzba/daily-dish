'use client'

import { useTranslations } from 'next-intl'

import React, { Suspense, useState } from 'react'
import { Link } from '@/lib/navigation'

import { Lock, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react'
import { useSearchParams, useRouter } from 'next/navigation'

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api'

function ResetPasswordContent() {
	const t = useTranslations('Reset-pass')
	const searchParams = useSearchParams()
	const router = useRouter()
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
			setError(t('errors.error'))
			return
		}

		if (!password || !confirmPassword) {
			setError(t('errors.field'))
			return
		}

		if (password.length < 6) {
			setError(t('errors.pass'))
			return
		}

		if (password !== confirmPassword) {
			setError(t('errors.same'))
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
				setSuccess(data.message || 'succes.pass')
				setTimeout(() => router.push('/login'), 3000)
			} else {
				setError(data.message || t('errors.link'))
			}
		} catch (err) {
			setError(t('errors.server'))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<main className='min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa] animate-fade-in'>
			<div className='w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm'>
				<div className='text-center mb-8'>
					<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>{t('text.header')}</span>
					<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>
						{t('text.headerSubtitle')}
					</h1>
					<p className='text-stone-500 text-sm mt-2'>{t('text.headerDesc')}</p>
				</div>

				{!token ? (
					<div className='space-y-6 text-center'>
						<div className='p-4 bg-red-50 border border-red-200 text-xs font-mono text-red-700 flex items-center gap-2 text-left'>
							<AlertTriangle className='w-5 h-5 shrink-0' />
							<span>{t('text.error')}</span>
						</div>
						<Link
							href='/login'
							className='inline-block w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
							{t('text.back')}
						</Link>
					</div>
				) : success ? (
					<div className='space-y-6 text-center animate-scale-up'>
						<div className='p-6 bg-green-50 border border-green-200 rounded-none text-center space-y-3'>
							<CheckCircle className='w-12 h-12 text-green-600 mx-auto' />
							<h3 className='font-serif font-bold text-stone-900 text-base'>{t('text.pass')}</h3>
							<p className='text-stone-600 text-xs leading-relaxed font-sans'>{success}</p>
							<p className='text-stone-400 text-[10px] font-mono uppercase tracking-wider pt-2'>{t('text.3sec')}</p>
						</div>
						<Link
							href='/login'
							className='inline-block w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
							{t('text.loginNow')}
						</Link>
					</div>
				) : (
					<form onSubmit={handleSubmit} className='space-y-6 text-left'>
						{error && (
							<div className='p-4 bg-red-50 border-l-2 border-red-500 text-xs font-mono text-red-700'>{error}</div>
						)}

						<div className='space-y-2'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								{t('text.newPass')}
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
								<input
									type='password'
									value={password}
									onChange={e => setPassword(e.target.value)}
									placeholder={t('text.newPassPlaceHolder')}
									className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									required
								/>
							</div>
						</div>

						<div className='space-y-2'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								{t('text.repeatPass')}
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
								<input
									type='password'
									value={confirmPassword}
									onChange={e => setConfirmPassword(e.target.value)}
									placeholder={t('text.repeatPass')}
									className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									required
								/>
							</div>
						</div>

						<button
							type='submit'
							disabled={submitting}
							className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer'>
							{submitting ? t('text.saving') : t('text.btn')}
							<ArrowRight className='w-4 h-4' />
						</button>
					</form>
				)}
			</div>
		</main>
	)
}
export default function ResetPasswordPage() {
	return (
		<Suspense
			fallback={
				<main className='min-h-screen flex items-center justify-center'>
					<p className='font-mono text-xs'>Ładowanie...</p>
				</main>
			}>
			<ResetPasswordContent />
		</Suspense>
	)
}
