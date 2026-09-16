/**
 * Zamienia slug kuchni na etykietę do wyświetlenia (np. "kuchnia-wloska" -> "Kuchnia wloska").
 * W bazie trzymamy slugi (stabilne URL-e), a UI pokazuje wersję czytelną.
 */
export function formatCuisine(slug: string): string {
	const label = slug.replace(/-/g, ' ').trim()
	if (!label) return slug

	return label.charAt(0).toUpperCase() + label.slice(1)
}

/** Zamienia listę wpisaną przez użytkownika ("Pizza, Kuchnia włoska") na tablicę wartości. */
export function parseCuisinesInput(value: string): string[] {
	return value
		.split(',')
		.map(item => item.trim())
		.filter(item => item.length > 0)
}
