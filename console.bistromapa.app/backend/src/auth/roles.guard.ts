import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'

import type { AdminRole, AuthUser } from './auth.types'
import { ROLES_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
	constructor(private readonly reflector: Reflector) {}

	canActivate(context: ExecutionContext): boolean {
		const required = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
			context.getHandler(),
			context.getClass(),
		])
		if (!required || required.length === 0) return true

		const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()
		const role = request.user?.role

		if (!role || !required.includes(role)) {
			throw new ForbiddenException('Brak uprawnień do tej operacji')
		}

		return true
	}
}
