import { useState, type FormEvent } from 'react'
import { useGoogleReCaptcha } from 'react-google-recaptcha-v3'
import { Mail, Send } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'
const CONTACT_EMAIL = import.meta.env.VITE_MAIL || 'kontakt@bistromapa.app'

function Footer() {
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
			setError('Podaj adres e-mail.')
			return
		}
		if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
			setError('Podaj poprawny adres e-mail.')
			return
		}
		if (description.trim().length < 10) {
			setError('Napisz wiadomość (min. 10 znaków).')
			return
		}

		// Sprawdzamy czy Google reCAPTCHA jest gotowe
		if (!executeRecaptcha) {
			setError('System weryfikacji antyspamowej nie jest jeszcze gotowy. Odśwież stronę.')
			return
		}

		try {
			setLoading(true)
			let recaptchaToken = ''
			if (executeRecaptcha) {
				recaptchaToken = await executeRecaptcha('contact')
			}

			const res = await fetch(`${API_URL}/reports/contact`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), description: description.trim(), recaptchaToken }),
			})
			const data = await res.json()
			if (!res.ok) throw new Error(data.message || 'Błąd wysyłki wiadomości.')

			setSuccess(data.message || 'Wiadomość została wysłana.')
			setEmail('')
			setDescription('')
		} catch (err: any) {
			setError(err.message || 'Wystąpił błąd podczas wysyłania wiadomości.')
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
							© {new Date().getFullYear()} BistroMapa. Wszystkie prawa zastrzeżone.
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
						<h3 className='font-mono text-xs uppercase tracking-widest text-stone-900 font-bold mb-3'>Kontakt</h3>
						<form onSubmit={handleSubmit} className='space-y-3 font-sans text-xs'>
							<div className='space-y-1'>
								<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>Twój e-mail *</label>
								<input
									type='email'
									value={email}
									onChange={e => setEmail(e.target.value)}
									placeholder='np. jan@przyklad.pl'
									className='w-full px-3 py-2 bg-white border border-stone-200 outline-none text-sm focus:border-stone-400'
								/>
							</div>
							<div className='space-y-1'>
								<label className='text-[10px] font-mono text-stone-500 uppercase font-bold block'>Wiadomość *</label>
								<textarea
									value={description}
									onChange={e => setDescription(e.target.value)}
									placeholder='Napisz do nas...'
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
									'Wysyłanie...'
								) : (
									<>
										<Send className='w-3.5 h-3.5' /> Wyślij
									</>
								)}
							</button>
						</form>
					</div>

					{/* Linki */}
					<div className='text-left'>
						<h3 className='font-mono text-xs uppercase tracking-widest text-stone-900 font-bold mb-3'>Informacje</h3>
						<div className='flex flex-col items-start gap-2 font-mono text-xs text-stone-400'>
							<a href='/regulamin.pdf' target='_blank' rel='noreferrer' className='hover:text-black transition-colors'>
								Regulamin
							</a>
							<a
								href='/policy-privacy.pdf'
								target='_blank'
								rel='noreferrer'
								className='hover:text-black transition-colors'>
								Prywatność
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
								COFFE
							</a>
						</div>
					</div>
				</div>
			</div>
		</footer>
	)
}

export default Footer
