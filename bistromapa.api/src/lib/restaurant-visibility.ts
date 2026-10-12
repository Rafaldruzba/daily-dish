/**
 * Kanoniczna definicja „lokal widoczny publicznie".
 *
 * `Restaurant.status` to jedna kolumna na dwa pojęcia naraz: stan moderacji
 * (PENDING / APPROVED / REJECTED) oraz cykl życia subskrypcji
 * (ACTIVE / PAUSE / REMOVAL). Panel admina przy zatwierdzaniu zapisuje ACTIVE,
 * a przywrócenie konta z karencji zapisuje APPROVED — obie wartości znaczą
 * „zatwierdzony i żywy".
 *
 * Wcześniej każdy czytelnik filtrował po swojemu (`IN`, `= 'ACTIVE'`, `= 'APPROVED'`),
 * przez co katalog, sitemap i kolejka scrapera widziały różne zbiory lokali.
 * Nowe zapytania mają używać tego modułu, nie własnego literału.
 *
 * Uwaga: `Subscription.status = 'ACTIVE'` to inna kolumna i inne znaczenie — nie mylić.
 */
export const VISIBLE_RESTAURANT_STATUSES = ['APPROVED', 'ACTIVE'] as const

/** Warunek Prisma dla lokalu widocznego publicznie (katalog, sitemap, scraper, oceny). */
export const visibleRestaurantWhere = {
	isActive: true,
	status: { in: [...VISIBLE_RESTAURANT_STATUSES] },
}
