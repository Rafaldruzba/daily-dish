import createMiddleware from 'next-intl/middleware'
import { routing } from './i18n/routing'

export default createMiddleware({
	...routing,
	localePrefix: 'always',
})

export const config = {
	matcher: ['/((?!api|_next|.*\\..*).*)'],
}
