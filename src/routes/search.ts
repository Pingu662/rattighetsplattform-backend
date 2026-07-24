import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/search
router.get('/', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const q = (req.query.q as string) || '';
    const type = (req.query.type as string) || 'all';
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    if (!q || q.length < 2) {
      res.status(400).json({ error: 'Sökfrågan måste vara minst 2 tecken' });
      return;
    }

    interface SearchResults {
      legalCases?: any[];
      forumTopics?: any[];
      documents?: any[];
      users?: any[];
    }

    const results: SearchResults = {};
    const skip = (page - 1) * limit;

    if (type === 'all' || type === 'legal') {
      results.legalCases = await prisma.legalCase.findMany({
        where: {
          isApproved: true,
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { caseNumber: { contains: q } },
            { keywords: { path: '$', string_contains: q } },
          ],
        },
        take: limit,
        orderBy: { year: 'desc' },
      });
    }

    if (type === 'all' || type === 'forum') {
      results.forumTopics = await prisma.forumTopic.findMany({
        where: {
          isHidden: false,
          OR: [
            { title: { contains: q } },
            { content: { contains: q } },
          ],
        },
        include: {
          forumCategory: { select: { name: true } },
          user: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { replies: true } },
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }

    if ((type === 'all' || type === 'documents') && req.user) {
      results.documents = await prisma.document.findMany({
        where: {
          userId: req.user.id,
          OR: [
            { originalFilename: { contains: q } },
            { description: { contains: q } },
            { extractedText: { contains: q } },
          ],
        },
        take: limit,
        orderBy: { createdAt: 'desc' },
      });
    }

    res.json(results);
  } catch (error) {
    logger.error('Search error:', error);
    res.status(500).json({ error: 'Sökning misslyckades' });
  }
});

export default router;