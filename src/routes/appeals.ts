import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import aiService from '../services/aiService';
import logger from '../config/logger';

const router = Router();

// GET /api/appeals
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const isAdmin = ['admin', 'super_admin'].includes(req.user!.role);

    const where: any = isAdmin ? {} : { userId: req.user!.id };

    const [appeals, total] = await Promise.all([
      prisma.appealCase.findMany({
        where,
        include: { myCase: { select: { title: true } }, _count: { select: { documents: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.appealCase.count({ where }),
    ]);

    res.json({ appeals, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('List appeals error:', error);
    res.status(500).json({ error: 'Kunde inte hämta överklaganden' });
  }
});

// POST /api/appeals
router.post('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { title, myCaseId, authorityName, authorityDecisionDate, authorityCaseNumber, originalDecision } = req.body;

    const appeal = await prisma.appealCase.create({
      data: {
        uuid: uuidv4(),
        userId: req.user!.id,
        myCaseId: myCaseId || null,
        title: title || 'Nytt överklagande',
        authorityName,
        authorityDecisionDate: authorityDecisionDate ? new Date(authorityDecisionDate) : null,
        authorityCaseNumber,
        originalDecision,
      },
    });

    res.status(201).json(appeal);
  } catch (error) {
    logger.error('Create appeal error:', error);
    res.status(500).json({ error: 'Kunde inte skapa överklagande' });
  }
});

// POST /api/appeals/:id/generate
router.post('/:id/generate', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appealId = parseInt(req.params.id);
    const appeal = await prisma.appealCase.findFirst({
      where: { id: appealId, userId: req.user!.id },
    });

    if (!appeal) {
      res.status(404).json({ error: 'Överklagande hittades inte' });
      return;
    }

    if (!appeal.originalDecision) {
      res.status(400).json({ error: 'Inget beslut har laddats upp. Ladda upp beslutet först.' });
      return;
    }

    const result = await aiService.generateAppeal(appeal.originalDecision, req.user!.id, {
      authority: appeal.authorityName || undefined,
      caseNumber: appeal.authorityCaseNumber || undefined,
    });

    const updated = await prisma.appealCase.update({
      where: { id: appealId },
      data: {
        appealText: result.appealText,
        appealSimpleText: result.simpleText,
        aiAnalysis: { analysis: result.analysis },
        appealStatus: 'generated',
        isAiGenerated: true,
      },
    });

    res.json(updated);
  } catch (error: any) {
    logger.error('Generate appeal error:', error);
    res.status(500).json({ error: error.message || 'Generering misslyckades' });
  }
});

// GET /api/appeals/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appeal = await prisma.appealCase.findFirst({
      where: { id: parseInt(req.params.id), userId: req.user!.id },
      include: { myCase: true, documents: true },
    });

    if (!appeal) {
      res.status(404).json({ error: 'Överklagande hittades inte' });
      return;
    }

    res.json(appeal);
  } catch (error) {
    logger.error('Get appeal error:', error);
    res.status(500).json({ error: 'Kunde inte hämta överklagande' });
  }
});

// PUT /api/appeals/:id
router.put('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appealId = parseInt(req.params.id);
    const existing = await prisma.appealCase.findFirst({
      where: { id: appealId, userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Överklagande hittades inte' });
      return;
    }

    const updated = await prisma.appealCase.update({
      where: { id: appealId },
      data: req.body,
    });

    res.json(updated);
  } catch (error) {
    logger.error('Update appeal error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera överklagande' });
  }
});

// DELETE /api/appeals/:id
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const appealId = parseInt(req.params.id);
    await prisma.appealCase.delete({
      where: { id: appealId },
    });
    res.json({ message: 'Överklagandet har tagits bort' });
  } catch (error) {
    logger.error('Delete appeal error:', error);
    res.status(500).json({ error: 'Kunde inte ta bort överklagande' });
  }
});

export default router;