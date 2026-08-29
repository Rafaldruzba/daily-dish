import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'
import Stripe from 'stripe'
import redisClient from '../lib/redis.js'

const router = Router()

// Initialize Stripe with strict fallback
const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

let FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'
if (!FRONTEND_URL.startsWith('http://') && !FRONTEND_URL.startsWith('https://')) {
	FRONTEND_URL = 'http://' + FRONTEND_URL
}

const stripe = stripeKey
	? new Stripe(stripeKey, {
			apiVersion: '2025-01-27.acac' as any,
		})
	: null

// Helper to get subscription details
const getSubscriptionDetails = (
	planId: string,
): { type: string; startsAt: Date; endsAt: Date; amount: number; planName: string; planDescription: string } => {
	const startsAt = new Date()
	let endsAt = new Date()
	let amount = 0
	let type = ''
	let planName = ''
	let planDescription = ''

	switch (planId) {
		case 'BASE':
			type = 'BASE'
			planName = 'Abonament za restaurację'
			planDescription = 'Standardowy FB bot scraper pobierający Twoje codzienne dania dnia.'
			amount = 100
			endsAt.setDate(startsAt.getDate() + 30)
			break
		case 'PROMOTION':
			type = 'PROMOTION'
			planName = 'Promowanie na górze strony'
			planDescription = 'Wyróżnienie i podbijanie Twojego lokalu na samą górę listy wyszukiwania w mieście.'
			amount = 50
			endsAt.setDate(startsAt.getDate() + 30) // Assuming 30 days for now
			break
		case 'STATIC_MENU':
			type = 'STATIC_MENU'
			planName = 'Stałe wyświetlane menu bez FB'
			planDescription =
				'Możliwość dodawania całorocznych ofert stałych wyświetlanych zawsze bez konieczności postowania na Facebooku.'
			amount = 50
			endsAt.setDate(startsAt.getDate() + 30) // Assuming 30 days for now
			break
		default:
			throw new Error(`Invalid planId: ${planId}`)
	}

	return { type, startsAt, endsAt, amount, planName, planDescription }
}

// Create Stripe Checkout Session (or Mock Redirect in dev)
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
	const { restaurantId, planId } = req.body
	const user = req.user

	if (!user || !restaurantId || !planId) {
		return res.status(400).json({ success: false, message: 'Brakujące dane wejściowe' })
	}

	try {
		// 1. Verify restaurant ownership
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
			include: { subscriptions: true },
		})
		if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
			return res.status(403).json({ success: false, message: 'Brak uprawnień do tego lokalu' })
		}

		const { amount, planName, planDescription } = getSubscriptionDetails(planId)

		// 2. Security check: addon plans can only be purchased if the main subscription is active
		const isMainPlan = planId === 'BASE'
		const hasActiveBaseSubscription = restaurant.subscriptions.some(
			sub => sub.type === 'BASE' && sub.status === 'ACTIVE' && sub.endsAt > new Date(),
		)

		if (!isMainPlan && !hasActiveBaseSubscription) {
			return res.status(403).json({
				success: false,
				message:
					'Nie możesz dokupić dodatkowego pakietu, ponieważ główny abonament za lokal jest nieaktywny. Najpierw aktywuj restaurację.',
			})
		}

		// 2. If Stripe is NOT configured, fail
		if (!stripe) {
			return res.status(500).json({
				success: false,
				message: 'Bramka płatnicza Stripe nie została skonfigurowana. Skontaktuj się z administratorem.',
			})
		}

		// 3. Create real Stripe Checkout Session for subscription
		const session = await stripe.checkout.sessions.create({
			payment_method_types: ['card'],
			mode: 'subscription',
			line_items: [
				{
					price_data: {
						currency: 'pln',
						product_data: {
							name: planName,
							description: planDescription,
						},
						unit_amount: amount * 100,
						recurring: {
							interval: 'month',
						},
					},
					quantity: 1,
				},
			],
			metadata: {
				restaurantId,
				planId,
			},
			customer_email: user.email,
			success_url: `${FRONTEND_URL}/for-restaurants?success=true&restaurant_id=${restaurantId}`,
			cancel_url: `${FRONTEND_URL}/for-restaurants?cancel=true`,
		})

		res.json({ success: true, url: session.url, isMock: false })
	} catch (error) {
		console.error('Stripe Checkout creation error:', error)
		res.status(500).json({ success: false, message: 'Nie udało się zainicjować bramki płatności Stripe' })
	}
})

