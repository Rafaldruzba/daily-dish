import type { ReactNode } from 'react'

import { Sidebar } from '@/components/Sidebar'

export default function AppLayout({ children }: { children: ReactNode }) {
	return (
		<div className="flex min-h-screen flex-col md:flex-row">
			<Sidebar />
			<main className="min-w-0 flex-1">{children}</main>
		</div>
	)
}
