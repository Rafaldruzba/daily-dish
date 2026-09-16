import { ImportWizard } from '@/components/import/ImportWizard'
import { PageHeader } from '@/components/ui'

export default function ImportPage() {
	return (
		<div className="p-6 md:p-8">
			<PageHeader
				title="Import"
				subtitle="CSV / XLSX — podgląd, mapowanie kolumn, duplikaty, dopiero potem zapis"
			/>
			<ImportWizard />
		</div>
	)
}