// Secure Stripe Webhook Endpoint (PCI-DSS compliant)
router.post('/webhook', async (req: Request, res: Response) => {
	const payload = (req as any).rawBody || req.body
	const sig = req.headers['stripe-signature'] as string

	if (!stripe) {
		return res.status(400).json({ success: false, message: 'Stripe is not configured' })
	}

	let event

	try {
		event = stripe.webhooks.constructEvent(payload, sig, endpointSecret)
	} catch (err: any) {
		console.error('⚠️ Webhook signature verification failed:', err.message)
		return res.status(400).send(`Webhook Error: ${err.message}`)
	}

	try {
		console.log(`[Stripe Webhook] Event received: ${event.type}`)

		// Handle checkout completed
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session
			const metadata = session.metadata

			if (metadata && metadata.restaurantId && metadata.planId) {
				const restaurantId = metadata.restaurantId
				const planId = metadata.planId
				const stripeCustomerId = session.customer as string
				const stripeSubscriptionId = session.subscription as string

				const { type, startsAt, endsAt } = getSubscriptionDetails(planId)
				const amount = session.amount_total ? session.amount_total / 100 : 0

				// 1. Create payment record
				await prisma.payment.create({
					data: {
						restaurantId,
						amount: amount,
						currency: 'PLN',
						status: 'SUCCEEDED',
						provider: 'STRIPE',
						providerPaymentId: session.id,
					},
				})

				// 2. Create a new Subscription record
				await prisma.subscription.create({
					data: {
						restaurantId,
						type,
						startsAt,
						endsAt,
						status: 'ACTIVE',
						stripeCustomerId,
						stripeSubscriptionId,
					},
				})

				// If transitioning to BASE plan, cancel any active FREE_TRIAL subscriptions
				if (type === 'BASE') {
					await prisma.subscription.updateMany({
						where: {
							restaurantId,
							type: 'FREE_TRIAL',
							status: 'ACTIVE',
						},
						data: {
							status: 'CANCELLED',
							endsAt: new Date(),
						},
					})

					await prisma.restaurant.update({
						where: { id: restaurantId },
						data: { isActive: true },
					})
				}

				// 4. Invalidate Redis cache
				const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
				if (restaurant && redisClient.isOpen) {
					try {
						await redisClient.del(`restaurants:${restaurant.city}`)
						await redisClient.del('restaurants:all')
						console.log(`🧹 [Redis] Webhook cache invalidated for city: ${restaurant.city}`)
					} catch (err) {
						console.error('[Redis] Webhook cache invalidation error:', err)
					}
				}

				console.log(`✅ [Stripe Webhook] Restaurant ${restaurantId} successfully subscribed to ${planId}`)
			}
		}

		// Handle recurring renewal payments
		if (event.type === 'invoice.payment_succeeded') {
			const invoice = event.data.object as Stripe.Invoice
			const subscriptionId = (invoice as any).subscription as string

			if (subscriptionId) {
				const dbSub = await prisma.subscription.findFirst({
					where: { stripeSubscriptionId: subscriptionId },
				})

				if (dbSub) {
					const newEndsAt = new Date(dbSub.endsAt)
					newEndsAt.setDate(newEndsAt.getDate() + 30)

					// 1. Log renewal payment
					await prisma.payment.create({
						data: {
							restaurantId: dbSub.restaurantId,
							amount: invoice.amount_paid ? invoice.amount_paid / 100 : 0,
							currency: 'PLN',
							status: 'SUCCEEDED',
							provider: 'STRIPE',
							providerPaymentId: invoice.id || `invoice_${Date.now()}`,
						},
					})

					// 2. Extend the specific subscription
					await prisma.subscription.update({
						where: { id: dbSub.id },
						data: {
							status: 'ACTIVE',
							endsAt: newEndsAt,
						},
					})

					console.log(`✅ [Stripe Webhook] Subscription ${dbSub.type} extended for restaurant ${dbSub.restaurantId}`)
				}
			}
		}

		// Handle subscription cancellation
		if (event.type === 'customer.subscription.deleted') {
			const subscription = event.data.object as Stripe.Subscription
			const dbSub = await prisma.subscription.findFirst({
				where: { stripeSubscriptionId: subscription.id },
			})

			if (dbSub) {
				await prisma.subscription.update({
					where: { id: dbSub.id },
					data: { status: 'CANCELLED' },
				})

				// Deactivate restaurant only if the base subscription is cancelled
				if (dbSub.type === 'BASE') {
					await prisma.restaurant.update({
						where: { id: dbSub.restaurantId },
						data: { isActive: false },
					})
					console.log(`⚠️ [Stripe Webhook] BASE subscription canceled, restaurant ${dbSub.restaurantId} deactivated.`)
				} else {
					console.log(
						`⚠️ [Stripe Webhook] Subscription ${dbSub.type} for restaurant ${dbSub.restaurantId} was canceled.`,
					)
				}
			}
		}

		res.json({ received: true })
	} catch (error) {
		console.error('[Stripe Webhook] Error handling database update:', error)
		res.status(500).json({ success: false, message: 'Database handler failed' })
	}
})

// Get Payment History for a restaurant
router.get('/history/:restaurantId', authenticate, async (req: AuthRequest, res: Response) => {
	const { restaurantId } = req.params as { restaurantId: string }
	const user = req.user

	if (!user || !restaurantId) {
		return res.status(400).json({ success: false, message: 'Brakujące dane' })
	}

	try {
		const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } })
		if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
			return res.status(403).json({ success: false, message: 'Brak uprawnień' })
		}

		const payments = await prisma.payment.findMany({
			where: { restaurantId },
			orderBy: { createdAt: 'desc' },
		})

		res.json(payments)
	} catch (error) {
		console.error('Error fetching payment history:', error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać historii płatności' })
	}
})

// GET /api/payments/admin/all
// Pobiera historię wszystkich płatności w systemie (tylko Admin)
router.get('/admin/all', authenticate, requireAdmin, async (req: AuthRequest, res: Response) => {
	try {
		const payments = await prisma.payment.findMany({
			include: {
				restaurant: {
					select: {
						name: true,
					},
				},
			},
			orderBy: { createdAt: 'desc' },
		})
		res.json(payments)
	} catch (error) {
		console.error('Error fetching all payments for admin:', error)
		res.status(500).json({ success: false, message: 'Nie udało się pobrać historii płatności' })
	}
})

export default router
