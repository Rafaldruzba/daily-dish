import prisma from '../lib/prisma.js'
import { fetchRestaurantDish } from './facebook.service.js'

export async function fetchTodayDishes() {
	const restaurants = await prisma.restaurant.findMany({
		where: {
			isActive: true,
		},
		orderBy: {
			name: 'asc',
		},
	})

	const results = []

	// Ustawiamy dzisiejszą datę na początek dnia (UTC) dla spójności w bazie
	const today = new Date()
	today.setUTCHours(0, 0, 0, 0)

	for (const restaurant of restaurants) {
		try {
			const dish = await fetchRestaurantDish(restaurant)

			if (!dish) {
				results.push({
					restaurantId: restaurant.id,
					restaurant: restaurant.name,
					status: 'not_found',
				})
				continue
			}

			const dailyDish = await prisma.dailyDish.upsert({
				where: {
					restaurantId_date: {
						restaurantId: restaurant.id,
						date: today,
					},
				},
				update: {
					name: dish.name,
					description: dish.description ?? null,
					price: dish.price ?? null,
					imageUrl: dish.imageUrl ?? null,
					sourceUrl: dish.sourceUrl ?? null,
					sourcePostId: dish.sourcePostId ?? null,
					publishedAt: dish.publishedAt ?? null,
				},
				create: {
					restaurantId: restaurant.id,
					name: dish.name,
					description: dish.description ?? null,
					price: dish.price ?? null,
					imageUrl: dish.imageUrl ?? null,
					sourceUrl: dish.sourceUrl ?? null,
					sourcePostId: dish.sourcePostId ?? null,
					date: today,
					publishedAt: dish.publishedAt ?? null,
				},
			})

			results.push({
				restaurantId: restaurant.id,
				restaurant: restaurant.name,
				status: 'success',
				dish: dailyDish,
			})
		} catch (error) {
			console.error(`❌ Błąd zapisywania dla restauracji ${restaurant.name}`, error)

			results.push({
				restaurantId: restaurant.id,
				restaurant: restaurant.name,
				status: 'error',
			})
		}
	}

	return results
}
