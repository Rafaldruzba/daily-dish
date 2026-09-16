/**
 * Walidacja zmiennych środowiskowych przy starcie — lepiej wywalić się od razu
 * niż działać z pustym JWT_SECRET czy bez bazy (readme §28).
 */
const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'FRONTEND_URL'] as const

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
	const missing = REQUIRED.filter((key) => {
		const value = config[key]
		return value === undefined || value === null || String(value).trim() === ''
	})

	if (missing.length > 0) {
		throw new Error(`Brak wymaganych zmiennych środowiskowych: ${missing.join(', ')}`)
	}

	if (String(config.JWT_SECRET).length < 32) {
		throw new Error('JWT_SECRET musi mieć co najmniej 32 znaki')
	}

	return {
		...config,
		PORT: Number(config.PORT ?? 3002),
		JWT_EXPIRES_IN: String(config.JWT_EXPIRES_IN ?? '12h'),
		NODE_ENV: String(config.NODE_ENV ?? 'development'),
	}
}
