import { Mail } from 'lucide-react'
import Link from 'next/link'

import { PasswordForm } from '@/components/PasswordForm'
import { PageHeader } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'
import { formatDateTime } from '@/lib/format'
import type { CurrentUser } from '@/types'

export default async function SettingsPage() {
	const user = await fetchOrLogin<CurrentUser>('/auth/me')

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Ustawienia"
				subtitle="Konto i konfiguracja panelu"
				action={
					<Link href="/settings/emails" className="btn-secondary">
						<Mail className="h-3.5 w-3.5" aria-hidden />
						Szablony emaili
					</Link>
				}
			/>

			<div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
				<section className="card">
					<h2 className="label-mono">Konto</h2>
					<dl className="mt-4 space-y-3 text-sm">
						<div>
							<dt className="label-mono">Email</dt>
							<dd className="mt-1 font-medium">{user.email}</dd>
						</div>
						<div>
							<dt className="label-mono">Rola</dt>
							<dd className="mt-1 font-medium">{user.role}</dd>
						</div>
						<div>
							<dt className="label-mono">Sesja</dt>
							<dd className="mt-1 font-medium">Ciasteczko httpOnly · ważne 12 h</dd>
						</div>
						<div>
							<dt className="label-mono">Dziś</dt>
							<dd className="mt-1 font-medium">{formatDateTime(new Date().toISOString())}</dd>
						</div>
					</dl>
				</section>

				<PasswordForm />
			</div>
		</div>
	)
}
