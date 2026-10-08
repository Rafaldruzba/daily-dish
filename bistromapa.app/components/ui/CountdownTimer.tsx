'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles } from 'lucide-react'

interface CountdownProps {
	label?: string
	secondsUnit?: string
	targetUrl?: string
}

export default function CountdownTimer({
	label = 'Odsyłamy Cię do głównej karty dań za',
	secondsUnit = 's',
	targetUrl = '/',
}: CountdownProps) {
	const router = useRouter()
	const [countdown, setCountdown] = useState(7)

	useEffect(() => {
		// Przekierowanie wykonuje się po wyrenderowaniu, gdy licznik osiągnie 0
		if (countdown <= 0) {
			router.push(targetUrl)
			return
		}

		const timer = setInterval(() => {
			setCountdown(prev => prev - 1)
		}, 1000)

		return () => clearInterval(timer)
	}, [countdown, router, targetUrl])

	return (
		<div className='flex items-center justify-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200/70 p-3.5 text-xs font-medium text-amber-900 shadow-sm transition-all'>
			<Sparkles className='w-4 h-4 text-amber-600 animate-pulse shrink-0' />
			<span className='font-sans'>
				{label}{' '}
				<strong className='font-bold text-amber-950 font-mono text-sm underline underline-offset-2'>
					{countdown}
					{secondsUnit}
				</strong>
				...
			</span>
		</div>
	)
}
