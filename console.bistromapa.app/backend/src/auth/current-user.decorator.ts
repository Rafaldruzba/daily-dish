import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

import type { AuthUser } from './auth.types'

/** req.user ustawiany przez JwtAuthGuard. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
	const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>()

	if (!request.user) {
		throw new Error('CurrentUser użyty bez JwtAuthGuard')
	}

	return request.user
})
