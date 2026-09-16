'use client'

import {
	BarChart3,
	Building2,
	Import,
	LogOut,
	Mail,
	Megaphone,
	Settings,
	Zap,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const NAV_ITEMS = [
	{ href: '/', label: 'Dashboard', icon: BarChart3 },
	{ href: '/leads', label: 'Leady', icon: Building2 },
	{ href: '/campaigns', label: 'Kampanie', icon: Megaphone },
	{ href: '/import', label: 'Import', icon: Import },
	{ href: '/automation', label: 'Automatyzacja', icon: Zap },
	{ href: '/settings/emails', label: 'Emaile', icon: Mail },
	{ href: '/settings', label: 'Ustawienia', icon: Settings },
]

export function Sidebar() {
	const pathname = usePathname()
	const router = useRouter()

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' })
		router.push('/login')
		router.refresh()
	}

	return (
		<aside className="flex shrink-0 flex-col border-b border-stone-200 bg-white md:min-h-screen md:w-56 md:border-b-0 md:border-r">
			<div className="flex items-center justify-between px-5 py-4 md:block">
				<Link href="/" className="font-serif text-lg font-black tracking-tight">
					BistroMapa
					<span className="ml-1 font-mono text-[10px] uppercase tracking-widest text-stone-400">
						Console
					</span>
				</Link>
				<button
					type="button"
					onClick={logout}
					className="font-mono text-[10px] uppercase tracking-widest text-stone-400 transition hover:text-stone-900 md:hidden"
				>
					Wyloguj
				</button>
			</div>

			<nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-1 md:flex-col md:gap-0 md:overflow-visible md:pb-0">
				{NAV_ITEMS.map((item) => {
					const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
					const Icon = item.icon

					return (
						<Link
							key={item.href}
							href={item.href}
							className={`flex shrink-0 items-center gap-2 px-3 py-2 font-mono text-xs uppercase tracking-wider transition ${
								active ? 'bg-stone-900 text-white' : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
							}`}
						>
							<Icon className="h-4 w-4" aria-hidden />
							{item.label}
						</Link>
					)
				})}
			</nav>

			<button
				type="button"
				onClick={logout}
				className="hidden items-center gap-2 border-t border-stone-200 px-5 py-4 font-mono text-xs uppercase tracking-wider text-stone-400 transition hover:text-stone-900 md:flex"
			>
				<LogOut className="h-4 w-4" aria-hidden />
				Wyloguj
			</button>
		</aside>
	)
}
