import prisma from '../lib/prisma.js'
import { geocodeCity } from './geolocation.service.js'

/**
 * Calculates distance using Haversine formula (for fallback or memory operations)
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371000 // Earth's radius in meters
	const dLat = (lat2 - lat1) * (Math.PI / 180)
	const dLon = (lon2 - lon1) * (Math.PI / 180)
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * (Math.PI / 180)) *
			Math.cos(lat2 * (Math.PI / 180)) *
			Math.sin(dLon / 2) *
			Math.sin(dLon / 2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return R * c
}

/**
 * Returns IDs of active, approved restaurants within the specified radius (default 20km)
 * that have an active (non-expired) subscription.
 */
export async function getRestaurantIdsInRadius(
	lat: number,
	lon: number,
	radiusInMeters: number = 30 * 1000
): Promise<string[]> {
	try {
		const now = new Date()
		const result = await prisma.$queryRaw<Array<{ id: string }>>`
			SELECT r.id FROM "Restaurant" r
			WHERE r."isActive" = true 
			  AND r.status = 'APPROVED' 
			  AND r.latitude IS NOT NULL 
			  AND r.longitude IS NOT NULL 
			  AND (
				6371000 * acos(
					cos(radians(${lat})) * cos(radians(r.latitude)) * cos(radians(r.longitude) - radians(${lon})) + 
					sin(radians(${lat})) * sin(radians(r.latitude))
				)
			  ) <= ${radiusInMeters}
			  AND EXISTS (
				SELECT 1 FROM "Subscription" s 
				WHERE s."restaurantId" = r.id 
				  AND s.status = 'ACTIVE' 
				  AND s."endsAt" > ${now}
			  );
		`
		return result.map(r => r.id)
	} catch (error) {
		console.error('❌ Error getting restaurants in radius:', error)
		return []
	}
}

/**
 * Returns IDs of active, approved restaurants in a city (with radius fallback)
 * that have an active (non-expired) subscription.
 */
export async function getRestaurantIdsForCity(city: string, radiusInMeters: number = 30 * 1000): Promise<string[]> {
	const coordinates = await geocodeCity(city)
	if (coordinates) {
		const { lat, lon } = coordinates
		return getRestaurantIdsInRadius(lat, lon, radiusInMeters)
	}

	// Fallback to simple city name matching if geocoding fails
	try {
		const now = new Date()
		const restaurants = await prisma.restaurant.findMany({
			where: {
				city: { equals: city, mode: 'insensitive' },
				isActive: true,
				status: 'APPROVED',
				subscriptions: {
					some: {
						status: 'ACTIVE',
						endsAt: { gt: now }
					}
				}
			},
			select: { id: true }
		})
		return restaurants.map(r => r.id)
	} catch (error) {
		console.error(`❌ Error getting restaurants for city fallback "${city}":`, error)
		return []
	}
}

/**
 * Returns IDs of all active, approved restaurants globally that have an active subscription.
 */
export async function getAllActiveRestaurantIds(): Promise<string[]> {
	try {
		const now = new Date()
		const restaurants = await prisma.restaurant.findMany({
			where: {
				isActive: true,
				status: 'APPROVED',
				subscriptions: {
					some: {
						status: 'ACTIVE',
						endsAt: { gt: now }
					}
				}
			},
			select: { id: true }
		})
		return restaurants.map(r => r.id)
	} catch (error) {
		console.error('❌ Error getting all active restaurant IDs:', error)
		return []
	}
}
