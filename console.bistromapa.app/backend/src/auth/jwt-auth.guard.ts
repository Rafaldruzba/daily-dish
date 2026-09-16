import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import type { Request } from 'express'

import { IS_PUBLIC_KEY } from './public.decorator'
import { SESSION_COOKIE, type AuthUser, type JwtPayload } from './auth.types'

/**
 * Globalny guard — domyślnie wszystko zamknięte (§28), otwarte tylko to,
 * co oznaczone @Public(). Podpis JWT jest weryfikowany, nie tylko obecność nagłówka.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(
		private readonly jwt: JwtService,
		private readonly reflector: Reflector,
	) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
			context.getHandler(),
			context.getClass(),
		])
		if (isPublic) return true

		const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
		const token = this.extractToken(request)

		if (!token) {
			throw new UnauthorizedException('Brak aktywnej sesji')
		}

		try {
			const payload = await this.jwt.verifyAsync<JwtPayload>(token)
			request.user = { id: payload.sub, email: payload.email, role: payload.role, name: null }
			return true
		} catch {
			throw new UnauthorizedException('Sesja wygasła lub token jest nieprawidłowy')
		}
	}

	private extractToken(request: Request): string | null {
		const cookieToken = (request.cookies as Record<string, string> | undefined)?.[SESSION_COOKIE]
		if (cookieToken) return cookieToken

		const header = request.headers.authorization
		if (header?.startsWith('Bearer ')) return header.slice(7)

		return null
	}
}
