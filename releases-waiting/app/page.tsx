import { Countdown } from '@/components/countdown'
import { STATUS_DOT, STATUS_LABEL, WORK_NOTES } from '@/lib/work-notes'

export default function Home() {
	return (
		<main className='mx-auto flex w-full max-w-3xl flex-col items-center px-6 py-16 sm:py-24'>
			<img src='/bistro-logo.png' alt='logo bistromapa.app' className='w-48 h-48' />
			<span className='font-mono text-[10px] uppercase tracking-[0.35em] text-stone-400'>BistroMapa</span>

			<h1 className='mt-8 text-center font-serif text-5xl font-black tracking-tight sm:text-7xl'>Już wkrótce</h1>

			<p className='mt-5 max-w-xl text-center text-base leading-relaxed text-stone-500 sm:text-lg'>
				Pracujemy nad kolejnym wydaniem. Poniżej licznik do zapowiedzianego terminu i krótka lista tego, co aktualnie
				powstaje w projekcie.
			</p>

			<h3 className='mt-8 text-center font-serif text-2xl font-black tracking-tight sm:text-3xl'>KONTAKT:</h3>
			<a
				href='mailto:kontakt@bistromapa.app'
				className='mt-5 max-w-xl text-center text-base leading-relaxed text-stone-500 sm:text-lg'>
				kontakt@bistromapa.app
			</a>

			<Countdown />

			<section className='mt-16 w-full'>
				<div className='flex items-baseline justify-between border-b border-stone-200 pb-3'>
					<h2 className='font-mono text-xs uppercase tracking-widest text-stone-400'>Nad czym pracujemy</h2>
					<span className='font-mono text-[10px] uppercase tracking-wider text-stone-300'>
						{WORK_NOTES.length} {WORK_NOTES.length === 1 ? 'temat' : 'tematy'}
					</span>
				</div>

				<ul className='divide-y divide-stone-100'>
					{WORK_NOTES.map(note => (
						<li key={note.title} className='py-5'>
							<div className='flex flex-wrap items-center gap-3'>
								<span className={`h-2 w-2 rounded-full ${STATUS_DOT[note.status]}`} />
								<h3 className='font-semibold'>{note.title}</h3>
								<span className='font-mono text-[10px] uppercase tracking-widest text-stone-400'>
									{STATUS_LABEL[note.status]}
								</span>
								<span className='ml-auto font-mono text-[10px] uppercase tracking-wider text-stone-300'>
									{formatNoteDate(note.updatedAt)}
								</span>
							</div>
							<p className='mt-2 text-sm leading-relaxed text-stone-500'>{note.description}</p>
						</li>
					))}
				</ul>
			</section>

			<footer className='mt-16 w-full border-t border-stone-200 pt-6'>
				<p className='font-mono text-[10px] uppercase tracking-wider text-stone-400'>
					BistroMapa · informacje o wydaniach
				</p>
			</footer>
		</main>
	)
}

/** ISO (YYYY-MM-DD) → DD.MM.RRRR, bez Intl — ten sam wynik na serwerze i w kliencie. */
function formatNoteDate(iso: string): string {
	const [year, month, day] = iso.split('-')

	return `${day}.${month}.${year}`
}
