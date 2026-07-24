import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/notifications
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: req.user!.id },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.notification.count({ where: { userId: req.user!.id } }),
    ]);

    res.json({ notifications, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('List notifications error:', error);
    res.status(500).json({ error: 'Kunde inte hämta notiser' });
  }
});

// GET /api/notifications/unread-count
router.get('/unread-count', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.user!.id, isRead: false },
    });
    res.json({ count });
  } catch (error) {
    logger.error('Unread count error:', error);
    res.status(500).json({ error: 'Kunde inte hämta olästa notiser' });
  }
});

// POST /api/notifications/:id/read
router.post('/:id/read', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { id: parseInt(req.params.id), userId: req.user!.id },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ message: 'Notisen har markerats som läst' });
  } catch (error) {
    logger.error('Mark read error:', error);
    res.status(500).json({ error: 'Kunde inte markera som läst' });
  }
});

// POST /api/notifications/read-all
router.post('/read-all', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user!.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    res.json({ message: 'Alla notiser har markerats som lästa' });
  } catch (error) {
    logger.error('Mark all read error:', error);
    res.status(500).json({ error: 'Kunde inte markera alla som lästa' });
  }
});

export default router;