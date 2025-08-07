import { config } from 'dotenv';
import path from 'path';

// Load environment variables
config({ path: path.resolve(process.cwd(), '.env') });

export const productionConfig = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'production',
    trustProxy: process.env.TRUST_PROXY === 'true',
  },

  // Database Configuration
  database: {
    url: process.env.DATABASE_URL!,
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN || '5', 10),
      max: parseInt(process.env.DATABASE_POOL_MAX || '20', 10),
      timeout: parseInt(process.env.DATABASE_TIMEOUT || '30000', 10),
    },
    ssl: {
      rejectUnauthorized: false, // Set to true for production with valid certificates
    },
  },

  // Security Configuration
  security: {
    jwt: {
      secret: process.env.JWT_SECRET!,
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    },
    session: {
      secret: process.env.SESSION_SECRET!,
      timeout: parseInt(process.env.SESSION_TIMEOUT || '28800000', 10), // 8 hours
    },
    encryption: {
      key: process.env.ENCRYPTION_KEY!,
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
    },
    cors: {
      origin: process.env.CORS_ORIGIN?.split(',') || [],
      credentials: process.env.CORS_CREDENTIALS === 'true',
    },
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX || '1000', 10),
    skipSuccessfulRequests: process.env.RATE_LIMIT_SKIP_SUCCESSFUL === 'true',
  },

  // Healthcare Compliance
  healthcare: {
    hipaaCompliance: process.env.HIPAA_COMPLIANCE === 'true',
    dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS || '2555', 10), // 7 years
    phiEncryption: process.env.PHI_ENCRYPTION === 'true',
    auditLogLevel: process.env.AUDIT_LOG_LEVEL || 'info',
  },

  // Monitoring & Logging
  monitoring: {
    logLevel: process.env.LOG_LEVEL || 'info',
    logFormat: process.env.LOG_FORMAT || 'json',
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    healthCheck: process.env.HEALTH_CHECK_ENABLED === 'true',
    sentry: {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || 'production',
    },
  },

  // Email Configuration
  email: {
    smtp: {
      host: process.env.SMTP_HOST!,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    },
    from: {
      email: process.env.FROM_EMAIL!,
      name: process.env.FROM_NAME || 'CareTrack Pro',
    },
  },

  // File Storage
  storage: {
    uploadDir: process.env.UPLOAD_DIR || '/var/caretrack/uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['pdf', 'jpg', 'jpeg', 'png'],
  },

  // Backup Configuration
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retention: parseInt(process.env.BACKUP_RETENTION || '30', 10), // days
    location: process.env.BACKUP_LOCATION || '/var/caretrack/backups',
  },

  // Redis Configuration (optional)
  redis: {
    url: process.env.REDIS_URL,
    ttl: parseInt(process.env.REDIS_TTL || '3600', 10), // 1 hour
  },

  // URLs
  urls: {
    api: process.env.API_BASE_URL!,
    client: process.env.CLIENT_URL!,
  },
};

// Validation function to ensure all required environment variables are set
export function validateProductionConfig() {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET',
    'ENCRYPTION_KEY',
    'API_BASE_URL',
    'CLIENT_URL',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS',
    'FROM_EMAIL',
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables for production: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.'
    );
  }

  // Validate JWT secret length
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 64) {
    throw new Error('JWT_SECRET must be at least 64 characters long for production security');
  }

  // Validate encryption key
  if (process.env.ENCRYPTION_KEY && process.env.ENCRYPTION_KEY.length < 32) {
    throw new Error('ENCRYPTION_KEY must be at least 32 characters long');
  }

  console.log('✅ Production configuration validation passed');
}

export default productionConfig;