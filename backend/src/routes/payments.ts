import { Router, type Response, type Request } from 'express'
import prisma from '../lib/prisma.js'
import { authenticate, requireAdmin, type AuthRequest } from '../middleware/auth.js'
import Stripe from 'stripe'
import redisClient from '../lib/redis.js'

const router = Router()

const stripeKey = process.env.STRIPE_SECRET_KEY || ''
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

const STRIPE_PRICE_BASE = process.env.STRIPE_PRICE_BASE || ''
const STRIPE_PRICE_PROMOTION = process.env.STRIPE_PRICE_PROMOTION || ''

const stripe = stripeKey ? new Stripe(stripeKey) : null

/**
 * =========================================================
 * PLAN CONFIGURATION
 * =========================================================
 *
 * Stripe is the source of truth for:
 * - price
 * - currency
 * - billing interval
 *
 * The local values below are only used for application
 * metadata / validation / display.
 */

type PlanConfig = {
	type: 'BASE' | 'PROMOTION'
	priceId: string
	name: string
	description: string
}

const PLANS: Record<string, PlanConfig> = {
	BASE: {
		type: 'BASE',
		priceId: STRIPE_PRICE_BASE,
		name: 'BistroMapa BASE',
		description:
			'Pełna obecność lokalu w systemie BistroMapa: profil lokalu, FB bot scraper, karta menu i oferta stała.',
	},

	PROMOTION: {
		type: 'PROMOTION',
		priceId: STRIPE_PRICE_PROMOTION,
		name: 'BistroMapa PROMOTION',
		description: 'Wyróżnienie wizualne oraz pierwszeństwo w wynikach wyszukiwania w promieniu 30 km.',
	},
}

/**
 * =========================================================
 * HELPERS
 * =========================================================
 */

const getPlan = (planId: string): PlanConfig => {
	const plan = PLANS[planId]

	if (!plan) {
		throw new Error(`Invalid planId: ${planId}`)
	}

	if (!plan.priceId) {
		throw new Error(`Stripe Price ID is not configured for plan: ${planId}`)
	}

	return plan
}

const getSubscriptionPeriodEnd = (subscription: Stripe.Subscription): Date => {
	const currentPeriodEnd = (subscription as any).current_period_end

	if (!currentPeriodEnd) {
		throw new Error(`Stripe subscription ${subscription.id} does not contain current_period_end`)
	}

	return new Date(currentPeriodEnd * 1000)
}

const getSubscriptionStatus = (status: Stripe.Subscription.Status): string => {
	switch (status) {
		case 'active':
			return 'ACTIVE'

		case 'trialing':
			return 'ACTIVE'

		case 'past_due':
			return 'PAST_DUE'

		case 'unpaid':
			return 'UNPAID'

		case 'incomplete':
			return 'INCOMPLETE'

		case 'incomplete_expired':
			return 'EXPIRED'

		case 'canceled':
			return 'CANCELLED'

		default:
			return 'INACTIVE'
	}
}

/**
 * Returns Stripe subscription ID from an invoice.
 *
 * Stripe API versions can expose this slightly differently,
 * so we intentionally keep this helper tolerant.
 */
const getInvoiceSubscriptionId = (invoice: Stripe.Invoice): string | null => {
	const subscription = (invoice as any).subscription

	if (!subscription) {
		return null
	}

	if (typeof subscription === 'string') {
		return subscription
	}

	if (typeof subscription === 'object' && subscription.id) {
		return subscription.id
	}

	return null
}

/**
 * Invalidate restaurant-related Redis cache.
 */
const invalidateRestaurantCache = async (restaurantId: string): Promise<void> => {
	try {
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
			select: { city: true },
		})

		if (!restaurant || !redisClient.isOpen) {
			return
		}

		await redisClient.del(`restaurants:${restaurant.city}`)
		await redisClient.del('restaurants:all')

		console.log(`🧹 [Redis] Invalidated restaurant cache for ${restaurantId}`)
	} catch (error) {
		console.error('[Redis] Failed to invalidate restaurant cache:', error)
	}
}

/**
 * Activate/deactivate restaurant based on BASE subscription.
 */
