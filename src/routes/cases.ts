import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/cases - List user's cases
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = req.query.status as string;
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const where: any = isAdmin ? {} : { userId: req.user!.id };
    if (status) where.status = status;

    const [cases, total] = await Promise.all([
      prisma.myCase.findMany({
        where,
        include: {
          _count: { select: { documents: true, appealCases: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.myCase.count({ where }),
    ]);

    res.json({
      cases,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List cases error:', error);
    res.status(500).json({ error: 'Kunde inte hämta ärenden' });
  }
});

// POST /api/cases - Create new case
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, description, caseType, authority, authorityDepartment, caseNumber, category, priority, tags } = req.body;

    const newCase = await prisma.myCase.create({
      data: {
        uuid: uuidv4(),
        userId: req.user!.id,
        title,
        description,
        caseType,
        authority,
        authorityDepartment,
        caseNumber,
        category,
        priority: priority || 'normal',
        tags: tags || [],
      },
    });

    logger.info(`New case created: ${newCase.uuid} by user ${req.user!.id}`);

    res.status(201).json(newCase);
  } catch (error) {
    logger.error('Create case error:', error);
    res.status(500).json({ error: 'Kunde inte skapa ärende' });
  }
});

// GET /api/cases/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const caseId = parseInt(req.params.id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const caseItem = await prisma.myCase.findFirst({
      where: isAdmin ? { id: caseId } : { id: caseId, userId: req.user!.id },
      include: {
        documents: { orderBy: { createdAt: 'desc' } },
        appealCases: { orderBy: { createdAt: 'desc' } },
        aiConversations: { take: 5, orderBy: { updatedAt: 'desc' } },
      },
    });

    if (!caseItem) {
      res.status(404).json({ error: 'Ärende hittades inte' });
      return;
    }

    res.json(caseItem);
  } catch (error) {
    logger.error('Get case error:', error);
    res.status(500).json({ error: 'Kunde inte hämta ärende' });
  }
});

// PUT /api/cases/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const caseId = parseInt(req.params.id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const existing = await prisma.myCase.findFirst({
      where: isAdmin ? { id: caseId } : { id: caseId, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Ärende hittades inte' });
      return;
    }

    const { title, description, caseType, authority, authorityDepartment, caseNumber, status, priority, category, tags } = req.body;

    const updated = await prisma.myCase.update({
      where: { id: caseId },
      data: {
        ...(title && { title }),
        ...(description && { description }),
        ...(caseType && { caseType }),
        ...(authority && { authority }),
        ...(authorityDepartment && { authorityDepartment }),
        ...(caseNumber && { caseNumber }),
        ...(status && { status }),
        ...(priority && { priority }),
        ...(category && { category }),
        ...(tags && { tags }),
      },
    });

    res.json(updated);
  } catch (error) {
    logger.error('Update case error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera ärende' });
  }
});

// DELETE /api/cases/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const caseId = parseInt(req.params.id);
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const existing = await prisma.myCase.findFirst({
      where: isAdmin ? { id: caseId } : { id: caseId, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Ärende hittades inte' });
      return;
    }

    await prisma.myCase.delete({ where: { id: caseId } });
    res.json({ message: 'Ärendet har tagits bort' });
  } catch (error) {
    logger.error('Delete case error:', error);
    res.status(500).json({ error: 'Kunde inte ta bort ärende' });
  }
});

export default router;