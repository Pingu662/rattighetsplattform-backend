import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import config from './config';
import logger from './config/logger';
import prisma from './config/prisma';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import caseRoutes from './routes/cases';
import legalCaseRoutes from './routes/legalCases';
import appealRoutes from './routes/appeals';
import documentRoutes from './routes/documents';
import aiRoutes from './routes/ai';
import forumRoutes from './routes/forum';
import juristRoutes from './routes/jurists';
import petitionRoutes from './routes/petitions';
import adminRoutes from './routes/admin';
import searchRoutes from './routes/search';
import notificationRoutes from './routes/notifications';

const app = express();

// Security middleware
app.use(helmet());

// CORS - allow all origins (reflects the request origin back)
// This ensures the API works from any frontend domain (webhosting, localhost, etc.)
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  message: { error: 'För många förfrågningar, försök igen senare' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
  next();
});

// Health check
app.get('/api/health', async (_req, res) => {
  let dbStatus = 'unknown';
  let dbError: string | null = null;

  try {
    await prisma.$queryRaw`SELECT 1 as health_check`;
    dbStatus = 'connected';
  } catch (error: any) {
    dbStatus = 'disconnected';
    dbError = error?.message || 'Database connection failed';
    logger.error('Health check - database connection failed:', error);
  }

  res.json({
    status: dbStatus === 'connected' ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    database: {
      status: dbStatus,
      error: dbError,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cases', caseRoutes);
app.use('/api/legal-cases', legalCaseRoutes);
app.use('/api/appeals', appealRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/jurists', juristRoutes);
app.use('/api/petitions', petitionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection before starting the server
    logger.info('Testing database connection...');
    try {
      await prisma.$connect();
      logger.info('Database connection established successfully');
      console.log('✅ Database: Connected');

      // Auto-seed roles on startup (idempotent - safe to run every time)
      try {
        logger.info('Running auto-seed...');
        const roles = [
          { id: 1, name: 'super_admin', description: 'Full system access', permissions: ['all'] },
          { id: 2, name: 'admin', description: 'Administrative access', permissions: ['manage_users', 'manage_cases', 'manage_documents', 'manage_ai', 'moderate_forum', 'view_stats'] },
          { id: 3, name: 'jurist', description: 'Verified legal professional', permissions: ['create_forum', 'answer_questions', 'access_library', 'upload_cases'] },
          { id: 4, name: 'moderator', description: 'Forum and content moderation', permissions: ['moderate_forum', 'manage_categories', 'hide_content'] },
          { id: 5, name: 'expert', description: 'Subject matter expert', permissions: ['create_forum', 'access_library', 'upload_cases', 'comment_cases'] },
          { id: 6, name: 'user', description: 'Standard user', permissions: ['view_cases', 'create_appeals', 'upload_documents', 'use_ai', 'forum_participate'] },
        ];
        for (const role of roles) {
          await prisma.role.upsert({
            where: { id: role.id },
            update: { name: role.name, description: role.description, permissions: role.permissions },
            create: { id: role.id, name: role.name, description: role.description, permissions: role.permissions },
          });
        }
        const roleCount = await prisma.role.count();
        console.log(`✅ Auto-seed complete: ${roleCount} roles in database`);
      } catch (seedError: any) {
        logger.error('Auto-seed failed:', seedError);
        console.log('⚠️  Auto-seed failed (server will still start)');
      }
    } catch (dbError: any) {
      logger.error('Database connection failed:', {
        message: dbError?.message || 'Unknown error',
        code: dbError?.code || 'NO_CODE',
      });
      console.log('❌ Database: Connection failed');
      console.log(`   Error: ${dbError?.message || 'Unknown error'}`);
      console.log('   The server will start but database-dependent features will fail.');
      console.log('   Check your DATABASE_URL environment variable and database host accessibility.');
    }

    app.listen(config.port, () => {
      logger.info(`Server started on port ${config.port} in ${config.env} mode`);
      console.log(`\n🚀 Digital Rättighetsplattform API Server`);
      console.log(`📡 Running on: http://localhost:${config.port}`);
      console.log(`🔧 Environment: ${config.env}`);
      console.log(`⏰ Started at: ${new Date().toISOString()}\n`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
