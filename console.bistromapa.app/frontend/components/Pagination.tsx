import Link from 'next/link'

interface PaginationProps {
	page: number
	pages: number
	total: number
	buildHref: (page: number) => string
}

export function Pagination({ page, pages, total, buildHref }: PaginationProps) {
	if (pages <= 1) {
		return (
			<p className="py-4 font-mono text-[10px] uppercase tracking-wider text-stone-400">
				{total} {total === 1 ? 'rekord' : 'rekordów'}
			</p>
		)
	}

	return (
		<div className="flex items-center justify-between gap-4 py-4">
			<p className="font-mono text-[10px] uppercase tracking-wider text-stone-400">
				Strona {page} z {pages} · {total} rekordów
			</p>
			<div className="flex gap-2">
				{page > 1 ? (
					<Link href={buildHref(page - 1)} className="btn-secondary">
						← Poprzednia
					</Link>
				) : (
					<span className="btn-secondary opacity-40">← Poprzednia</span>
				)}
				{page < pages ? (
					<Link href={buildHref(page + 1)} className="btn-secondary">
						Następna →
					</Link>
				) : (
					<span className="btn-secondary opacity-40">Następna →</span>
				)}
			</div>
		</div>
	)
}
