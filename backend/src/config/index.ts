import dotenv from 'dotenv';
import path from 'path';

// In production, load .env.production (committed to git for Railway)
// In development, load .env (gitignored, local development)
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env';
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, `../../${envFile}`) });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '5000', 10),

  // Database
  database: {
    url: process.env.DATABASE_URL || '',
    mysqlUrl: process.env.MYSQL_DATABASE_URL || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'default-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  // AI Providers
  ai: {
    defaultProvider: process.env.AI_DEFAULT_PROVIDER || 'openai',
    defaultModel: process.env.AI_DEFAULT_MODEL || 'gpt-4-turbo',
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      model: process.env.OPENAI_MODEL || 'gpt-4-turbo',
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY || '',
      model: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      model: process.env.GEMINI_MODEL || 'gemini-pro',
    },
    mistral: {
      apiKey: process.env.MISTRAL_API_KEY || '',
      model: process.env.MISTRAL_MODEL || 'mistral-medium',
    },
  },

  // BankID
  bankid: {
    apiUrl: process.env.BANKID_API_URL || 'https://appapi2.test.bankid.com/rp/v6.0',
    certPath: process.env.BANKID_CERT_PATH || '',
    certPassword: process.env.BANKID_CERT_PASSWORD || '',
    pfxPath: process.env.BANKID_PFX_PATH || '',
  },

  // File Upload
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10),
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },

  // Session
  session: {
    secret: process.env.SESSION_SECRET || 'session-secret',
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY || 'default-32-char-encryption-key!',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || './logs/app.log',
  },

  // Email
  email: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'info@rattighetsplattform.se',
  },
} as const;

export default config;