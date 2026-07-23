import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import config from '../config';
import prisma from '../config/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { z } from 'zod';
import logger from '../config/logger';

const router = Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(8, 'Lösenordet måste vara minst 8 tecken'),
  firstName: z.string().min(1, 'Förnamn krävs'),
  lastName: z.string().min(1, 'Efternamn krävs'),
  phone: z.string().optional(),
  personalNumber: z.string().regex(/^\d{12}$|^\d{10}-\d{4}$/, 'Ogiltigt personnummer').optional(),
});

const loginSchema = z.object({
  email: z.string().email('Ogiltig e-postadress'),
  password: z.string().min(1, 'Lösenord krävs'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token krävs'),
});

// Helper: Generate tokens
const generateTokens = (userId: number, uuid: string, roleId: number) => {
  const accessToken = jwt.sign(
    { userId, uuid, roleId },
    config.jwt.secret as Secret,
    { expiresIn: config.jwt.expiresIn } as SignOptions
  );

  const refreshToken = uuidv4() + '-' + crypto.randomBytes(32).toString('hex');
  const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  return { accessToken, refreshToken, refreshTokenHash };
};

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, phone, personalNumber } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: 'E-postadressen är redan registrerad' });
      return;
    }

    if (personalNumber) {
      const existingPn = await prisma.user.findUnique({ where: { personalNumber } });
      if (existingPn) {
        res.status(409).json({ error: 'Personnumret är redan registrerat' });
        return;
      }
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        uuid: uuidv4(),
        email,
        passwordHash,
        firstName,
        lastName,
        phone,
        personalNumber: personalNumber || null,
        roleId: 6, // Default user role
      },
    });

    const { accessToken, refreshToken, refreshTokenHash } = generateTokens(user.id, user.uuid, user.roleId);

    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
      },
    });

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: 'user',
      },
      accessToken,
      refreshToken,
    });
  } catch (error: any) {
    // Handle Prisma-specific errors with descriptive messages
    if (error?.code === 'P2002') {
      // Unique constraint violation
      const field = error.meta?.target?.[0] || 'field';
      logger.error(`Registration failed - unique constraint on ${field}:`, error);
      res.status(409).json({
        error: `En användare med detta ${field === 'email' ? 'e-post' : field === 'personal_number' ? 'personnummer' : 'värde'} finns redan`,
      });
      return;
    }

    if (error?.code === 'P2025') {
      // Foreign key constraint violation (e.g., roleId doesn't exist)
      logger.error('Registration failed - foreign key constraint:', error);
      res.status(500).json({
        error: 'Registrering misslyckades - kontrollera att databasens tabeller är korrekt inställda. Kontakta administratören.',
      });
      return;
    }

    if (error?.code === 'P2012' || error?.code === 'P2011') {
      // Missing required field
      logger.error('Registration failed - missing required field:', error);
      res.status(400).json({ error: 'Ett obligatoriskt fält saknas' });
      return;
    }

    // Log the full error for debugging
    logger.error('Registration error:', {
      message: error?.message || 'Unknown error',
      code: error?.code || 'NO_CODE',
      meta: error?.meta || null,
      stack: error?.stack || null,
    });

    // Check if it's a database connection error
    const isDbConnectionError =
      error?.message?.includes('connect') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('ETIMEDOUT') ||
      error?.message?.includes('ENOTFOUND') ||
      error?.message?.includes('database') ||
      error?.message?.includes('Database');

    if (isDbConnectionError) {
      res.status(503).json({
        error: 'Kunde inte ansluta till databasen. Försök igen om några minuter.',
        code: 'DB_CONNECTION_ERROR',
      });
      return;
    }

    res.status(500).json({ error: 'Registrering misslyckades' });
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Kontot är inaktiverat' });
      return;
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      res.status(423).json({
        error: 'Kontot är tillfälligt låst',
        lockedUntil: user.lockedUntil,
      });
      return;
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await prisma.user.update({
        where: { id: user.id },
        data: { loginAttempts: user.loginAttempts + 1 },
      });

      if (user.loginAttempts + 1 >= 5) {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            lockedUntil: new Date(Date.now() + 15 * 60 * 1000),
            loginAttempts: 0,
          },
        });
      }

      res.status(401).json({ error: 'Felaktig e-post eller lösenord' });
      return;
    }

    // Reset login attempts on success
    await prisma.user.update({
      where: { id: user.id },
      data: {
        loginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
      },
    });

    const { accessToken, refreshToken, refreshTokenHash } = generateTokens(user.id, user.uuid, user.roleId);

    // Store refresh token
    await prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
      },
    });

    // Create session
    const sessionToken = uuidv4();
    await prisma.session.create({
      data: {
        userId: user.id,
        sessionToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
        userAgent: req.headers['user-agent'] || '',
      },
    });

    logger.info(`User logged in: ${email}`);

    res.json({
      user: {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role.name,
        isBankIdVerified: user.isBankIdVerified,
        avatarUrl: user.avatarUrl,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: 'Inloggning misslyckades' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: { include: { role: true } } },
    });

    if (!storedToken || storedToken.isRevoked || storedToken.expiresAt < new Date()) {
      res.status(401).json({ error: 'Ogiltig eller utgången refresh token' });
      return;
    }

    // Revoke old token
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    const { accessToken: newAccessToken, refreshToken: newRefreshToken, refreshTokenHash } =
      generateTokens(storedToken.user.id, storedToken.user.uuid, storedToken.user.roleId);

    await prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        ipAddress: req.ip || '',
      },
    });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    logger.error('Token refresh error:', error);
    res.status(500).json({ error: 'Token-uppdatering misslyckades' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    // Revoke all refresh tokens for user
    await prisma.refreshToken.updateMany({
      where: { userId: req.user!.id, isRevoked: false },
      data: { isRevoked: true, revokedAt: new Date() },
    });

    // Invalidate active sessions
    await prisma.session.updateMany({
      where: { userId: req.user!.id, isActive: true },
      data: { isActive: false },
    });

    res.json({ message: 'Utloggning lyckades' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: 'Utloggning misslyckades' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        role: true,
        juristProfile: true,
        _count: {
          select: {
            myCases: true,
            documents: true,
            aiConversations: true,
            forumTopics: true,
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
      isBankIdVerified: user.isBankIdVerified,
      avatarUrl: user.avatarUrl,
      preferredLanguage: user.preferredLanguage,
      themePreference: user.themePreference,
      emailNotifications: user.emailNotifications,
      isJurist: !!user.juristProfile,
      juristVerified: user.juristProfile?.isVerified || false,
      stats: user._count,
      createdAt: user.createdAt,
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({ error: 'Kunde inte hämta profil' });
  }
});

// PUT /api/auth/profile
router.put('/profile', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { firstName, lastName, phone, preferredLanguage, themePreference, emailNotifications } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(preferredLanguage && { preferredLanguage }),
        ...(themePreference && { themePreference }),
        ...(typeof emailNotifications === 'boolean' && { emailNotifications }),
      },
    });

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      preferredLanguage: user.preferredLanguage,
      themePreference: user.themePreference,
      emailNotifications: user.emailNotifications,
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({ error: 'Kunde inte uppdatera profil' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword || newPassword.length < 8) {
      res.status(400).json({ error: 'Nytt lösenord måste vara minst 8 tecken' });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'Användare hittades inte' });
      return;
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      res.status(401).json({ error: 'Nuvarande lösenord är felaktigt' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Revoke all sessions except current
    await prisma.session.updateMany({
      where: { userId: user.id, isActive: true },
      data: { isActive: false },
    });

    res.json({ message: 'Lösenordet har ändrats' });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({ error: 'Kunde inte ändra lösenord' });
  }
});

export default router;