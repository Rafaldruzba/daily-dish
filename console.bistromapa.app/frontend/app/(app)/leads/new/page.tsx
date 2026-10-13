import { LeadForm } from '@/components/leads/LeadForm'
import { PageHeader } from '@/components/ui'
import Link from 'next/link'

export default function NewLeadPage() {
	return (
		<div className='p-6 md:p-8'>
			<PageHeader
				title='Nowy lead'
				subtitle='Dodaj restaurację do CRM'
				action={
					<Link href='/leads' className='btn-secondary'>
						← Leady
					</Link>
				}
			/>

			<LeadForm />
		</div>
	)
}
