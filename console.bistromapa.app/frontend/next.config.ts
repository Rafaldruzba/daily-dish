import type { NextConfig } from 'next'

/**
 * Frontend rozmawia z API zawsze przez własny origin (/api/*), a Next przekazuje
 * żądanie do backendu Nest. Dzięki temu ciasteczko sesji jest first-party
 * i nie zależy od konfiguracji CORS w przeglądarce.
 */
const API_URL = process.env.API_URL ?? 'http://localhost:3002/api'

const nextConfig: NextConfig = {
	async rewrites() {
		return [{ source: '/api/:path*', destination: `${API_URL}/:path*` }]
	},
}

export default nextConfig
