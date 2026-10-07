import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

/** @type {import('next').NextConfig} */
const nextConfig = {
	async rewrites() {
		return [
			{
				source: '/api/:path*',
				destination: `${process.env.BACKEND_API_URL || 'http://localhost:3000'}/api/:path*`,
			},
			{
				// CRM (console.bistromapa.app) weryfikuje token aktywacyjny — proxujemy go
				// server-side, żeby token nie leciał cross-origin z przeglądarki.
				source: '/crm-api/:path*',
				destination: `${process.env.CRM_API_URL || 'http://localhost:3002'}/api/:path*`,
			},
			{
				source: '/restaurant/:path*',
				destination: '/pl/restaurant/:path*',
			},
			{
				source: '/restaurants/:path*',
				destination: '/pl/restaurants/:path*',
			}
		]
	},
	images: {
		remotePatterns: [
			{
				protocol: 'https',
				hostname: '*.amazonaws.com',
			},


		],
	},
	experimental: {
		serverActions: {
			allowedOrigins: ['localhost:3000'],
		},
	},
}

export default withNextIntl(nextConfig)
