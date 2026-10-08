'use client'

import React, { useEffect, useState } from 'react'
import { Link } from '@/lib/navigation'
import { useParams, useRouter } from 'next/navigation'
import { AlertTriangle, ArrowRight, CheckCircle, Loader2, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface ActivationInfo {
	restaurantName: string
	email: string
	expiresAt: string | null
}

/** Odpowiedź CRM: { success: true, data } albo { success: false, error: { message } }. */
interface CrmResponse<T> {
	success: boolean
	data?: T
	error?: { message?: string }
}

type Status = 'checking' | 'ready' | 'invalid' | 'done'

export default function ActivateAccountPage() {
	const t = useTranslations('Activate')
	const params = useParams<{ token: string }>()
	const router = useRouter()
	const token = params?.token

	const [status, setStatus] = useState<Status>('checking')
	const [info, setInfo] = useState<ActivationInfo | null>(null)
	const [error, setError] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [submitting, setSubmitting] = useState(false)

	// Token sprawdza CRM — aplikacja główna nie zna zaproszeń (readme §24).
	useEffect(() => {
		if (!token) {
			setStatus('invalid')
			setError(t('errors.token'))
			return
		}

		let cancelled = false

		async function check() {
			try {
				const res = await fetch(`/crm-api/activation/${encodeURIComponent(token as string)}`, {
					cache: 'no-store',
				})
				const body = (await res.json()) as CrmResponse<ActivationInfo>

				if (cancelled) return

				if (!res.ok || !body.success || !body.data) {
					setStatus('invalid')
					setError(body.error?.message || t('errors.link'))
					return
				}

				setInfo(body.data)
				setStatus('ready')
			} catch {
				if (!cancelled) {
					setStatus('invalid')
					setError(t('errors.server'))
				}
			}
		}

		void check()

		return () => {
			cancelled = true
		}
	}, [token])

	const handleSubmit = async (event: React.FormEvent) => {
		event.preventDefault()
		setError('')

		if (password.length < 12) {
			setError(t('errors.pass'))
			return
		}

		if (password !== confirmPassword) {
			setError(t('errors.passIden'))
			return
		}

		try {
			setSubmitting(true)

			const res = await fetch(`/crm-api/activation/${encodeURIComponent(token as string)}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password }),
			})
			const body = (await res.json()) as CrmResponse<{ activated: true }>

			if (!res.ok || !body.success) {
				setError(body.error?.message || t('errors.activateAcc'))
				return
			}

			setStatus('done')
			setTimeout(() => router.push('/login'), 3000)
		} catch {
			setError(t('errors.server2'))
		} finally {
			setSubmitting(false)
		}
	}

	return (
		<main className='min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa] animate-fade-in'>
			<div className='w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm'>
				<div className='text-center mb-8'>
					<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>{t('text.header')}</span>
					<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>{t('text.setPass')}</h1>
					{status === 'ready' && info && (
						<p className='text-stone-500 text-sm mt-2'>
							{t('text.accfor')} <span className='font-medium text-stone-700'>{info.restaurantName}</span>{' '}
							{t('text.accfordone')}
							<br />
							<span className='font-mono text-xs text-stone-400'>{info.email}</span>
						</p>
					)}
				</div>

				{status === 'checking' && (
					<div className='flex items-center justify-center gap-2 py-10 text-stone-400'>
						<Loader2 className='w-4 h-4 animate-spin' />
						<span className='font-mono text-xs uppercase tracking-wider'>{t('text.check')}</span>
					</div>
				)}

				{status === 'invalid' && (
					<div className='space-y-6 text-center'>
						<div className='p-4 bg-red-50 border border-red-200 text-xs font-mono text-red-700 flex items-center gap-2 text-left'>
							<AlertTriangle className='w-5 h-5 shrink-0' />
							<span>{error}</span>
						</div>
						<Link
							href='/login'
							className='inline-block w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
							{t('text.back')}
						</Link>
					</div>
				)}

				{status === 'done' && (
					<div className='space-y-6 text-center animate-scale-up'>
						<div className='p-6 bg-green-50 border border-green-200 rounded-none text-center space-y-3'>
							<CheckCircle className='w-12 h-12 text-green-600 mx-auto' />
							<h3 className='font-serif font-bold text-stone-900 text-base'>{t('text.accActivated')}</h3>
							<p className='text-stone-600 text-xs leading-relaxed font-sans'>{t('text.accActivatedDesc')}</p>
							<p className='text-stone-400 text-[10px] font-mono uppercase tracking-wider pt-2'>{t('text.redirect')}</p>
						</div>
						<Link
							href='/login'
							className='inline-block w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest text-center cursor-pointer'>
							{t('text.loginNow')}
						</Link>
					</div>
				)}

				{status === 'ready' && (
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
									placeholder={t('text.newPassPlaceholder')}
									minLength={12}
									className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									required
								/>
							</div>
						</div>

						<div className='space-y-2'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
								{t('text.newPassRepeat')}
							</label>
							<div className='relative'>
								<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
								<input
									type='password'
									value={confirmPassword}
									onChange={e => setConfirmPassword(e.target.value)}
									placeholder={t('text.newPassRepeatPlaceholder')}
									minLength={12}
									className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									required
								/>
							</div>
						</div>

						<button
							type='submit'
							disabled={submitting}
							className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer'>
							{submitting ? t('text.activating') : t('text.activateBtn')}
							<ArrowRight className='w-4 h-4' />
						</button>
					</form>
				)}
			</div>
		</main>
	)
}
