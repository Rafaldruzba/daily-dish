/** Domena, której subdomeny (www, console, staging…) mają dostęp do API. */
const ROOT_DOMAIN = 'bistromapa.app'

/**
 * Lista dozwolonych originów.
 *
 * `FRONTEND_URL` może zawierać kilka adresów rozdzielonych przecinkiem — bez tego
 * każdy nowy frontend wymaga zmiany kodu. Wartości są normalizowane (spacje,
 * końcowy ukośnik), bo wklejony z przeglądarki URL często kończy się slashem
 * i wtedy porównanie tekstowe cicho zawodzi.
 */
export function buildAllowedOrigins(frontendUrl: string | undefined = process.env.FRONTEND_URL): string[] {
	const fromEnv = (frontendUrl ?? '')
		.split(',')
		.map((value) => value.trim().replace(/\/+$/, ''))
		.filter(Boolean)

	return [
		...fromEnv,
		`https://${ROOT_DOMAIN}`,
		`https://www.${ROOT_DOMAIN}`,
		'https://staging.bistromapa.app',
		'https://console.bistromapa.app',
		'http://localhost:3000',
		'http://localhost:3001',
		'http://localhost:5173',
	]
}

/**
 * Czy przeglądarka z tego originu może wołać API.
 * Brak originu (żądanie server-to-server, np. z CRM lub curl) jest zawsze dozwolony —
 * CORS to mechanizm przeglądarki, więc nie dotyczy wywołań między serwerami.
 */
export function isOriginAllowed(origin: string | undefined, frontendUrl?: string): boolean {
	if (!origin) return true

	const normalized = origin.trim().replace(/\/+$/, '')

	// Własna domena i jej subdomeny
	if (normalized === `https://${ROOT_DOMAIN}` || normalized.endsWith(`.${ROOT_DOMAIN}`)) return true

	// Dowolny port lokalny (dev)
	if (/^https?:\/\/localhost(:\d+)?$/.test(normalized)) return true

	// Podglądy Railway
	if (/\.up\.railway\.app$/.test(normalized)) return true

	return buildAllowedOrigins(frontendUrl).includes(normalized)
}
