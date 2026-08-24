import prisma from '../lib/prisma.js'
import { MOCK_OWNERS, MOCK_RESTAURANTS, MOCK_DISHES } from '../data/mockDishes.js'

export async function seedLocalMockData() {
	if (process.env.NODE_ENV === 'production') return

	try {
		console.log('🤖 [LOCAL MOCK] Rozpoczynam synchronizację lokalnych kont testowych i restauracji...')

		// 1. Always Seed Owners on localhost so they are guaranteed to exist
		for (const owner of MOCK_OWNERS) {
			await prisma.user.upsert({
				where: { id: owner.id },
				update: {
					email: owner.email,
					name: owner.name,
					role: owner.role
				},
				create: {
					id: owner.id,
					email: owner.email,
					password: '$2a$10$954tU7yQp.E8S3vTsh7C/.E/2B2tX8F.a8vPqX89yMhFvx7t5xIym', // password123
					name: owner.name,
					role: owner.role
				}
			})
		}
		console.log('🤖 [LOCAL MOCK] Testowi właściciele są zsynchronizowani (borowianka, lochowianka, hustawka).')

		// 2. Always Seed their 3 Owner Restaurants (and other mock restaurants if table is empty)
		const count = await prisma.restaurant.count()
		const ownerRestaurantIds = [
			'restaurant-borowianka-uuid-1111',
			'restaurant-lochowianka-uuid-2222',
			'restaurant-hustawka-uuid-3333'
		]

		// If DB has some restaurants, we still want to make sure the 3 owner restaurants exist!
		// If DB has 0 restaurants, we seed all 9 mock restaurants.
		const restaurantsToSeed = count === 0 
			? MOCK_RESTAURANTS 
			: MOCK_RESTAURANTS.filter(r => ownerRestaurantIds.includes(r.id))

		for (const r of restaurantsToSeed) {
			const restaurant = await prisma.restaurant.upsert({
				where: { id: r.id },
				update: {
					name: r.name,
					slug: r.slug,
					phone: r.phone,
					address: r.address,
					city: r.city,
					facebookUrl: r.facebookUrl,
					isActive: r.isActive,
					status: r.status,
					rating: r.rating,
					description: r.description,
					generalMenu: r.generalMenu,
					latitude: r.latitude || null,
					longitude: r.longitude || null,
					userId: r.userId || null
				},
				create: {
					id: r.id,
					name: r.name,
					slug: r.slug,
					phone: r.phone,
					address: r.address,
					city: r.city,
					facebookUrl: r.facebookUrl,
					isActive: r.isActive,
					status: r.status,
					rating: r.rating,
					description: r.description,
					generalMenu: r.generalMenu,
					latitude: r.latitude || null,
					longitude: r.longitude || null,
					userId: r.userId || null
				}
			})

			// Create active subscription
			const trialEndsAt = new Date()
			trialEndsAt.setDate(trialEndsAt.getDate() + 30)
			await prisma.subscription.upsert({
				where: { restaurantId: r.id },
				create: {
					restaurantId: r.id,
					plan: 'FREE_TRIAL',
					status: 'ACTIVE',
					currentPeriodEnd: trialEndsAt
				},
				update: {}
			})

			// Seed today's dish
			const today = new Date()
			today.setUTCHours(0, 0, 0, 0)
			const dish = MOCK_DISHES[r.id]
			if (dish) {
				await prisma.dailyDish.upsert({
					where: {
						restaurantId_date: {
							restaurantId: r.id,
							date: today
						}
					},
					update: {
						name: dish.name,
						description: dish.description,
						price: dish.price,
						imageUrl: dish.imageUrl,
						sourceUrl: dish.sourceUrl,
						sourcePostId: dish.sourcePostId,
						publishedAt: new Date()
					},
					create: {
						restaurantId: r.id,
						name: dish.name,
						description: dish.description,
						price: dish.price,
						imageUrl: dish.imageUrl,
						sourceUrl: dish.sourceUrl,
						sourcePostId: dish.sourcePostId,
						date: today,
						publishedAt: new Date()
					}
				})
			}
		}

		console.log('✅ [LOCAL MOCK] Synchronizacja lokalnej bazy danych zakończona sukcesem!')
	} catch (err) {
		console.error('❌ [LOCAL MOCK] Błąd podczas synchronizacji bazy danych:', err)
	}
}
