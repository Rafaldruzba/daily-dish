import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'

import { AuditService } from '../audit/audit.service'
import { PrismaService } from '../prisma/prisma.service'
import type { AdminRole, AuthUser, JwtPayload } from './auth.types'
import type { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
	/** Hash "donikąd" — wyrównuje czas odpowiedzi przy nieistniejącym koncie. */
	private readonly dummyHash = bcrypt.hashSync(randomUUID(), 10)

	constructor(
		private readonly prisma: PrismaService,
		private readonly jwt: JwtService,
		private readonly audit: AuditService,
	) {}

	async login(dto: LoginDto, ip?: string): Promise<{ token: string; user: AuthUser }> {
		const email = dto.email.trim().toLowerCase()
		const admin = await this.prisma.adminUser.findUnique({ where: { email } })
		const valid = await bcrypt.compare(dto.password, admin?.password ?? this.dummyHash)

		if (!admin || !valid) {
			await this.audit.log({ action: 'LOGIN_FAILED', details: { email }, ip })
			throw new UnauthorizedException('Nieprawidłowy email lub hasło')
		}

		const user = this.toAuthUser(admin.id, admin.email, admin.role, admin.name)
		const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role }
		const token = await this.jwt.signAsync(payload)

		await this.audit.log({ action: 'LOGIN', adminUserId: user.id, ip })

		return { token, user }
	}

	async me(userId: string): Promise<AuthUser> {
		const admin = await this.prisma.adminUser.findUnique({ where: { id: userId } })
		if (!admin) throw new UnauthorizedException('Konto nie istnieje')

		return this.toAuthUser(admin.id, admin.email, admin.role, admin.name)
	}

	async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
		const admin = await this.prisma.adminUser.findUnique({ where: { id: userId } })
		if (!admin) throw new UnauthorizedException('Konto nie istnieje')

		const valid = await bcrypt.compare(currentPassword, admin.password)
		if (!valid) throw new BadRequestException('Obecne hasło jest nieprawidłowe')

		await this.prisma.adminUser.update({
			where: { id: userId },
			data: { password: await bcrypt.hash(newPassword, 12) },
		})
	}

	private toAuthUser(id: string, email: string, role: string, name: string | null): AuthUser {
		return { id, email, role: role as AdminRole, name }
	}
}