const syncRestaurantActiveState = async (restaurantId: string): Promise<void> => {
	const activeBase = await prisma.subscription.findFirst({
		where: {
			restaurantId,
			type: 'BASE',
			status: {
				in: ['ACTIVE', 'PAST_DUE'],
			},
			endsAt: {
				gt: new Date(),
			},
		},
	})

	await prisma.restaurant.update({
		where: { id: restaurantId },
		data: {
			isActive: Boolean(activeBase),
		},
	})

	await invalidateRestaurantCache(restaurantId)
}

/**
 * =========================================================
 * CREATE CHECKOUT SESSION
 * =========================================================
 */

router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
	const { restaurantId, planId } = req.body
	const user = req.user

	if (!user || !restaurantId || !planId) {
		return res.status(400).json({
			success: false,
			message: 'Brakujące dane wejściowe',
		})
	}

	if (!stripe) {
		return res.status(500).json({
			success: false,
			message: 'Bramka płatnicza Stripe nie została skonfigurowana.',
		})
	}

	try {
		const plan = getPlan(planId)

		/**
		 * Verify restaurant ownership.
		 */
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
			include: {
				subscriptions: true,
			},
		})

		if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
			return res.status(403).json({
				success: false,
				message: 'Brak uprawnień do tego lokalu',
			})
		}

		/**
		 * PROMOTION requires an active BASE subscription.
		 */
		if (plan.type === 'PROMOTION') {
			const hasActiveBase = restaurant.subscriptions.some(
				sub => sub.type === 'BASE' && ['ACTIVE', 'PAST_DUE'].includes(sub.status) && sub.endsAt > new Date(),
			)

			if (!hasActiveBase) {
				return res.status(403).json({
					success: false,
					message: 'Najpierw aktywuj abonament BASE dla tego lokalu.',
				})
			}
		}

		/**
		 * Prevent duplicate active subscriptions of the same type.
		 */
		const existingSubscription = restaurant.subscriptions.find(
			sub =>
				sub.type === plan.type && ['ACTIVE', 'PAST_DUE', 'INCOMPLETE'].includes(sub.status) && sub.endsAt > new Date(),
		)

		if (existingSubscription) {
			return res.status(409).json({
				success: false,
				message: `Abonament ${plan.type} jest już aktywny dla tego lokalu.`,
			})
		}

		/**
		 * Try to reuse an existing Stripe Customer.
		 *
		 * This prevents creating a new Stripe Customer every time
		 * the restaurant purchases another product.
		 */
		const existingStripeCustomer =
			restaurant.subscriptions.find(sub => Boolean(sub.stripeCustomerId))?.stripeCustomerId || null

		/**
		 * Create Checkout Session.
		 */
		const session = await stripe.checkout.sessions.create({
			mode: 'subscription',

			line_items: [
				{
					price: plan.priceId,
					quantity: 1,
				},
			],

			/**
			 * Reuse Stripe Customer if one already exists.
			 * Otherwise Stripe will create one from customer_email.
			 */
			...(existingStripeCustomer
				? {
						customer: existingStripeCustomer,
					}
				: {
						customer_email: user.email,
					}),

			metadata: {
				restaurantId,
				planId: plan.type,
			},

			/**
			 * Metadata is copied to the Stripe Subscription.
			 * This is extremely useful for webhook processing.
			 */
			subscription_data: {
				metadata: {
					restaurantId,
					planId: plan.type,
				},
			},

			success_url:
				`${FRONTEND_URL}/for-restaurants` + `?success=true` + `&restaurant_id=${encodeURIComponent(restaurantId)}`,

			cancel_url: `${FRONTEND_URL}/for-restaurants` + `?cancel=true`,

			allow_promotion_codes: false,
		})

		return res.json({
			success: true,
			url: session.url,
			sessionId: session.id,
		})
	} catch (error) {
		console.error('[Stripe] Checkout creation error:', error)

		return res.status(500).json({
			success: false,
			message: 'Nie udało się zainicjować płatności Stripe.',
		})
	}
})

/**
 * =========================================================
 * STRIPE CUSTOMER PORTAL
 * =========================================================
 *
 * Allows restaurant owner to:
 * - update payment method
 * - view invoices
 * - cancel subscription
 *
 * Stripe handles the actual billing UI.
 */

