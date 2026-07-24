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

// CORS - allow all origins in development, restrict in production
const isDev = config.env === 'development';
const allowedOrigins = [
  config.cors.origin,
  'http://mseet_42481750.thatserver.com',
  'http://localhost:3000',
  'http://localhost:5000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://rattighetsplattform-backend-production.up.railway.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // In development, allow all origins (including localhost)
    if (isDev || !origin) {
      callback(null, true);
      return;
    }
    // In production, check against allowed list
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
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
