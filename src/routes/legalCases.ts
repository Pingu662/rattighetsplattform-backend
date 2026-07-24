import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/legal-cases
router.get('/', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const { court, category, year, search } = req.query;

    const where: any = { isApproved: true };
    if (court) where.court = court;
    if (category) where.category = category;
    if (year) where.year = parseInt(year as string);
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { summary: { contains: search as string, mode: 'insensitive' } },
        { caseNumber: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [cases, total] = await Promise.all([
      prisma.legalCase.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ year: 'desc' }, { rulingDate: 'desc' }],
      }),
      prisma.legalCase.count({ where }),
    ]);

    res.json({
      cases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List legal cases error:', error);
    res.status(500).json({ error: 'Kunde inte hämta rättsfall' });
  }
});

// GET /api/legal-cases/:id
router.get('/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const legalCase = await prisma.legalCase.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        caseRulings: { orderBy: { rulingDate: 'desc' } },
        caseComments: {
          where: { isHidden: false },
          include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!legalCase || (!legalCase.isApproved && !req.user?.permissions.includes('all'))) {
      res.status(404).json({ error: 'Rättsfall hittades inte' });
      return;
    }

    // Increment view count
    await prisma.legalCase.update({
      where: { id: legalCase.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(legalCase);
  } catch (error) {
    logger.error('Get legal case error:', error);
    res.status(500).json({ error: 'Kunde inte hämta rättsfall' });
  }
});

// POST /api/legal-cases (admin/jurist)
router.post('/', authenticate, authorize('admin', 'super_admin', 'jurist', 'expert'), async (req: AuthRequest, res: Response) => {
  try {
    const data = req.body;
    const legalCase = await prisma.legalCase.create({
      data: {
        uuid: uuidv4(),
        ...data,
        uploaderId: req.user!.id,
        isApproved: ['admin', 'super_admin'].includes(req.user!.role),
      },
    });

    logger.info(`Legal case created: ${legalCase.caseNumber} by ${req.user!.email}`);
    res.status(201).json(legalCase);
  } catch (error) {
    logger.error('Create legal case error:', error);
    res.status(500).json({ error: 'Kunde inte skapa rättsfall' });
  }
});

// PUT /api/legal-cases/:id (admin)
router.put('/:id', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const legalCase = await prisma.legalCase.update({
      where: { id: parseInt(req.params.id) },
      data: req.body,
    });
    res.json(legalCase);
  } catch (error) {
    logger.error('Update legal case error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera rättsfall' });
  }
});

// POST /api/legal-cases/:id/approve (admin)
router.post('/:id/approve', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const legalCase = await prisma.legalCase.update({
      where: { id: parseInt(req.params.id) },
      data: { isApproved: true, approvedBy: req.user!.id, approvedAt: new Date() },
    });
    res.json(legalCase);
  } catch (error) {
    logger.error('Approve legal case error:', error);
    res.status(500).json({ error: 'Kunde inte godkänna rättsfall' });
  }
});

// DELETE /api/legal-cases/:id (admin)
router.delete('/:id', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    await prisma.legalCase.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Rättsfallet har tagits bort' });
  } catch (error) {
    logger.error('Delete legal case error:', error);
    res.status(500).json({ error: 'Kunde inte ta bort rättsfall' });
  }
});

export default router;