router.post('/billing-portal', authenticate, async (req: AuthRequest, res: Response) => {
	const { restaurantId } = req.body
	const user = req.user

	if (!user || !restaurantId) {
		return res.status(400).json({
			success: false,
			message: 'Brakujące dane wejściowe',
		})
	}

	if (!stripe) {
		return res.status(500).json({
			success: false,
			message: 'Stripe nie jest skonfigurowany.',
		})
	}

	try {
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
			include: {
				subscriptions: true,
			},
		})

		if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
			return res.status(403).json({
				success: false,
				message: 'Brak uprawnień',
			})
		}

		const stripeCustomerId = restaurant.subscriptions.find(sub => Boolean(sub.stripeCustomerId))?.stripeCustomerId

		if (!stripeCustomerId) {
			return res.status(404).json({
				success: false,
				message: 'Nie znaleziono klienta Stripe dla tego lokalu.',
			})
		}

		const portalSession = await stripe.billingPortal.sessions.create({
			customer: stripeCustomerId,
			return_url: `${FRONTEND_URL}/for-restaurants`,
		})

		return res.json({
			success: true,
			url: portalSession.url,
		})
	} catch (error) {
		console.error('[Stripe] Billing Portal error:', error)

		return res.status(500).json({
			success: false,
			message: 'Nie udało się otworzyć panelu płatności Stripe.',
		})
	}
})

/**
 * =========================================================
 * STRIPE WEBHOOK
 * =========================================================
 *
 * IMPORTANT:
 * This route MUST receive the raw request body.
 *
 * We intentionally use express.raw() here instead of relying
 * on req.body / req.rawBody.
 */

