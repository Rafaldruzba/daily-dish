import { notFound } from 'next/navigation'

import { LeadDetailView } from '@/components/leads/LeadDetailView'
import { ApiError, fetchOrLogin, serialize } from '@/lib/api'
import type { LeadDetail } from '@/types'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params

	try {
		const lead = await fetchOrLogin<LeadDetail>(`/leads/${id}`)

		// Data z Prisma → ISO string przed przekazaniem do komponentu klienckiego.
		return <LeadDetailView lead={serialize<LeadDetail>(lead)} />
	} catch (error) {
		if (error instanceof ApiError && error.status === 404) notFound()
		throw error
	}
}
