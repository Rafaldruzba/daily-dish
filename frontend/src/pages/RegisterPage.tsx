import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Lock, Mail, User, ArrowRight, Building } from 'lucide-react'

export default function RegisterPage() {
	const { register, verifyRegister } = useAuth()
	const navigate = useNavigate()

	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [accountType, setAccountType] = useState('USER') // USER or OWNER
	const [error, setError] = useState('')
	const [submitting, setSubmitting] = useState(false)
	const [isVerifying, setIsVerifying] = useState(false)
	const [verificationCode, setVerificationCode] = useState('')

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault()
		setError('')

		if (!email || !password) {
			setError('E-mail i hasło są wymagane.')
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
			const result = await register(email, password, name, accountType)
			if (result.success) {
				setIsVerifying(true)
			} else {
				setError(result.message || 'Nie udało się zarejestrować konta.')
			}
		} catch (err) {
			setError('Wystąpił nieoczekiwany błąd.')
		} finally {
			setSubmitting(false)
		}
	}

	const handleVerify = async (e: FormEvent) => {
		e.preventDefault()
		setError('')

		if (!verificationCode || verificationCode.trim().length !== 6) {
			setError('Kod weryfikacyjny musi składać się z 6 cyfr.')
			return
		}

		try {
			setSubmitting(true)
			const result = await verifyRegister(email, verificationCode.trim())
			if (result.success) {
				navigate('/')
			} else {
				setError(result.message || 'Nieprawidłowy kod weryfikacyjny.')
			}
		} catch (err) {
			setError('Wystąpił nieoczekiwany błąd.')
		} finally {
			setSubmitting(false)
		}
	}

	if (isVerifying) {
		return (
			<main className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa]">
				<div className="w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm">
					<div className="text-center mb-8">
						<span className="text-xs uppercase tracking-widest font-mono text-stone-400">Weryfikacja</span>
						<h1 className="text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1">
							Potwierdź e-mail
						</h1>
						<p className="text-stone-500 text-sm mt-2">
							Wysłaliśmy 6-cyfrowy kod weryfikacyjny na adres:<br />
							<strong className="text-stone-800 font-mono text-xs">{email}</strong>
						</p>
					</div>

					<form onSubmit={handleVerify} className="space-y-5">
						{error && (
							<div className="p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800">
								{error}
							</div>
						)}

						<div className="space-y-2">
							<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block text-center">
								Kod weryfikacyjny (6 cyfr)
							</label>
							<input
								type="text"
								maxLength={6}
								value={verificationCode}
								onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
								placeholder="123456"
								className="w-full text-center py-4 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-2xl tracking-[12px] font-mono font-bold text-stone-900 transition-colors"
								required
								autoFocus
							/>
						</div>

						<button
							type="submit"
							disabled={submitting}
							className="w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-4"
						>
							{submitting ? 'Weryfikacja...' : 'Zatwierdź i zarejestruj'}
							<ArrowRight className="w-4 h-4" />
						</button>
					</form>

					<div className="text-center mt-8 pt-6 border-t border-stone-100">
						<button
							type="button"
							onClick={() => {
								setIsVerifying(false);
								setError('');
							}}
							className="text-stone-500 text-xs hover:text-black font-mono transition-colors cursor-pointer"
						>
							← Wróć do formularza rejestracji
						</button>
					</div>
				</div>
			</main>
		)
	}

	return (
		<main className="min-h-[80vh] flex items-center justify-center px-4 py-12 bg-[#fafafa]">
			<div className="w-full max-w-md bg-white border border-stone-200 rounded-none p-8 md:p-10 shadow-sm">
				<div className="text-center mb-8">
					<span className="text-xs uppercase tracking-widest font-mono text-stone-400">Rejestracja</span>
					<h1 className="text-3xl font-bold tracking-tight font-serif text-stone-900 mt-1">
						Stwórz konto
					</h1>
					<p className="text-stone-500 text-sm mt-2">
						Wybierz cel swojego konta, aby kontynuować.
					</p>
				</div>

				<form onSubmit={handleSubmit} className="space-y-5">
					{error && (
						<div className="p-4 bg-stone-50 border-l-2 border-black text-xs font-mono text-stone-800">
							{error}
						</div>
					)}

					{/* Role Selector Card-style radios */}
					<div className="grid grid-cols-2 gap-4 pb-2">
						<button
							type="button"
							onClick={() => setAccountType('USER')}
							className={`border p-4 text-center transition-all cursor-pointer ${
								accountType === 'USER'
									? 'border-black bg-stone-50 text-black shadow-sm'
									: 'border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600'
							}`}
						>
							<User className="w-5 h-5 mx-auto mb-2" />
							<span className="block font-mono text-[10px] uppercase font-bold tracking-wider">Szukam Jedzenia</span>
						</button>
						<button
							type="button"
							onClick={() => setAccountType('OWNER')}
							className={`border p-4 text-center transition-all cursor-pointer ${
								accountType === 'OWNER'
									? 'border-black bg-stone-50 text-black shadow-sm'
									: 'border-stone-200 text-stone-400 hover:border-stone-300 hover:text-stone-600'
							}`}
						>
							<Building className="w-5 h-5 mx-auto mb-2" />
							<span className="block font-mono text-[10px] uppercase font-bold tracking-wider">Dla Restauracji</span>
						</button>
					</div>

					<div className="space-y-2">
						<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
							Twoje imię / Nazwa
						</label>
						<div className="relative">
							<User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
							<input
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="np. Jan Kowalski"
								className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
							Adres e-mail <span className="text-red-500">*</span>
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
						<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
							Hasło <span className="text-stone-400">(min. 6 znaków)</span> <span className="text-red-500">*</span>
						</label>
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

					<div className="space-y-2">
						<label className="text-xs uppercase tracking-wider font-mono font-medium text-stone-600 block">
							Potwierdź hasło <span className="text-red-500">*</span>
						</label>
						<div className="relative">
							<Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
							<input
								type="password"
								value={confirmPassword}
								onChange={(e) => setConfirmPassword(e.target.value)}
								placeholder="••••••••"
								className="w-full pl-10 pr-4 py-3 bg-white border border-stone-200 rounded-none focus:outline-none focus:border-black text-sm text-stone-900 font-mono transition-colors"
								required
							/>
						</div>
					</div>

					<button
						type="submit"
						disabled={submitting}
						className="w-full bg-black text-white hover:bg-stone-900 transition-colors py-3 font-mono text-xs uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
					>
						{submitting ? 'Tworzenie konta...' : 'Utwórz konto'}
						<ArrowRight className="w-4 h-4" />
					</button>
				</form>

				<div className="text-center mt-8 pt-6 border-t border-stone-100">
					<p className="text-stone-500 text-xs">
						Masz już konto?{' '}
						<Link
							to="/login"
							className="text-black font-mono font-bold hover:underline"
						>
							Zaloguj się
						</Link>
					</p>
				</div>
			</div>
		</main>
	)
}
