'use client'

import { useTranslations } from 'next-intl'

import { useState, type FormEvent } from 'react'
import { Link } from '@/lib/navigation'

import { Lock, Mail, User, ArrowRight, Building, Phone, FileText, MapPin } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useRouter } from '@/lib/navigation'

export default function RegisterPage() {
	const t = useTranslations('Register')
	const { register, verifyRegister } = useAuth()
	const router = useRouter()

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [accountType, setAccountType] = useState('USER') // USER or OWNER
	const [city, setCity] = useState('')
	const [nip, setNip] = useState('')
	const [ownerPhone, setOwnerPhone] = useState('')
	const [representsSelf, setRepresentsSelf] = useState(false)
	const [acceptedTerms, setAcceptedTerms] = useState(false)
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [isVerifying, setIsVerifying] = useState(false)
	const [verificationCode, setVerificationCode] = useState('')

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError('')

		if (!email || !password) {
			setError(t('errors.emailPasswordRequired'))
			return
		}

		if (password.length < 6) {
			setError(t('errors.passwordMinLength'))
			return
		}

		if (password !== confirmPassword) {
			setError(t('errors.passwordMismatch'))
			return
		}

		if (accountType === 'OWNER') {
			if (!ownerPhone) {
				setError(t('errors.ownerPhoneRequired'))
				return
			}
			if (!representsSelf) {
				setError(t('errors.ownerRepresentationRequired'))
				return
			}
		}

		if (!acceptedTerms) {
			setError(t('errors.termsRequired'))
			return
		}

		try {
			setSubmitting(true)
			const result = await register(
				email,
				password,
				name || undefined,
				accountType,
				city || undefined,
				nip || undefined,
				ownerPhone || undefined,
				representsSelf,
				acceptedTerms,
			)
			if (result.success) {
				setIsVerifying(true)
			} else {
				setError(result.message || t('errors.registrationFailed'))
			}
		} catch (err) {
			setError(t('errors.unexpectedError'))
		} finally {
			setSubmitting(false)
		}
	}

	const handleVerify = async (e: FormEvent) => {
		e.preventDefault()
		setError('')

		if (!verificationCode || verificationCode.trim().length !== 6) {
			setError(t('errors.verificationCodeLength'))
			return
		}

		try {
			setSubmitting(true)
			const result = await verifyRegister(email, verificationCode.trim())
			if (result.success) {
				router.push('/')
			} else {
				setError(result.message || t('errors.invalidVerificationCode'))
			}
		} catch (err) {
			setError(t('errors.unexpectedError'))
		} finally {
			setSubmitting(false)
		}
	}

	if (isVerifying) {
		return (
			<main className='min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa]'>
				<div className='w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm'>
					<div className='text-center mb-8'>
						<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>
							{t('verification.badge')}
						</span>
						<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>
							{t('verification.title')}
						</h1>
						<p className='text-stone-500 text-sm mt-2'>
							{t('verification.description')}
							<br />
							<strong className='text-stone-800 font-mono text-xs'>{email}</strong>
						</p>
					</div>

					<form onSubmit={handleVerify} className='space-y-5'>
						{error && (
							<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800'>{error}</div>
						)}

						<div className='space-y-2'>
							<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block text-center'>
								{t('verification.codeLabel')}
							</label>
							<input
								type='text'
								maxLength={6}
								value={verificationCode}
								onChange={e => setVerificationCode(e.target.value.replace(/\D/g, ''))}
								placeholder={t('verification.codePlaceholder')}
								className='w-full text-center py-4 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-2xl tracking-[12px] font-mono font-bold text-stone-900 transition-colors'
								required
								autoFocus
							/>
						</div>

						<button
							type='submit'
							disabled={submitting}
							className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-4'>
							{submitting ? t('verification.submitting') : t('verification.submit')}
							<ArrowRight className='w-4 h-4' />
						</button>
					</form>

					<div className='text-center mt-8 pt-6 border-t border-stone-100'>
						<button
							type='button'
							onClick={() => {
								setIsVerifying(false)
								setError('')
							}}
							className='text-stone-500 text-xs hover:text-black font-mono transition-colors cursor-pointer'>
							{t('verification.back')}
						</button>
					</div>
				</div>
			</main>
		)
	}

	return (
		<main className='min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa]'>
			<div className='w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm'>
				<div className='text-center mb-8'>
					<span className='text-xs uppercase tracking-widest font-mono text-stone-400'>{t('page.badge')}</span>
					<h1 className='text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1'>{t('page.title')}</h1>
					<p className='text-stone-500 text-sm mt-2'>{t('page.description')}</p>
				</div>

				<form onSubmit={handleSubmit} className='space-y-5'>
					{error && (
						<div className='p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800'>{error}</div>
					)}

					{/* Role Selector Card-style radios */}
					<div className='grid grid-cols-2 gap-4 pb-2'>
						<button
							type='button'
							onClick={() => setAccountType('USER')}
							className={`border p-4 text-center transition-all cursor-pointer ${
								accountType === 'USER'
									? 'border-black bg-stone-50 text-black shadow-sm'
									: 'border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600'
							}`}>
							<User className='w-5 h-5 mx-auto mb-2' />
							<span className='block font-mono text-[10px] uppercase font-bold tracking-wider'>
								{t('accountType.user')}
							</span>
						</button>
						<button
							type='button'
							onClick={() => setAccountType('OWNER')}
							className={`border p-4 text-center transition-all cursor-pointer ${
								accountType === 'OWNER'
									? 'border-black bg-stone-50 text-black shadow-sm'
									: 'border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600'
							}`}>
							<Building className='w-5 h-5 mx-auto mb-2' />
							<span className='block font-mono text-[10px] uppercase font-bold tracking-wider'>
								{t('accountType.owner')}
							</span>
						</button>
					</div>

					<div className='space-y-2'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							{t('fields.name.label')}
						</label>
						<div className='relative'>
							<User className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
							<input
								type='text'
								value={name}
								onChange={e => setName(e.target.value)}
								placeholder={t('fields.name.placeholder')}
								className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							{t('fields.city.label')}
						</label>
						<div className='relative'>
							<MapPin className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
							<input
								type='text'
								value={city}
								onChange={e => setCity(e.target.value)}
								placeholder={t('fields.city.placeholder')}
								className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
							/>
						</div>
					</div>

					<div className='space-y-2'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							{t('fields.email.label')} <span className='text-red-500'>*</span>
						</label>
						<div className='relative'>
							<Mail className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
							<input
								type='email'
								value={email}
								onChange={e => setEmail(e.target.value)}
								placeholder={t('fields.email.placeholder')}
								className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
								required
							/>
						</div>
					</div>

					{/* Conditional fields for OWNER account */}
					{accountType === 'OWNER' && (
						<div className='space-y-5 p-4 bg-stone-50 border border-stone-200'>
							<span className='block text-[10px] font-mono font-bold uppercase tracking-wider text-stone-500 border-b border-stone-200 pb-1 mb-2'>
								{t('ownerVerification.title')}
							</span>

							<div className='space-y-2'>
								<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
									{t('fields.ownerPhone.label')} <span className='text-red-500'>*</span>
								</label>
								<div className='relative'>
									<Phone className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
									<input
										type='tel'
										value={ownerPhone}
										onChange={e => setOwnerPhone(e.target.value)}
										placeholder={t('fields.ownerPhone.placeholder')}
										className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
										required={accountType === 'OWNER'}
									/>
								</div>
							</div>

							<div className='space-y-2'>
								<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
									{t('fields.nip.label')} <span className='text-stone-400'>{t('optional')}</span>
								</label>
								<div className='relative'>
									<FileText className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
									<input
										type='text'
										value={nip}
										onChange={e => setNip(e.target.value)}
										placeholder={t('fields.nip.placeholder')}
										className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
									/>
								</div>
							</div>

							<div className='flex items-start gap-3 pt-2'>
								<input
									id='representsSelf'
									type='checkbox'
									checked={representsSelf}
									onChange={e => setRepresentsSelf(e.target.checked)}
									className='w-4 h-4 mt-0.5 accent-black rounded-none cursor-pointer'
									required={accountType === 'OWNER'}
								/>
								<label
									htmlFor='representsSelf'
									className='text-[11px] text-stone-600 font-mono select-none leading-relaxed cursor-pointer'>
									{t('ownerVerification.representation')} <span className='text-red-500'>*</span>
								</label>
							</div>
						</div>
					)}

					<div className='space-y-2'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							{t('fields.password.label')} <span className='text-stone-400'>{t('fields.password.minLength')}</span>{' '}
							<span className='text-red-500'>*</span>
						</label>
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

					<div className='space-y-2'>
						<label className='text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block'>
							{t('fields.confirmPassword.label')} <span className='text-red-500'>*</span>
						</label>
						<div className='relative'>
							<Lock className='absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400' />
							<input
								type='password'
								value={confirmPassword}
								onChange={e => setConfirmPassword(e.target.value)}
								placeholder='••••••••'
								className='w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors'
								required
							/>
						</div>
					</div>

					<div className='flex items-start gap-3 pt-2'>
						<input
							id='acceptedTerms'
							type='checkbox'
							checked={acceptedTerms}
							onChange={e => setAcceptedTerms(e.target.checked)}
							className='w-4 h-4 mt-0.5 accent-black rounded-none cursor-pointer'
							required
						/>
						<label
							htmlFor='acceptedTerms'
							className='text-[11px] text-stone-600 font-mono select-none leading-relaxed cursor-pointer'>
							{t('terms.accept')}{' '}
							<Link href='/terms' target='_blank' className='underline font-bold text-black'>
								{t('terms.regulations')}
							</Link>{' '}
							{t('terms.and')}{' '}
							<Link href='/privacy' target='_blank' className='underline font-bold text-black'>
								{t('terms.privacy')}
							</Link>{' '}
							{t('terms.service')} <span className='text-red-500'>*</span>
						</label>
					</div>

					<button
						type='submit'
						disabled={submitting}
						className='w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2'>
						{submitting ? t('submit.submitting') : t('submit.button')}
						<ArrowRight className='w-4 h-4' />
					</button>
				</form>

				<div className='text-center mt-8 pt-6 border-t border-stone-100'>
					<p className='text-stone-500 text-xs'>
						{t('loginPrompt.text')}{' '}
						<Link href='/login' className='text-black font-mono font-bold hover:underline'>
							{t('loginPrompt.link')}
						</Link>
					</p>
				</div>
			</div>
		</main>
	)
}
