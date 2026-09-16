/**
 * Zamienia tekst na slug URL (np. "Piaseczno" -> "piaseczno", "Kuchnia włoska" -> "kuchnia-wloska").
 * Używane do generowania citySlug oraz slugów kuchni w routingu SEO.
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.trim()
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ł/g, 'l')
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
		.replace(/^-|-$/g, '')
}
