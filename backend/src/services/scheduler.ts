import prisma from '../lib/prisma.js'
import redisClient from '../lib/redis.js'
import { fetchTodayDishes } from './daily-dish.service.js'

let lastRunDate: string | null = null

/**
 * Checks for any ACTIVE subscriptions that have expired (endsAt < now)
 * and updates their status to EXPIRED in the database, clearing the Redis cache.
 */
export async function checkExpiredSubscriptions() {
	try {
		const now = new Date()
		const expiredSubs = await prisma.subscription.findMany({
			where: {
				status: 'ACTIVE',
				endsAt: { lt: now }
			},
			include: {
				restaurant: {
					select: {
						city: true
					}
				}
			}
		})

		if (expiredSubs.length > 0) {
			console.log(`⏰ [Scheduler] Znaleziono ${expiredSubs.length} wygasłych subskrypcji. Aktualizacja...`)

			// Update statuses to EXPIRED
			await prisma.subscription.updateMany({
				where: {
					id: { in: expiredSubs.map(s => s.id) }
				},
				data: {
					status: 'EXPIRED'
				}
			})

			// Invalidate Redis cache
			if (redisClient.isOpen) {
				const cities = [...new Set(expiredSubs.map(s => s.restaurant.city))]
				for (const city of cities) {
					await redisClient.del(`restaurants:${city}`)
					console.log(`🧹 [Redis] Wyczyszczono cache dla miasta: ${city} z powodu wygaśnięcia subskrypcji.`)
				}
				await redisClient.del('restaurants:all')
			}
		}
	} catch (error) {
		console.error('❌ [Scheduler] Błąd podczas sprawdzania/wygaszania subskrypcji:', error)
	}
}

export function startDailyScheduler() {
	console.log(
		'⏰ [Scheduler] Inicjalizacja harmonogramu... Pobieranie dań (12:00 polskiego czasu) oraz sprawdzanie subskrypcji co 1 godzinę.',
	)

	// Sprawdź wygasłe subskrypcje raz przy starcie
	checkExpiredSubscriptions().catch(console.error)

	// Sprawdzaj wygasłe subskrypcje co godzinę (3 600 000 ms)
	setInterval(async () => {
		console.log('⏰ [Scheduler] Cykliczne sprawdzanie wygasłych subskrypcji...')
		await checkExpiredSubscriptions()
	}, 3600000)

	// Sprawdzaj czas na pobranie dań co minutę (60 000 ms)
	setInterval(async () => {
		try {
			const now = new Date()
			const hours = now.getHours()
			const minutes = now.getMinutes()
			const todayString = now.toISOString().split('T')[0] // 'YYYY-MM-DD'

			// Wybija godzina 10:00 UTC (12 polskiego czasu), oraz sprawdzamy czy scheduler już nie wystartował dzisiaj
			if (hours === 10 && minutes === 0 && lastRunDate !== todayString) {
				lastRunDate = todayString
				console.log(`⏰ [Scheduler] Wybiła godzina 10:00! Automatyczne pobieranie dzisiejszych ofert rozpoczęte...`)

				const results = await fetchTodayDishes()
				const successful = results.filter((r: any) => r.status === 'success').length
				const errors = results.filter((r: any) => r.status === 'error').length

				console.log(`⏰ [Scheduler] Sukces: pobrano dania z ${successful} restauracji. Błędy: ${errors}.`)
			}
		} catch (error) {
			console.error('❌ [Scheduler] Błąd podczas sprawdzania czasu lub pobierania dań:', error)
		}
	}, 60000)
}
