/** Granice dni liczone w czasie serwera — spójne dla follow-upów i dashboardu. */

export function startOfToday(reference: Date = new Date()): Date {
	const date = new Date(reference)
	date.setHours(0, 0, 0, 0)
	return date
}

export function startOfTomorrow(reference: Date = new Date()): Date {
	return addDays(startOfToday(reference), 1)
}

export function addDays(reference: Date, days: number): Date {
	const date = new Date(reference)
	date.setDate(date.getDate() + days)
	return date
}
