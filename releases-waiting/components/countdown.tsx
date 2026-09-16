'use client'

import { useEffect, useState } from 'react'

// ── TUTAJ USTAW SWOJĄ STATYCZNĄ DATĘ ──────────────────────────────────────────
const DEFAULT_TARGET_DATE = '2026-10-01T20:00:00' // Format: RRRR-MM-DDTHH:mm:ss
// ─────────────────────────────────────────────────────────────────────────────

const DAY_MS = 86_400_000

interface Remaining {
	days: number
	hours: number
	minutes: number
	seconds: number
	elapsed: boolean
}

export function Countdown() {
	const [remaining, setRemaining] = useState<Remaining | null>(null)

	useEffect(() => {
		const targetTime = new Date(DEFAULT_TARGET_DATE).getTime()

		const tick = () => setRemaining(toRemaining(targetTime, Date.now()))
		tick()

		const interval = window.setInterval(tick, 1000)
		return () => window.clearInterval(interval)
	}, [])

	return (
		<section className='mt-12 w-full'>
			<div className='grid grid-cols-4 gap-2 sm:gap-4'>
				{SEGMENTS.map(segment => (
					<div
						key={segment.key}
						className='border border-stone-200 bg-white px-2 py-4 text-center shadow-sm sm:px-4 sm:py-6'>
						<p className='font-mono text-3xl font-black tabular-nums sm:text-5xl'>
							{remaining ? String(remaining[segment.key]).padStart(2, '0') : '––'}
						</p>
						<p className='mt-2 font-mono text-[10px] uppercase tracking-widest text-stone-400'>{segment.label}</p>
					</div>
				))}
			</div>

			<div className='mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4'>
				<p className='font-mono text-[11px] uppercase tracking-wider text-stone-500'>
					{!remaining
						? 'Ustawiamy termin…'
						: remaining.elapsed
							? 'Zapowiedziany termin już minął'
							: `Premiera: ${formatTarget(DEFAULT_TARGET_DATE)}`}
				</p>
			</div>
		</section>
	)
}

const SEGMENTS: { key: keyof Omit<Remaining, 'elapsed'>; label: string }[] = [
	{ key: 'days', label: 'dni' },
	{ key: 'hours', label: 'godzin' },
	{ key: 'minutes', label: 'minut' },
	{ key: 'seconds', label: 'sekund' },
]

function toRemaining(targetTime: number, now: number): Remaining {
	const distance = targetTime - now

	if (!Number.isFinite(distance) || distance <= 0) {
		return { days: 0, hours: 0, minutes: 0, seconds: 0, elapsed: true }
	}

	return {
		days: Math.floor(distance / DAY_MS),
		hours: Math.floor(distance / 3_600_000) % 24,
		minutes: Math.floor(distance / 60_000) % 60,
		seconds: Math.floor(distance / 1000) % 60,
		elapsed: false,
	}
}

function formatTarget(iso: string): string {
	return new Intl.DateTimeFormat('pl-PL', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))
}
