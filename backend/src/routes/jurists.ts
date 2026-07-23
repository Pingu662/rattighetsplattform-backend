import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/jurists
router.get('/', async (_req: AuthRequest, res: Response) => {
  try {
    const jurists = await prisma.juristProfile.findMany({
      where: { isVerified: true, availableForConsultation: true },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
      },
      orderBy: { averageRating: 'desc' },
    });
    res.json({ jurists });
  } catch (error) {
    logger.error('List jurists error:', error);
    res.status(500).json({ error: 'Kunde inte hämta jurister' });
  }
});

// POST /api/jurists/register
router.post('/register', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.juristProfile.findUnique({ where: { userId: req.user!.id } });
    if (existing) {
      res.status(409).json({ error: 'Du har redan en juristprofil' });
      return;
    }

    const profile = await prisma.juristProfile.create({
      data: {
        userId: req.user!.id,
        ...req.body,
      },
    });

    res.status(201).json(profile);
  } catch (error) {
    logger.error('Register jurist error:', error);
    res.status(500).json({ error: 'Kunde inte skapa juristprofil' });
  }
});

// POST /api/jurists/verify (admin)
router.post('/verify/:userId', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const profile = await prisma.juristProfile.update({
      where: { userId: parseInt(req.params.userId) },
      data: {
        isVerified: true,
        verifiedAt: new Date(),
        verifiedBy: req.user!.id,
      },
    });

    await prisma.juristVerification.create({
      data: {
        userId: parseInt(req.params.userId),
        status: 'approved',
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
      },
    });

    res.json(profile);
  } catch (error) {
    logger.error('Verify jurist error:', error);
    res.status(500).json({ error: 'Kunde inte verifiera jurist' });
  }
});

export default router;