router.post('/webhook', async (req: Request, res: Response) => {
	if (!stripe) {
		return res.status(500).send('Stripe is not configured')
	}

	if (!endpointSecret) {
		console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET is missing')

		return res.status(500).send('Stripe webhook secret is not configured')
	}

	const signature = req.headers['stripe-signature']

	if (!signature) {
		return res.status(400).send('Missing Stripe-Signature header')
	}

	let event: Stripe.Event

	try {
		const payload = (req as any).rawBody

		if (!payload) {
			return res.status(400).send('Missing raw request body')
		}

		event = stripe.webhooks.constructEvent(payload, signature, endpointSecret)
	} catch (error) {
		console.error('⚠️ [Stripe Webhook] Signature verification failed:', error)

		return res.status(400).send('Webhook signature verification failed')
	}

	try {
		console.log(`[Stripe Webhook] ${event.id} → ${event.type}`)

		/**
		 * =====================================================
		 * CHECKOUT SESSION COMPLETED
		 * =====================================================
		 *
		 * We DO NOT create a payment here.
		 *
		 * The actual payment is handled by invoice.paid.
		 *
		 * Here we make sure that our DB knows the Stripe
		 * Customer + Subscription.
		 */
		if (event.type === 'checkout.session.completed') {
			const session = event.data.object as Stripe.Checkout.Session

			const restaurantId = session.metadata?.restaurantId

			const planId = session.metadata?.planId

			const stripeCustomerId = typeof session.customer === 'string' ? session.customer : session.customer?.id

			const stripeSubscriptionId =
				typeof session.subscription === 'string' ? session.subscription : session.subscription?.id

			if (restaurantId && planId && stripeCustomerId && stripeSubscriptionId) {
				const plan = getPlan(planId)

				const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId)

				const startsAt = new Date(stripeSubscription.start_date * 1000)

				const endsAt = getSubscriptionPeriodEnd(stripeSubscription)

				const status = getSubscriptionStatus(stripeSubscription.status)

				/**
				 * Upsert prevents duplicate webhook deliveries
				 * from creating duplicate subscriptions.
				 */
				await prisma.subscription.upsert({
					where: {
						stripeSubscriptionId,
					},
					create: {
						restaurantId,
						type: plan.type,
						status,
						startsAt,
						endsAt,
						stripeCustomerId,
						stripeSubscriptionId,
					},
					update: {
						restaurantId,
						type: plan.type,
						status,
						endsAt,
						stripeCustomerId,
					},
				})

				console.log(`✅ [Stripe] Subscription ${stripeSubscriptionId} registered for restaurant ${restaurantId}`)
			}
		}

		/**
		 * =====================================================
		 * INVOICE PAID
		 * =====================================================
		 *
		 * This handles:
		 * - initial subscription payment
		 * - recurring monthly payments
		 *
		 * Stripe recommends using invoice.paid to continue
		 * provisioning subscription access.
		 */
		if (event.type === 'invoice.paid') {
			const invoice = event.data.object as Stripe.Invoice

			const subscriptionId = getInvoiceSubscriptionId(invoice)

			if (!subscriptionId) {
				console.log(`[Stripe] Invoice ${invoice.id} has no subscription. Skipping.`)
			} else {
				const dbSubscription = await prisma.subscription.findUnique({
					where: {
						stripeSubscriptionId: subscriptionId,
					},
				})

				if (!dbSubscription) {
					console.warn(`[Stripe] Subscription ${subscriptionId} not found in database.`)
				} else {
					const amount = (invoice.amount_paid || 0) / 100

					/**
					 * providerPaymentId is UNIQUE in Prisma.
					 *
					 * Upsert makes webhook processing idempotent.
					 */
					await prisma.payment.upsert({
						where: {
							providerPaymentId: invoice.id,
						},
						create: {
							restaurantId: dbSubscription.restaurantId,
							amount,
							currency: (invoice.currency || 'pln').toUpperCase(),
							status: 'SUCCEEDED',
							provider: 'STRIPE',
							providerPaymentId: invoice.id,
						},
						update: {
							amount,
							currency: (invoice.currency || 'pln').toUpperCase(),
							status: 'SUCCEEDED',
						},
					})

					/**
					 * Retrieve the current Stripe subscription.
					 *
					 * This gives us the authoritative billing period.
					 */
					const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId)

					const endsAt = getSubscriptionPeriodEnd(stripeSubscription)

					const status = getSubscriptionStatus(stripeSubscription.status)

					await prisma.subscription.update({
						where: {
							id: dbSubscription.id,
						},
						data: {
							status,
							endsAt,
							stripeCustomerId:
								typeof stripeSubscription.customer === 'string'
									? stripeSubscription.customer
									: stripeSubscription.customer.id,
						},
					})

					/**
					 * A successful BASE payment activates
					 * the restaurant.
					 */
					if (dbSubscription.type === 'BASE') {
						await prisma.subscription.updateMany({
							where: {
								restaurantId: dbSubscription.restaurantId,
								type: 'FREE_TRIAL',
								status: 'ACTIVE',
							},
							data: {
								status: 'CANCELLED',
								endsAt: new Date(),
							},
						})
					}

					await syncRestaurantActiveState(dbSubscription.restaurantId)

					console.log(`💰 [Stripe] Invoice ${invoice.id} paid for ${dbSubscription.type}`)
				}
			}
		}

		/**
		 * =====================================================
		 * INVOICE PAYMENT FAILED
		 * =====================================================
		 */
		if (event.type === 'invoice.payment_failed') {
			const invoice = event.data.object as Stripe.Invoice

			const subscriptionId = getInvoiceSubscriptionId(invoice)

			if (subscriptionId) {
				const dbSubscription = await prisma.subscription.findUnique({
					where: {
						stripeSubscriptionId: subscriptionId,
					},
				})

				if (dbSubscription) {
					await prisma.subscription.update({
						where: {
							id: dbSubscription.id,
						},
						data: {
							status: 'PAST_DUE',
						},
					})

					/**
					 * We deliberately do not immediately deactivate
					 * the restaurant.
					 *
					 * Stripe may retry the payment.
					 */
					await syncRestaurantActiveState(dbSubscription.restaurantId)

					console.warn(`⚠️ [Stripe] Payment failed for subscription ${subscriptionId}`)
				}
			}
		}

		/**
		 * =====================================================
		 * SUBSCRIPTION UPDATED
		 * =====================================================
		 *
		 * Handles:
		 * - renewal state changes
		 * - payment state changes
		 * - cancellation_at_period_end
		 * - subscription changes
		 */
		if (event.type === 'customer.subscription.updated') {
			const subscription = event.data.object as Stripe.Subscription

			const dbSubscription = await prisma.subscription.findUnique({
				where: {
					stripeSubscriptionId: subscription.id,
				},
			})

			if (dbSubscription) {
				const status = getSubscriptionStatus(subscription.status)

				const endsAt = getSubscriptionPeriodEnd(subscription)

				const stripeCustomerId =
					typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id

				await prisma.subscription.update({
					where: {
						id: dbSubscription.id,
					},
					data: {
						status,
						endsAt,
						stripeCustomerId,
					},
				})

				await syncRestaurantActiveState(dbSubscription.restaurantId)

				console.log(`🔄 [Stripe] Subscription ${subscription.id} updated → ${status}`)
			}
		}

		/**
		 * =====================================================
		 * SUBSCRIPTION DELETED
		 * =====================================================
		 */
		if (event.type === 'customer.subscription.deleted') {
			const subscription = event.data.object as Stripe.Subscription

			const dbSubscription = await prisma.subscription.findUnique({
				where: {
					stripeSubscriptionId: subscription.id,
				},
			})

			if (dbSubscription) {
				await prisma.subscription.update({
					where: {
						id: dbSubscription.id,
					},
					data: {
						status: 'CANCELLED',
						endsAt: dbSubscription.endsAt,
					},
				})

				await syncRestaurantActiveState(dbSubscription.restaurantId)

				console.log(`❌ [Stripe] Subscription ${subscription.id} cancelled`)
			}
		}

		/**
		 * =====================================================
		 * INVOICE PAYMENT ACTION REQUIRED
		 * =====================================================
		 *
		 * Useful for cases such as 3D Secure / SCA.
		 */
		if (event.type === 'invoice.payment_action_required') {
			const invoice = event.data.object as Stripe.Invoice

			const subscriptionId = getInvoiceSubscriptionId(invoice)

			if (subscriptionId) {
				const dbSubscription = await prisma.subscription.findUnique({
					where: {
						stripeSubscriptionId: subscriptionId,
					},
				})

				if (dbSubscription) {
					await prisma.subscription.update({
						where: {
							id: dbSubscription.id,
						},
						data: {
							status: 'PAST_DUE',
						},
					})

					console.warn(`⚠️ [Stripe] Payment action required for ${subscriptionId}`)
				}
			}
		}

		return res.json({ received: true })
	} catch (error) {
		console.error('[Stripe Webhook] Database handler failed:', error)

		/**
		 * Returning 500 tells Stripe that the event wasn't
		 * successfully processed and Stripe can retry it.
		 */
		return res.status(500).json({
			success: false,
			message: 'Webhook handler failed',
		})
	}
})

