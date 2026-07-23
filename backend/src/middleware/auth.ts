import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import prisma from '../config/prisma';

export type AuthRequest = Request & {
  user?: {
    id: number;
    uuid: string;
    email: string;
    roleId: number;
    role: string;
    permissions: string[];
  };
};

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Ingen autentiseringstoken angiven' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: number;
      uuid: string;
      roleId: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Användaren är inte aktiv' });
      return;
    }

    req.user = {
      id: user.id,
      uuid: user.uuid,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      permissions: (user.role.permissions as string[]) || [],
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token har löpt ut', code: 'TOKEN_EXPIRED' });
      return;
    }
    res.status(401).json({ error: 'Ogiltig token' });
  }
};

export const authorize = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Oautentiserad' });
      return;
    }

    if (allowedRoles.includes('super_admin') && req.user.role === 'super_admin') {
      next();
      return;
    }

    if (req.user.permissions.includes('all')) {
      next();
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Otillräckliga behörigheter' });
      return;
    }

    next();
  };
};

export const optionalAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as {
      userId: number;
      uuid: string;
      roleId: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (user && user.isActive) {
      req.user = {
        id: user.id,
        uuid: user.uuid,
        email: user.email,
        roleId: user.roleId,
        role: user.role.name,
        permissions: (user.role.permissions as string[]) || [],
      };
    }
  } catch {
    // Token invalid or expired, continue without user
  }

  next();
};