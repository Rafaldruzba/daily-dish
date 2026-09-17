import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, Res } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Throttle } from '@nestjs/throttler'
import type { CookieOptions, Request, Response } from 'express'

import { CurrentUser } from './current-user.decorator'
import { LoginDto } from './dto/login.dto'
import { Public } from './public.decorator'
import { AuthService } from './auth.service'
import { SESSION_COOKIE, type AuthUser } from './auth.types'
import { ChangePasswordDto } from './dto/change-password.dto'

@Controller('auth')
export class AuthController {
	constructor(
		private readonly auth: AuthService,
		private readonly config: ConfigService,
	) {}

	// @HttpCode(200): Nest domyślnie zwraca 201 dla POST, a logowanie nic nie tworzy.
	@Public()
	@HttpCode(HttpStatus.OK)
	@Throttle({ default: { limit: 10, ttl: 60_000 } })
	@Post('login')
	async login(
		@Body() dto: LoginDto,
		@Req() request: Request,
		@Res({ passthrough: true }) response: Response,
	): Promise<{ user: AuthUser }> {
		const { token, user } = await this.auth.login(dto, request.ip)

		// JWT wyłącznie w httpOnly cookie — frontend nigdy nie widzi tokenu (§28).
		response.cookie(SESSION_COOKIE, token, this.cookieOptions())

		return { user }
	}

	@HttpCode(HttpStatus.OK)
	@Post('logout')
	logout(@Res({ passthrough: true }) response: Response): { loggedOut: true } {
		response.clearCookie(SESSION_COOKIE, { ...this.cookieOptions(), maxAge: undefined })
		return { loggedOut: true }
	}

	@Get('me')
	me(@CurrentUser() user: AuthUser): Promise<AuthUser> {
		return this.auth.me(user.id)
	}

	@HttpCode(HttpStatus.OK)
	@Post('password')
	async changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto): Promise<{ changed: true }> {
		await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword)
		return { changed: true }
	}

	private cookieOptions(): CookieOptions {
		const production = this.config.get<string>('NODE_ENV') === 'production'

		return {
			httpOnly: true,
			sameSite: 'lax',
			secure: production,
			path: '/',
			maxAge: msFromJwtExpiry(this.config.get<string>('JWT_EXPIRES_IN') ?? '12h'),
		}
	}
}

/** '12h' / '30m' / '7d' → milisekundy (maxAge ciasteczka). */
function msFromJwtExpiry(value: string): number {
	const match = /^(\d+)([smhd])?$/.exec(value.trim())
	if (!match) return 12 * 60 * 60 * 1000

	const amount = Number(match[1])
	const unit = match[2] ?? 's'
	const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }

	return amount * multipliers[unit]
}
