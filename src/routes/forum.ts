import { Router, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/prisma';
import { authenticate, authorize, optionalAuth, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/forum/categories
router.get('/categories', async (_req: AuthRequest, res: Response) => {
  try {
    const categories = await prisma.forumCategory.findMany({
      where: { isActive: true },
      include: { _count: { select: { topics: true } } },
      orderBy: { sortOrder: 'asc' },
    });
    res.json({ categories });
  } catch (error) {
    logger.error('List forum categories error:', error);
    res.status(500).json({ error: 'Kunde inte hämta forumkategorier' });
  }
});

// GET /api/forum/topics
router.get('/topics', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const categoryId = req.query.categoryId as string;

    const where: any = { isHidden: false };
    if (categoryId) where.forumCategoryId = parseInt(categoryId);

    const [topics, total] = await Promise.all([
      prisma.forumTopic.findMany({
        where,
        include: {
          user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
          forumCategory: { select: { name: true, slug: true } },
          _count: { select: { replies: true } },
          lastReplyUser: { select: { firstName: true, lastName: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ isPinned: 'desc' }, { lastReplyAt: { sort: 'desc', nulls: 'last' } }],
      }),
      prisma.forumTopic.count({ where }),
    ]);

    res.json({ topics, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    logger.error('List topics error:', error);
    res.status(500).json({ error: 'Kunde inte hämta ämnen' });
  }
});

// POST /api/forum/topics
router.post('/topics', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { forumCategoryId, title, content, tags } = req.body;

    const topic = await prisma.forumTopic.create({
      data: {
        uuid: uuidv4(),
        forumCategoryId,
        userId: req.user!.id,
        title,
        content,
        tags: tags || [],
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        forumCategory: { select: { name: true } },
      },
    });

    res.status(201).json(topic);
  } catch (error) {
    logger.error('Create topic error:', error);
    res.status(500).json({ error: 'Kunde inte skapa ämne' });
  }
});

// GET /api/forum/topics/:id
router.get('/topics/:id', optionalAuth, async (req: AuthRequest, res: Response) => {
  try {
    const topic = await prisma.forumTopic.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } },
        forumCategory: true,
        replies: {
          where: { isHidden: false },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, role: true, avatarUrl: true } },
            children: {
              include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { replies: true } },
      },
    });

    if (!topic || topic.isHidden) {
      res.status(404).json({ error: 'Ämnet hittades inte' });
      return;
    }

    // Increment view count
    await prisma.forumTopic.update({
      where: { id: topic.id },
      data: { viewCount: { increment: 1 } },
    });

    res.json(topic);
  } catch (error) {
    logger.error('Get topic error:', error);
    res.status(500).json({ error: 'Kunde inte hämta ämne' });
  }
});

// POST /api/forum/topics/:id/replies
router.post('/topics/:id/replies', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const topicId = parseInt(req.params.id);
    const { content, parentId } = req.body;

    const topic = await prisma.forumTopic.findUnique({ where: { id: topicId } });
    if (!topic || topic.isLocked) {
      res.status(400).json({ error: 'Ämnet är låst eller finns inte' });
      return;
    }

    const reply = await prisma.forumReply.create({
      data: {
        topicId,
        userId: req.user!.id,
        content,
        parentId: parentId || null,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, role: true } },
      },
    });

    res.status(201).json(reply);
  } catch (error) {
    logger.error('Create reply error:', error);
    res.status(500).json({ error: 'Kunde inte skapa svar' });
  }
});

// POST /api/forum/replies/:id/mark-best
router.post('/replies/:id/mark-best', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const reply = await prisma.forumReply.update({
      where: { id: parseInt(req.params.id) },
      data: { isBestAnswer: true },
    });

    await prisma.forumTopic.update({
      where: { id: reply.topicId },
      data: { isSolved: true },
    });

    res.json(reply);
  } catch (error) {
    logger.error('Mark best answer error:', error);
    res.status(500).json({ error: 'Kunde inte markera bästa svar' });
  }
});

export default router;