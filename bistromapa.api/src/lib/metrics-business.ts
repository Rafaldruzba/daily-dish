// Metryki biznesowe - specyficzne dla BistroMapa
import client from 'prom-client'
const register = new client.Registry(); // własny - unika circular dependency
import prisma from './prisma.js'

export const restaurantsTotal = new client.Gauge({
	name: 'app_restaurants_total',
	help: 'Liczba restauracji w systemie',
	labelNames: ['status'],
	registers: [register],
	async collect() {
		try {
			const approved = await prisma.restaurant.count({ where: { status: 'APPROVED' } })
			const pending = await prisma.restaurant.count({ where: { status: 'PENDING' } })
			const removal = await prisma.restaurant.count({ where: { status: 'REMOVAL' } })
			this.set({ status: 'approved' }, approved)
			this.set({ status: 'pending' }, pending)
			this.set({ status: 'removal' }, removal)
		} catch (err) {
			// Silent fail - metryki nie powinny crashować aplikacji
		}
	},
})

export const dishesToday = new client.Gauge({
	name: 'app_dishes_today',
	help: 'Liczba dań dnia dzisiaj',
	registers: [register],
	async collect() {
		try {
			const today = new Date()
			today.setHours(0, 0, 0, 0)
			const count = await prisma.dish.count({
				where: { date: { gte: today } },
			})
			this.set(count)
		} catch (err) {
			// Silent fail
		}
	},
})

export const subscriptionsActive = new client.Gauge({
	name: 'app_subscriptions_active',
	help: 'Liczba aktywnych subskrypcji',
	labelNames: ['tier'],
	registers: [register],
	async collect() {
		try {
			const base = await prisma.subscription.count({
				where: { status: 'ACTIVE', tier: 'BASE' },
			})
			const promotion = await prisma.subscription.count({
				where: { status: 'ACTIVE', tier: 'PROMOTION' },
			})
			this.set({ tier: 'base' }, base)
			this.set({ tier: 'promotion' }, promotion)
		} catch (err) {
			// Silent fail
		}
	},
})

export const restaurantsNewToday = new client.Counter({
	name: 'app_restaurants_new_total',
	help: 'Liczba nowo dodanych restauracji (całkowita)',
	registers: [register],
})

// Użycie w kodzie dodającym nową restaurację:
// restaurantsNewToday.inc()
