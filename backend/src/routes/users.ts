import { Router, Response } from 'express';
import prisma from '../config/prisma';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import logger from '../config/logger';

const router = Router();

// GET /api/users - List users (admin only)
router.get('/', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const search = (req.query.search as string) || '';
    const role = req.query.role as string;

    const where: any = {};
    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (role) {
      where.role = { name: role };
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { role: true, _count: { select: { myCases: true, documents: true } } },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      users: users.map(u => ({
        id: u.id,
        uuid: u.uuid,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        role: u.role.name,
        isActive: u.isActive,
        isVerified: u.isVerified,
        isBankIdVerified: u.isBankIdVerified,
        lastLoginAt: u.lastLoginAt,
        caseCount: u._count.myCases,
        documentCount: u._count.documents,
        createdAt: u.createdAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    logger.error('List users error:', error);
    res.status(500).json({ error: 'Kunde inte hämta användare' });
  }
});

// GET /api/users/:id
router.get('/:id', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (req.user!.id !== userId && !['admin', 'super_admin'].includes(req.user!.role)) {
      res.status(403).json({ error: 'Otillräckliga behörigheter' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        juristProfile: true,
        _count: {
          select: {
            myCases: true,
            documents: true,
            aiConversations: true,
            forumTopics: true,
            forumReplies: true,
          },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'Användare hittades inte' });
      return;
    }

    res.json({
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role.name,
      isVerified: user.isVerified,
      isActive: user.isActive,
      isBankIdVerified: user.isBankIdVerified,
      avatarUrl: user.avatarUrl,
      preferredLanguage: user.preferredLanguage,
      themePreference: user.themePreference,
      isJurist: !!user.juristProfile,
      juristVerified: user.juristProfile?.isVerified || false,
      juristProfile: user.juristProfile,
      stats: user._count,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Get user error:', error);
    res.status(500).json({ error: 'Kunde inte hämta användare' });
  }
});

// PATCH /api/users/:id/role (admin only)
router.patch('/:id/role', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { roleId } = req.body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      res.status(400).json({ error: 'Ogiltig roll' });
      return;
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { roleId },
      include: { role: true },
    });

    logger.info(`User ${user.email} role changed to ${role.name} by ${req.user!.email}`);

    res.json({ id: user.id, email: user.email, role: user.role.name });
  } catch (error) {
    logger.error('Update user role error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera roll' });
  }
});

// PATCH /api/users/:id/status (admin only)
router.patch('/:id/status', authenticate, authorize('admin', 'super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    logger.info(`User ${user.email} status changed to ${isActive} by ${req.user!.email}`);

    res.json({ id: user.id, email: user.email, isActive: user.isActive });
  } catch (error) {
    logger.error('Update user status error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera status' });
  }
});

// DELETE /api/users/:id (admin only)
router.delete('/:id', authenticate, authorize('super_admin'), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (userId === req.user!.id) {
      res.status(400).json({ error: 'Du kan inte ta bort ditt eget konto' });
      return;
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false, email: `deleted-${userId}@deleted.com` },
    });

    logger.info(`User ${userId} deactivated by ${req.user!.email}`);

    res.json({ message: 'Användaren har avaktiverats' });
  } catch (error) {
    logger.error('Delete user error:', error);
    res.status(500).json({ error: 'Kunde inte ta bort användare' });
  }
});

export default router;