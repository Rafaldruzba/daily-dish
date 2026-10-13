// Metryki użytkowników - tylko dla backend i backend-console.
import client from 'prom-client'
import { register } from './metrics.js'
import prisma from './prisma.js'
import redisClient from './redis.js'

async function countUsers(): Promise<number> {
	return prisma.user.count()
}

async function countActiveUsers(windowMs = 5 * 60 * 1000): Promise<number> {
	// Aktywni = użytkownicy z requestem w ostatnich 5 min.
	try {
		await redisClient.zRemRangeByScore('metrics:active_users', 0, Date.now() - windowMs)
		return await redisClient.zCard('metrics:active_users')
	} catch {
		return 0
	}
}

// Wywołaj w middleware po uwierzytelnieniu requestu:
export function trackActiveUser(userId: string) {
	redisClient.zAdd('metrics:active_users', { score: Date.now(), value: userId }).catch(() => {
		/* silent fail - metryki nie powinny crashować aplikacji */
	})
}

export const usersTotal = new client.Gauge({
	name: 'app_users_total',
	help: 'Liczba zarejestrowanych użytkowników',
	registers: [register],
	async collect() {
		try {
			this.set(await countUsers())
		} catch {
			/* zostaw ostatnią wartość */
		}
	},
})

export const activeUsers = new client.Gauge({
	name: 'app_active_users',
	help: 'Użytkownicy aktywni w ostatnich 5 minutach',
	registers: [register],
	async collect() {
		try {
			this.set(await countActiveUsers())
		} catch {
			/* j.w. */
		}
	},
})

export const registrations = new client.Counter({
	name: 'app_user_registrations_total',
	help: 'Nowe rejestracje',
	registers: [register],
})

export const logins = new client.Counter({
	name: 'app_user_logins_total',
	help: 'Próby logowania',
	labelNames: ['result'], // 'success' | 'failure'
	registers: [register],
})
