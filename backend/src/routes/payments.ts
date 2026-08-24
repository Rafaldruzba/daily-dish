import { Router, type Response } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Mock Subscription Endpoint
router.post('/subscribe', authenticate, async (req: AuthRequest, res: Response) => {
  const { restaurantId, planId } = req.body;
  const user = req.user;

  if (!user || !restaurantId || !planId) {
    return res.status(400).json({ success: false, message: 'Brakujące dane' });
  }

  try {
    // Verify ownership or admin role
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień' });
    }

    // 1. Create a successful mock payment record
    const payment = await prisma.payment.create({
      data: {
        restaurantId,
        amount: 99.00,
        currency: 'PLN',
        status: 'SUCCEEDED',
        provider: 'MOCK',
        providerPaymentId: `mock_${Date.now()}`,
      },
    });

    // 2. Create or update the subscription
    const currentPeriodEnd = new Date();
    currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 30);

    const subscription = await prisma.subscription.upsert({
      where: { restaurantId },
      create: {
        restaurantId,
        plan: planId,
        status: 'ACTIVE',
        currentPeriodEnd,
      },
      update: {
        plan: planId,
        status: 'ACTIVE',
        currentPeriodEnd,
      },
    });

    // 3. Activate the restaurant
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { isActive: true },
    });

    res.json({ success: true, payment, subscription });

  } catch (error) {
    console.error('Payment simulation error:', error);
    res.status(500).json({ success: false, message: 'Błąd podczas symulacji płatności' });
  }
});

// Get Payment History for a restaurant
router.get('/history/:restaurantId', authenticate, async (req: AuthRequest, res: Response) => {
  const { restaurantId } = req.params as { restaurantId: string };
  const user = req.user;

  if (!user || !restaurantId) {
    return res.status(400).json({ success: false, message: 'Brakujące dane' });
  }

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant || (user.role !== 'ADMIN' && restaurant.userId !== user.id)) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień' });
    }

    const payments = await prisma.payment.findMany({
      where: { restaurantId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(payments);

  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, message: 'Nie udało się pobrać historii płatności' });
  }
});


export default router;
