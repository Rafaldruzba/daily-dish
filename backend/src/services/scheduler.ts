import { fetchTodayDishes } from './daily-dish.service.js'

let lastRunDate: string | null = null

export function startDailyScheduler() {
	console.log(
		'⏰ [Scheduler] Inicjalizacja harmonogramu... Automatyczne pobieranie dań ustawione na 12:00 każdego dnia.',
	)

	// Sprawdzaj czas co minutę (60 000 ms)
	setInterval(async () => {
		try {
			const now = new Date()
			const hours = now.getHours()
			const minutes = now.getMinutes()
			const todayString = now.toISOString().split('T')[0] // 'YYYY-MM-DD'

			// Wybija godzina 10:00 ( 12 polskiego czasu ), oraz sprawdzamy czy scheduler już nie wystartował dzisiaj
			if (hours === 10 && minutes === 0 && lastRunDate !== todayString) {
				lastRunDate = todayString
				console.log(`⏰ [Scheduler] Wybiła godzina 10:00! Automatyczne pobieranie dzisiejszych ofert rozpoczęte...`)

				const results = await fetchTodayDishes()
				const successful = results.filter(r => r.status === 'success').length
				const errors = results.filter(r => r.status === 'error').length

				console.log(`⏰ [Scheduler] Sukces: pobrano dania z ${successful} restauracji. Błędy: ${errors}.`)
			}
		} catch (error) {
			console.error('❌ [Scheduler] Błąd podczas sprawdzania czasu lub pobierania dań:', error)
		}
	}, 60000)
}
