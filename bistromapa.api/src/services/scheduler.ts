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
						id: true,
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

			// Zmień status restauracji na PAUSE jeśli brak innych aktywnych subskrypcji
			const restaurantIds = [...new Set(expiredSubs.map(s => s.restaurantId))]
			for (const rId of restaurantIds) {
				const activeSubsCount = await prisma.subscription.count({
					where: {
						restaurantId: rId,
						status: 'ACTIVE',
						endsAt: { gt: now }
					}
				})

				if (activeSubsCount === 0) {
					console.log(`⏸️ [Scheduler] Lokal ${rId} przechodzi w stan PAUSE z powodu wygaśnięcia subskrypcji.`)
					await prisma.restaurant.update({
						where: { id: rId },
						data: {
							status: 'PAUSE',
							isActive: false
						}
					})
				}
			}

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

/**
 * Searches for restaurants in status 'REMOVAL' whose 3-month grace period has passed (removalRequestedAt < 3 months ago)
 * and permanently deletes them and their associated OWNER user accounts if they have no other active restaurants.
 */
export async function cleanExpiredRemovalAccounts() {
	try {
		const now = new Date()
		const threeMonthsAgo = new Date()
		threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)

		// Znajdź restauracje z statusem REMOVAL, dla których minęło 3 miesiące
		const expiredRestaurants = await prisma.restaurant.findMany({
			where: {
				status: 'REMOVAL',
				removalRequestedAt: { lt: threeMonthsAgo }
			},
			select: {
				id: true,
				name: true,
				userId: true
			}
		})

		if (expiredRestaurants.length > 0) {
			console.log(`⏰ [Scheduler] Znaleziono ${expiredRestaurants.length} restauracji w stanie REMOVAL do trwałego usunięcia.`)

			const ownerUserIds = [...new Set(expiredRestaurants.map(r => r.userId).filter(Boolean))] as string[]

			for (const rest of expiredRestaurants) {
				// Permanentne usunięcie restauracji z bazy (usuwanie kaskadowe)
				await prisma.restaurant.delete({
					where: { id: rest.id }
				})
				console.log(`🗑️ [Scheduler] Trwale usunięto z bazy restaurację: ${rest.name} (${rest.id})`)
			}

			// Sprawdź, czy któryś z właścicieli nie ma już żadnych innych restauracji i można go usunąć
			for (const uId of ownerUserIds) {
				const remainingRestCount = await prisma.restaurant.count({
					where: { userId: uId }
				})

				if (remainingRestCount === 0) {
					console.log(`🗑️ [Scheduler] Właściciel ${uId} nie posiada już żadnych lokali w bazie. Trwałe usunięcie konta użytkownika...`)
					await prisma.user.delete({
						where: { id: uId }
					})
				}
			}
		}
	} catch (error) {
		console.error('❌ [Scheduler] Błąd podczas czyszczenia kont w stanie REMOVAL:', error)
	}
}

export function startDailyScheduler() {
	console.log(
		'⏰ [Scheduler] Inicjalizacja harmonogramu... Pobieranie dań (12:00 polskiego czasu), sprawdzanie subskrypcji co 1 godzinę, usuwanie kont REMOVAL co 24h, oraz synchronizacja Google Places co 7 dni.',
	)

	// Sprawdź wygasłe subskrypcje raz przy starcie
	checkExpiredSubscriptions().catch(console.error)

	// Sprawdź konta w stanie REMOVAL raz przy starcie
	cleanExpiredRemovalAccounts().catch(console.error)

	// Sprawdzaj wygasłe subskrypcje co godzinę (3 600 000 ms)
	setInterval(async () => {
		console.log('⏰ [Scheduler] Cykliczne sprawdzanie wygasłych subskrypcji...')
		await checkExpiredSubscriptions()
	}, 3600000)

	// Sprawdzaj konta w stanie REMOVAL raz na dobę (86 400 000 ms)
	setInterval(async () => {
		console.log('⏰ [Scheduler] Cykliczne czyszczenie wygasłych kont w stanie REMOVAL...')
		await cleanExpiredRemovalAccounts()
	}, 86400000)

	// Synchronizuj oceny z Google Places co 7 dni (604 800 000 ms)
	setInterval(async () => {
		try {
			console.log('🔄 [Scheduler] Rozpoczynam tygodniową synchronizację ocen z Google Places...')
			const { syncAllRestaurantsGoogleDetails } = await import('./google-maps.service.js')
			await syncAllRestaurantsGoogleDetails()
		} catch (error) {
			console.error('❌ [Scheduler] Błąd podczas automatycznej synchronizacji ocen Google Places:', error)
		}
	}, 604800000)

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
