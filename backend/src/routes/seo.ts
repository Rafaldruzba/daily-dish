import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import { slugify } from '../lib/slug.js'

const MIN_CITY_RESTAURANTS = 3
const MIN_CUISINE_RESTAURANTS = 3

const router = Router()

// GET /api/seo/cities
// Lista miast z liczbą restauracji (tylko te z min. 3 restauracjami)
router.get('/cities', async (_req: Request, res: Response) => {
	try {
		const cities = await prisma.restaurant.findMany({
			where: {
				isActive: true,
				status: 'ACTIVE',
			},
			select: {
				city: true,
				citySlug: true,
			},
		})

		const cityMap = new Map<
			string,
			{ city: string; citySlug: string; count: number }
		>()

		for (const r of cities) {
			const slug = r.citySlug || slugify(r.city)
			const existing = cityMap.get(slug)
			if (existing) {
				existing.count++
			} else {
				cityMap.set(slug, { city: r.city, citySlug: slug, count: 1 })
			}
		}

		const result = Array.from(cityMap.values())
			.map(c => ({
				city: c.city,
				citySlug: c.citySlug,
				restaurantCount: c.count,
				// Strona miasta istnieje zawsze, ale indeksujemy ją w SEO dopiero od progu
				seoEnabled: c.count >= MIN_CITY_RESTAURANTS,
			}))
			.sort((a, b) => b.restaurantCount - a.restaurantCount)

		res.json(result)
	} catch (error) {
		console.error('SEO cities error:', error)
		res.status(500).json({ success: false, message: 'Błąd pobierania miast' })
	}
})

// GET /api/seo/cities/:citySlug
// Szczegóły miasta z kategoriami
router.get('/cities/:citySlug', async (req: Request, res: Response) => {
	try {
		const citySlug = req.params.citySlug as string

		const restaurants = await prisma.restaurant.findMany({
			where: {
				citySlug: { equals: citySlug, mode: 'insensitive' },
				isActive: true,
				status: 'ACTIVE',
			},
			select: {
				id: true,
				name: true,
				slug: true,
				city: true,
				citySlug: true,
				cuisines: true,
				rating: true,
			},
		})

		if (restaurants.length === 0) {
			return res.status(404).json({ success: false, message: 'Miasto nie znalezione' })
		}

		const cuisineCount = new Map<string, number>()
		for (const r of restaurants) {
			for (const cuisine of r.cuisines) {
				const slug = slugify(cuisine)
				cuisineCount.set(slug, (cuisineCount.get(slug) || 0) + 1)
			}
		}

		const cuisines = Array.from(cuisineCount.entries())
			.map(([slug, count]) => ({
				name: slug.charAt(0).toUpperCase() + slug.slice(1),
				slug,
				count,
				// Linkujemy/indeksujemy kategorię dopiero od progu, ale filtr pokazuje wszystkie
				seoEnabled: count >= MIN_CUISINE_RESTAURANTS,
			}))
			.sort((a, b) => b.count - a.count)

		const result = {
			city: restaurants[0].city,
			citySlug: restaurants[0].citySlug,
			restaurantCount: restaurants.length,
			seoEnabled: restaurants.length >= MIN_CITY_RESTAURANTS,
			cuisines,
		}

		res.json(result)
	} catch (error) {
		console.error('SEO city detail error:', error)
		res.status(500).json({ success: false, message: 'Błąd pobierania miasta' })
	}
})

// GET /api/seo/cuisines
// Lista wszystkich kategorii kuchni z liczbą restauracji
router.get('/cuisines', async (_req: Request, res: Response) => {
	try {
		const restaurants = await prisma.restaurant.findMany({
			where: {
				isActive: true,
				status: 'ACTIVE',
			},
			select: {
				cuisines: true,
			},
		})

		const cuisineCount = new Map<string, number>()
		for (const r of restaurants) {
			for (const cuisine of r.cuisines) {
				const slug = slugify(cuisine)
				cuisineCount.set(slug, (cuisineCount.get(slug) || 0) + 1)
			}
		}

		const result = Array.from(cuisineCount.entries())
			.map(([slug, count]) => ({
				name: slug.charAt(0).toUpperCase() + slug.slice(1),
				slug,
				restaurantCount: count,
			}))
			.sort((a, b) => b.restaurantCount - a.restaurantCount)

		res.json(result)
	} catch (error) {
		console.error('SEO cuisines error:', error)
		res.status(500).json({ success: false, message: 'Błąd pobierania kategorii' })
	}
})

// GET /api/seo/sitemap
// Zbiorcze dane dla sitemap.xml — tylko miasta/kuchnie powyżej progu SEO
router.get('/sitemap', async (_req: Request, res: Response) => {
	try {
		const [restaurants, cities] = await Promise.all([
			prisma.restaurant.findMany({
				where: { isActive: true, status: 'ACTIVE' },
				select: { slug: true, updatedAt: true },
				orderBy: { updatedAt: 'desc' },
			}),
			prisma.restaurant.findMany({
				where: { isActive: true, status: 'ACTIVE' },
				select: { city: true, citySlug: true, cuisines: true },
			}),
		])

		const cityMap = new Map<string, { citySlug: string; count: number; cuisines: Map<string, number> }>()

		for (const r of cities) {
			const slug = r.citySlug || slugify(r.city)
			let entry = cityMap.get(slug)

			if (!entry) {
				entry = { citySlug: slug, count: 0, cuisines: new Map() }
				cityMap.set(slug, entry)
			}

			entry.count++

			for (const cuisine of r.cuisines) {
				const cuisineSlug = slugify(cuisine)
				entry.cuisines.set(cuisineSlug, (entry.cuisines.get(cuisineSlug) || 0) + 1)
			}
		}

		const cityEntries = Array.from(cityMap.values())
			.filter(city => city.count >= MIN_CITY_RESTAURANTS)
			.map(city => ({
				citySlug: city.citySlug,
				cuisines: Array.from(city.cuisines.entries())
					.filter(([, count]) => count >= MIN_CUISINE_RESTAURANTS)
					.map(([slug]) => slug),
			}))

		res.json({
			cities: cityEntries,
			restaurants,
		})
	} catch (error) {
		console.error('SEO sitemap error:', error)
		res.status(500).json({ success: false, message: 'Błąd generowania danych sitemapy' })
	}
})

export default router
