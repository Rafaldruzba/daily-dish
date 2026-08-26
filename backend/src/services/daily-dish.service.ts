import prisma from '../lib/prisma.js'
import { fetchRestaurantDish } from './facebook.service.js'
import { MOCK_RESTAURANTS, MOCK_OWNERS } from '../data/mockDishes.js'
import { geocodeCity } from './geolocation.service.js'

async function getRestaurantsToFetch(city?: string) {
  if (!city) {
    return prisma.restaurant.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } });
  }

  const coordinates = await geocodeCity(city);
  if (coordinates) {
    const { lat, lon } = coordinates;
    const radius = 20 * 1000; // 20km

    const restaurantIds = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id FROM "Restaurant"
      WHERE "isActive" = true AND "status" = 'APPROVED' AND latitude IS NOT NULL AND longitude IS NOT NULL AND (
        6371000 * acos(
          cos(radians(${lat})) * cos(radians(latitude)) * cos(radians(longitude) - radians(${lon})) +
          sin(radians(${lat})) * sin(radians(latitude))
        )
      ) <= ${radius};
    `;

    return prisma.restaurant.findMany({
      where: {
        id: { in: restaurantIds.map((r: { id: string }) => r.id) }
      }
    });

  } else {
    // Fallback to city name
    return prisma.restaurant.findMany({
      where: { city: { equals: city, mode: 'insensitive' }, isActive: true },
      orderBy: { name: 'asc' }
    });
  }
}

export async function fetchTodayDishes(city?: string) {
	// Na localhost upewniamy się, że restauracje testowe istnieją w bazie danych
	if (process.env.NODE_ENV !== 'production') {
		console.log('🤖 [LOCAL MOCK] Zapewnianie istnienia testowych właścicieli i restauracji...')
		
    // 1. Seed Mock Owners
    for (const owner of MOCK_OWNERS) {
      try {
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
            password: '$2a$10$954tU7yQp.E8S3vTsh7C/.E/2B2tX8F.a8vPqX89yMhFvx7t5xIym', // hash for password123
            name: owner.name,
            role: owner.role
          }
        })
      } catch (err) {
        console.error(`❌ Błąd podczas upsertowania właściciela testowego ${owner.name}:`, err)
      }
    }

    // 2. Seed Mock Restaurants
    for (const r of MOCK_RESTAURANTS) {
			try {
        // Geocode mock restaurants if they don't have coordinates
        const restaurantInDb = await prisma.restaurant.findUnique({ where: { id: r.id } });
        let lat = restaurantInDb?.latitude;
        let lon = restaurantInDb?.longitude;
        if (!lat || !lon) {
          const coords = await geocodeCity(`${r.address}, ${r.city}`);
          if (coords) {
            lat = coords.lat;
            lon = coords.lon;
          }
        }

        const restaurant = await prisma.restaurant.upsert({
        where: { id: r.id },
          update: { name: r.name, slug: r.slug, phone: r.phone, address: r.address, city: r.city, facebookUrl: r.facebookUrl, isActive: r.isActive, status: r.status, rating: r.rating, description: r.description, generalMenu: r.generalMenu, latitude: lat, longitude: lon, userId: r.userId || null },
          create: { id: r.id, name: r.name, slug: r.slug, phone: r.phone, address: r.address, city: r.city, facebookUrl: r.facebookUrl, isActive: r.isActive, status: r.status, rating: r.rating, description: r.description, generalMenu: r.generalMenu, latitude: lat, longitude: lon, userId: r.userId || null },
        });

        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 30);
        await prisma.subscription.create({
          data: {
            restaurantId: restaurant.id,
            type: 'FREE_TRIAL',
            status: 'ACTIVE',
            startsAt: new Date(),
            endsAt: trialEndsAt,
          }
        });

        } catch (err) {
				console.error(`❌ Błąd podczas upsertowania restauracji testowej ${r.name}:`, err)
			}
		}
	}

	const restaurants = await getRestaurantsToFetch(city);

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
