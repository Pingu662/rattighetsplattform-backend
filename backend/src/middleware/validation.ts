import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema, source: 'body' | 'query' | 'params' = 'body') => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const data = schema.parse(req[source]);
      req[source] = data;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'Valideringsfel',
          details: error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
        return;
      }
      next(error);
    }
  };
};

export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const sort = (req.query.sort as string) || 'createdAt';
  const order = (req.query.order as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc';
  const search = (req.query.search as string) || '';

  req.pagination = { page, limit, sort, order, search };
  next();
};

declare global {
  namespace Express {
    interface Request {
      pagination: {
        page: number;
        limit: number;
        sort: string;
        order: 'asc' | 'desc';
        search: string;
      };
    }
  }
}