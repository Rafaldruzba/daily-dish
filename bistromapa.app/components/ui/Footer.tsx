'use client'

import { useState, type FormEvent } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { Mail, Send } from 'lucide-react'
import { apiFetch } from '@/lib/api'
import { useTranslations } from 'next-intl'

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_MAIL || 'kontakt@bistromapa.app'

export function Footer() {
	const t = useTranslations('Footer')
	const { executeRecaptcha } = useGoogleReCaptcha()
	const [email, setEmail] = useState('')
	const [description, setDescription] = useState('')
	const [loading, setLoading] = useState(false)
	const [success, setSuccess] = useState('')
	const [error, setError] = useState('')

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError('')
		setSuccess('')

		if (!email.trim()) {
			setError(t('address-email'))
			return
		}
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
			setError(t('address-email-again'))
			return
		}
		if (description.trim().length < 10) {
			setError(t('write-message'))
			return
		}

		if (!executeRecaptcha) {
			setError(t('anti-spam-sys'))
			return
		}

		try {
			setLoading(true)
			let recaptchaToken = ''
			if (executeRecaptcha) {
				recaptchaToken = await executeRecaptcha('contact')
			}

			await apiFetch<{ success: boolean; message: string }>('/reports/contact', {
				method: 'POST',
				body: JSON.stringify({ email: email.trim(), description: description.trim(), recaptchaToken }),
			})

			setSuccess(t('message-sent'))
			setEmail('')
			setDescription('')
		} catch (err: any) {
			setError(err.message || t('message-error'))
		} finally {
			setLoading(false)
		}
	}

	return (
		<footer className='border-t border-stone-200 bg-white py-12 px-4 mt-auto'>
			<div className='max-w-6xl mx-auto px-4 sm:px-6'>
				<div className='grid grid-cols-1 md:grid-cols-3 gap-10 pb-10 border-b border-stone-100'>
					{/* Brand */}
					<div className='space-y-3 text-left'>
						<div className='flex items-center gap-2'>
							<img src='/bistro-logo.png' alt='Bistro Mapa Logo' className='w-8 h-8' />
							<span className='font-mono text-sm font-black tracking-widest text-stone-900'>BISTRO MAPA</span>
						</div>
						<p className='font-mono text-xs text-stone-400 uppercase tracking-wide'>
							© {new Date().getFullYear()} BistroMapa. {t('copywright')}
						</p>
						<a
							href={`mailto:${CONTACT_EMAIL}`}
							className='flex items-center gap-1.5 font-mono text-xs text-stone-400 hover:text-black transition-colors w-max'>
							<Mail className='w-3.5 h-3.5' />
							{CONTACT_EMAIL}
						</a>
					</div>

					{/* Kontakt */}
					<div className='text-left'>
						<h3 className='font-mono text-xs uppercase tracking-widest text-stone-900 font-bold mb-3'>
							{t('contact')}
						</h3>
						<form onSubmit={handleSubmit} className='space-y-3 font-sans text-xs'>
							<div className='space-y-1'>
								<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>
									{t('your-address-email')}
								</label>
								<input
									type='email'
									value={email}
									onChange={e => setEmail(e.target.value)}
									placeholder={t('address-email-example')}
									className='w-full px-3 py-2 bg-white border border-stone-200 outline-none text-sm focus:border-stone-400'
								/>
							</div>
							<div className='space-y-1'>
								<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>{t('message')}</label>
								<textarea
									value={description}
									onChange={e => setDescription(e.target.value)}
									placeholder={t('textarea-placeholder')}
									rows={3}
									className='w-full px-3 py-2 bg-white border border-stone-200 outline-none text-sm resize-none focus:border-stone-400'
								/>
							</div>
							{success && <p className='text-[11px] font-mono text-green-700'>{success}</p>}
							{error && <p className='text-[11px] font-mono text-red-600'>{error}</p>}
							<button
								type='submit'
								disabled={loading}
								className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-2.5 font-mono text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50'>
								{loading ? (
									t('sending')
								) : (
									<>
										<Send className='w-3.5 h-3.5' /> {t('send')}
									</>
								)}
							</button>
						</form>
					</div>

					{/* Linki */}
					<div className='text-left'>
						<h3 className='font-mono text-xs uppercase tracking-widest text-stone-900 font-bold mb-3'>{t('info')}</h3>
						<div className='flex flex-col items-start gap-2 font-mono text-xs text-stone-400'>
							<a href='/regulamin.pdf' target='_blank' rel='noreferrer' className='hover:text-black transition-colors'>
								{t('terms')}
							</a>
							<a
								href='/policy-privacy.pdf'
								target='_blank'
								rel='noreferrer'
								className='hover:text-black transition-colors'>
								{t('privacy-policy')}
							</a>
							<a
								href='https://github.com/Rafaldruzba/daily-dish'
								target='_blank'
								rel='noreferrer'
								className='hover:text-black transition-colors'>
								GitHub
							</a>
							<a
								href='https://buycoffee.to/rafaldruzba_dev'
								target='_blank'
								rel='noreferrer'
								className='hover:text-black transition-colors'>
								COFFEE
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}
