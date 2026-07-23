import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// All routes require admin
router.use(authenticate, authorize('admin', 'super_admin'));

// GET /api/admin/stats
router.get('/stats', async (_req: AuthRequest, res: Response) => {
  try {
    const [
      totalUsers, totalCases, totalAppeals, totalDocuments,
      totalLegalCases, totalForumTopics, totalPetitions, aiUsage
    ] = await Promise.all([
      prisma.user.count(),
      prisma.myCase.count(),
      prisma.appealCase.count(),
      prisma.document.count(),
      prisma.legalCase.count(),
      prisma.forumTopic.count(),
      prisma.petition.count(),
      prisma.aiLog.groupBy({ by: ['provider'], _sum: { totalTokens: true, cost: true } }),
    ]);

    res.json({
      totalUsers,
      totalCases,
      totalAppeals,
      totalDocuments,
      totalLegalCases,
      totalForumTopics,
      totalPetitions,
      aiUsage: aiUsage.map(a => ({ provider: a.provider, tokens: a._sum.totalTokens, cost: a._sum.cost })),
    });
  } catch (error) {
    logger.error('Admin stats error:', error);
    res.status(500).json({ error: 'Kunde inte hämta statistik' });
  }
});

// GET /api/admin/activity
router.get('/activity', async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [newUsers, newCases, newDocuments, aiCalls] = await Promise.all([
      prisma.user.count({ where: { createdAt: { gte: since } } }),
      prisma.myCase.count({ where: { createdAt: { gte: since } } }),
      prisma.document.count({ where: { createdAt: { gte: since } } }),
      prisma.aiLog.count({ where: { createdAt: { gte: since } } }),
    ]);

    res.json({ period: `${days} days`, newUsers, newCases, newDocuments, aiCalls });
  } catch (error) {
    logger.error('Admin activity error:', error);
    res.status(500).json({ error: 'Kunde inte hämta aktivitet' });
  }
});

// GET /api/admin/settings
router.get('/settings', async (_req: AuthRequest, res: Response) => {
  try {
    const settings = await prisma.systemSetting.findMany();
    const formatted = settings.reduce((acc: any, s) => {
      acc[s.settingKey] = s.settingValue;
      return acc;
    }, {});
    res.json(formatted);
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({ error: 'Kunde inte hämta inställningar' });
  }
});

// PUT /api/admin/settings
router.put('/settings', async (req: AuthRequest, res: Response) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      await prisma.systemSetting.upsert({
        where: { settingKey: key },
        update: { settingValue: value as any, updatedBy: req.user!.id },
        create: { settingKey: key, settingValue: value as any, updatedBy: req.user!.id },
      });
    }
    res.json({ message: 'Inställningar uppdaterade' });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera inställningar' });
  }
});

export default router;