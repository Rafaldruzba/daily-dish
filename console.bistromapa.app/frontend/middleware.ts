import { NextResponse, type NextRequest } from 'next/server'

const SESSION_COOKIE = 'crm_session'

/**
 * Sesja jest ciasteczkiem httpOnly, więc middleware sprawdza tylko jej obecność —
 * podpis i uprawnienia weryfikuje backend przy każdym żądaniu (§28).
 */
export function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl
	const hasSession = request.cookies.has(SESSION_COOKIE)

	if (!hasSession && pathname !== '/login') {
		const loginUrl = new URL('/login', request.url)
		loginUrl.searchParams.set('next', pathname)

		return NextResponse.redirect(loginUrl)
	}

	if (hasSession && pathname === '/login') {
		return NextResponse.redirect(new URL('/', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
