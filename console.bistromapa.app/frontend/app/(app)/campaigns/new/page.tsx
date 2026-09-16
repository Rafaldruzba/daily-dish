import Link from 'next/link'

import { CampaignForm } from '@/components/campaigns/CampaignForm'
import { PageHeader } from '@/components/ui'
import { fetchOrLogin } from '@/lib/api'

export default async function NewCampaignPage() {
	// Pokazujemy, jakie źródło danych jest aktywne — mock czy Google Places (§19).
	const provider = await fetchOrLogin<{ source: string; configured: boolean }>('/campaigns/provider')

	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Nowa kampania"
				subtitle={`Źródło leadów: ${provider.source}${provider.configured ? '' : ' (nieskonfigurowane)'}`}
				action={
					<Link href="/campaigns" className="btn-secondary">
						← Kampanie
					</Link>
				}
			/>
			<CampaignForm />
		</div>
	)
}
