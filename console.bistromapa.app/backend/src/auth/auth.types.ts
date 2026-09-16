export type AdminRole = 'ADMIN' | 'MANAGER'

/** To, co ląduje w req.user po walidacji JWT. */
export interface AuthUser {
	id: string
	email: string
	role: AdminRole
	name: string | null
}

export interface JwtPayload {
	sub: string
	email: string
	role: AdminRole
}

export const SESSION_COOKIE = 'crm_session'