/**
 * =========================================================
 * PAYMENT HISTORY
 * =========================================================
 */

router.get('/history/:restaurantId', authenticate, async (req: AuthRequest, res: Response) => {
	const { restaurantId } = req.params as {
		restaurantId: string
	}

	const user = req.user

	if (!user || !restaurantId) {
		return res.status(400).json({
			success: false,
			message: 'Brakujące dane',
		})
	}

	try {
		const restaurant = await prisma.restaurant.findUnique({
			where: { id: restaurantId },
		})

		if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
			return res.status(403).json({
				success: false,
				message: 'Brak uprawnień',
			})
		}

		const payments = await prisma.payment.findMany({
			where: { restaurantId },
			orderBy: {
				createdAt: 'desc',
			},
		})

		return res.json(payments)
	} catch (error) {
		console.error('[Payments] Error fetching payment history:', error)

		return res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać historii płatności',
		})
	}
})

/**
 * =========================================================
 * ADMIN PAYMENT HISTORY
 * =========================================================
 */

router.get('/admin/all', authenticate, requireAdmin, async (_req: AuthRequest, res: Response) => {
	try {
		const payments = await prisma.payment.findMany({
			include: {
				restaurant: {
					select: {
						name: true,
					},
				},
			},
			orderBy: {
				createdAt: 'desc',
			},
		})

		return res.json(payments)
	} catch (error) {
		console.error('[Payments] Error fetching all payments:', error)

		return res.status(500).json({
			success: false,
			message: 'Nie udało się pobrać wszystkich płatności',
		})
	}
})

export default router
