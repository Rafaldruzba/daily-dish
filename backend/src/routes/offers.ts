import { Router, type Response, type Request } from 'express';
import prisma from '../lib/prisma.js';
import { authenticate, type AuthRequest } from '../middleware/auth.js';

const router = Router();

// Middleware to check if the user is the owner of the restaurant or an admin
const isOwnerOrAdmin = async (req: AuthRequest, res: Response, next: Function) => {
  const { restaurantId } = req.params as { restaurantId: string };
  const user = req.user;

  if (!user) {
    return res.status(401).json({ success: false, message: 'Brak autoryzacji' });
  }

  if (user.role === 'ADMIN') {
    return next();
  }

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });

  if (restaurant?.userId !== user.id) {
    return res.status(403).json({ success: false, message: 'Brak uprawnień do tej operacji' });
  }

  next();
};

// --- StandardOffer Routes ---

// Create StandardOffer
router.post('/:restaurantId/standard-offer', authenticate, isOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    const { title, description, price, imageUrl, isActive } = req.body;

    const offer = await prisma.standardOffer.create({
      data: {
        restaurantId,
        title,
        description,
        price,
        imageUrl,
        isActive,
      },
    });
    res.status(201).json(offer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Nie udało się utworzyć oferty' });
  }
});

// Update StandardOffer
router.put('/:restaurantId/standard-offer/:offerId', authenticate, isOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { offerId } = req.params as { offerId: string };
    const { title, description, price, imageUrl, isActive } = req.body;

    const offer = await prisma.standardOffer.update({
      where: { id: offerId },
      data: {
        title,
        description,
        price,
        imageUrl,
        isActive,
      },
    });
    res.json(offer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Nie udało się zaktualizować oferty' });
  }
});

// Delete StandardOffer
router.delete('/:restaurantId/standard-offer/:offerId', authenticate, isOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { offerId } = req.params as { offerId: string };
    await prisma.standardOffer.delete({ where: { id: offerId } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Nie udało się usunąć oferty' });
  }
});


// --- MenuItem Routes ---

// Create MenuItem (supports single item or array of items)
router.post('/:restaurantId/menu-item', authenticate, isOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { restaurantId } = req.params as { restaurantId: string };
    const isArray = Array.isArray(req.body);
    const items = isArray ? req.body : [req.body];

    const dataToInsert = items
      .filter((item: any) => item && item.name)
      .map((item: any) => {
        let rawCategory = item.category?.trim() || 'Inne';
        if (rawCategory.length > 0) {
          rawCategory = rawCategory.charAt(0).toUpperCase() + rawCategory.slice(1);
        } else {
          rawCategory = 'Inne';
        }
        return {
          restaurantId,
          name: item.name.trim(),
          description: item.description?.trim() || null,
          price: Number(item.price || 0),
          category: rawCategory,
          order: Number(item.order || 0),
        };
      });

    if (dataToInsert.length === 0) {
      return res.status(400).json({ success: false, message: 'Brak poprawnych pozycji do dodania' });
    }

    const createdItems = await Promise.all(
      dataToInsert.map((data: any) => prisma.menuItem.create({ data }))
    );

    res.status(201).json(isArray ? createdItems : createdItems[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Nie udało się dodać pozycji do menu' });
  }
});

// Update MenuItem
router.put('/:restaurantId/menu-item/:itemId', authenticate, isOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params as { itemId: string };
    const { name, description, price, category, order } = req.body;

    let formattedCategory = undefined;
    if (category !== undefined) {
      const trimmed = category.trim();
      formattedCategory = trimmed.length > 0 ? (trimmed.charAt(0).toUpperCase() + trimmed.slice(1)) : 'Inne';
    }

    const item = await prisma.menuItem.update({
      where: { id: itemId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(price !== undefined && { price: Number(price) }),
        ...(formattedCategory !== undefined && { category: formattedCategory }),
        ...(order !== undefined && { order: Number(order) }),
      },
    });
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Nie udało się zaktualizować pozycji w menu' });
  }
});

// Delete MenuItem
router.delete('/:restaurantId/menu-item/:itemId', authenticate, isOwnerOrAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { itemId } = req.params as { itemId: string };
    await prisma.menuItem.delete({ where: { id: itemId } });
    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Nie udało się usunąć pozycji z menu' });
  }
});

export default router;
