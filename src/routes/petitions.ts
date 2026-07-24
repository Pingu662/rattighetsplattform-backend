import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/petitions
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const [petitions, total] = await Promise.all([
      prisma.petition.findMany({
        where: { status: 'active' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
      }),
      prisma.petition.count({ where: { status: 'active' } }),
    ]);

    res.json({ petitions, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('List petitions error:', error);
    res.status(500).json({ error: 'Kunde inte hämta namninsamlingar' });
  }
});

// POST /api/petitions
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petition = await prisma.petition.create({
      data: {
        uuid: uuidv4(),
        userId: req.user!.id,
        ...req.body,
      },
    });
    res.status(201).json(petition);
  } catch (error) {
    logger.error('Create petition error:', error);
    res.status(500).json({ error: 'Kunde inte skapa namninsamling' });
  }
});

// GET /api/petitions/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const petition = await prisma.petition.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { signatures: true } },
      },
    });

    if (!petition) {
      res.status(404).json({ error: 'Namninsamling hittades inte' });
      return;
    }

    res.json(petition);
  } catch (error) {
    logger.error('Get petition error:', error);
    res.status(500).json({ error: 'Kunde inte hämta namninsamling' });
  }
});

// POST /api/petitions/:id/sign
router.post('/:id/sign', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const petitionId = parseInt(req.params.id);
    const { isAnonymous } = req.body;

    const existing = await prisma.petitionSignature.findUnique({
      where: { petitionId_userId: { petitionId, userId: req.user!.id } },
    });

    if (existing) {
      res.status(409).json({ error: 'Du har redan skrivit under denna namninsamling' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });

    const signature = await prisma.petitionSignature.create({
      data: {
        petitionId,
        userId: req.user!.id,
        signerName: isAnonymous ? 'Anonym' : `${user?.firstName} ${user?.lastName}`,
        signerCity: isAnonymous ? null : null,
        isAnonymous: isAnonymous || false,
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    res.status(201).json(signature);
  } catch (error) {
    logger.error('Sign petition error:', error);
    res.status(500).json({ error: 'Kunde inte skriva under' });
  }
});

export default router;