/**
 * Enhanced Security Configuration for CareTrack Pro
 * Healthcare-grade security settings with HIPAA compliance
 */

import crypto from 'crypto';

// JWT Configuration
export const JWT_CONFIG = {
  // Use a strong, rotatable secret key
  SECRET: process.env.JWT_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    return crypto.randomBytes(64).toString('hex');
  })(),
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  ALGORITHM: 'HS256' as const,
  ISSUER: 'caretrack-pro',
  AUDIENCE: 'caretrack-users'
};

// Password Security Configuration
export const PASSWORD_CONFIG = {
  // BCrypt rounds (minimum 12 for healthcare applications)
  BCRYPT_ROUNDS: parseInt(process.env.BCRYPT_ROUNDS || '14'),
  MIN_LENGTH: 12,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL: true,
  PREVENT_COMMON_PASSWORDS: true,
  PASSWORD_HISTORY_COUNT: 12 // Prevent reuse of last 12 passwords
};

// Session Security Configuration
export const SESSION_CONFIG = {
  SECRET: process.env.SESSION_SECRET || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set in production');
    }
    return crypto.randomBytes(64).toString('hex');
  })(),
  TIMEOUT_MS: parseInt(process.env.SESSION_TIMEOUT || '1800000'), // 30 minutes
  SECURE: process.env.NODE_ENV === 'production',
  HTTP_ONLY: true,
  SAME_SITE: 'strict' as const,
  REGENERATE_ON_PRIVILEGE_CHANGE: true
};

// Encryption Configuration
export const ENCRYPTION_CONFIG = {
  ALGORITHM: 'aes-256-gcm',
  KEY_LENGTH: 32,
  IV_LENGTH: 16,
  TAG_LENGTH: 16,
  PHI_ENCRYPTION_KEY: process.env.PHI_ENCRYPTION_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PHI_ENCRYPTION_KEY must be set in production');
    }
    return crypto.randomBytes(32).toString('hex');
  })(),
  DATA_AT_REST_KEY: process.env.DATA_AT_REST_KEY || (() => {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DATA_AT_REST_KEY must be set in production');
    }
    return crypto.randomBytes(32).toString('hex');
  })()
};

// Rate Limiting Configuration
export const RATE_LIMIT_CONFIG = {
  GENERAL: {
    WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
    SKIP_SUCCESSFUL: false,
    TRUSTED_PROXIES: ['127.0.0.1', '::1']
  },
  AUTH: {
    WINDOW_MS: 15 * 60 * 1000, // 15 minutes
    MAX_REQUESTS: 100, // Increased for normal frontend usage
    PROGRESSIVE_DELAY: true,
    MAX_DELAY_MS: 60000 // 1 minute
  },
  SENSITIVE: {
    WINDOW_MS: 60 * 60 * 1000, // 1 hour
    MAX_REQUESTS: 10,
    BLOCK_DURATION: 30 * 60 * 1000 // 30 minutes block
  }
};

// CSRF Protection Configuration
export const CSRF_CONFIG = {
  ENABLED: true,
  SECRET_LENGTH: 32,
  TOKEN_LENGTH: 32,
  COOKIE_NAME: '__Host-csrf-token',
  HEADER_NAME: 'x-csrf-token',
  SECURE: process.env.NODE_ENV === 'production',
  SAME_SITE: 'strict' as const,
  MAX_AGE: 3600 // 1 hour
};

// Content Security Policy
export const CSP_CONFIG = {
  defaultSrc: ["'self'"],
  styleSrc: [
    "'self'",
    "'unsafe-inline'", // Required for some medical UI components
    "https://fonts.googleapis.com"
  ],
  fontSrc: [
    "'self'",
    "https://fonts.gstatic.com"
  ],
  imgSrc: [
    "'self'",
    "data:",
    "https:" // Medical imaging from trusted HTTPS sources only
  ],
  scriptSrc: [
    "'self'",
    // No 'unsafe-inline' or 'unsafe-eval' for security
  ],
  connectSrc: [
    "'self'",
    process.env.API_BASE_URL || "'self'"
  ],
  frameSrc: ["'none'"], // Prevent clickjacking
  objectSrc: ["'none'"], // Prevent object/embed attacks
  mediaSrc: ["'self'"],
  childSrc: ["'none'"],
  workerSrc: ["'self'"]
};

// File Upload Security
export const FILE_UPLOAD_CONFIG = {
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE_MB || '10') * 1024 * 1024,
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.txt', '.csv', '.xls', '.xlsx'],
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads',
  SCAN_FOR_MALWARE: process.env.NODE_ENV === 'production',
  QUARANTINE_SUSPICIOUS: true,
  GENERATE_SAFE_NAMES: true
};

// Audit Logging Configuration
export const AUDIT_CONFIG = {
  ENABLED: true,
  LOG_LEVEL: process.env.AUDIT_LOG_LEVEL || 'info',
  LOG_FILE: process.env.AUDIT_LOG_FILE || './logs/audit.log',
  LOG_TO_DATABASE: true,
  LOG_TO_SIEM: process.env.NODE_ENV === 'production',
  INCLUDE_REQUEST_BODY: process.env.NODE_ENV !== 'production',
  EXCLUDE_SENSITIVE_FIELDS: [
    'password',
    'passwordHash',
    'token',
    'secret',
    'key',
    'ssn',
    'socialSecurityNumber'
  ],
  RETENTION_DAYS: parseInt(process.env.AUDIT_RETENTION_DAYS || '2555'), // 7 years for healthcare
  ENCRYPTION_ENABLED: true
};

// HIPAA Compliance Settings
export const HIPAA_CONFIG = {
  PHI_FIELDS: [
    'ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob', 
    'medicalRecordNumber', 'insuranceNumber', 'email', 
    'phone', 'address', 'firstName', 'lastName',
    'patientId', 'caregiverId', 'diagnosis', 'medication', 
    'treatment', 'healthPlan', 'accountNumber'
  ],
  AUTO_LOGOFF_MINUTES: parseInt(process.env.HIPAA_AUTO_LOGOFF_MINUTES || '30'),
  DATA_RETENTION_YEARS: parseInt(process.env.HIPAA_DATA_RETENTION_YEARS || '7'),
  MINIMUM_NECESSARY_ACCESS: true,
  REQUIRE_ENCRYPTION: true,
  REQUIRE_ACCESS_LOGS: true,
  BREACH_NOTIFICATION_EMAIL: process.env.HIPAA_BREACH_EMAIL || 'security@caretrack.com',
  BUSINESS_ASSOCIATE_MODE: process.env.HIPAA_BA_MODE === 'true'
};

// Security Headers Configuration
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Permitted-Cross-Domain-Policies': 'none',
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0'
};

// Database Security Configuration
export const DATABASE_CONFIG = {
  CONNECTION_LIMIT: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  ACQUIRE_TIMEOUT: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  TIMEOUT: parseInt(process.env.DB_TIMEOUT || '30000'),
  SSL_ENABLED: process.env.NODE_ENV === 'production',
  SSL_REJECT_UNAUTHORIZED: process.env.NODE_ENV === 'production',
  QUERY_TIMEOUT: parseInt(process.env.DB_QUERY_TIMEOUT || '30000'),
  LOG_SLOW_QUERIES: true,
  SLOW_QUERY_THRESHOLD: parseInt(process.env.SLOW_QUERY_THRESHOLD || '1000'),
  ENABLE_QUERY_LOGGING: process.env.NODE_ENV === 'development'
};

// API Security Configuration
export const API_CONFIG = {
  VERSION: 'v1',
  REQUEST_ID_HEADER: 'x-request-id',
  CORRELATION_ID_HEADER: 'x-correlation-id',
  CLIENT_ID_HEADER: 'x-client-id',
  API_KEY_HEADER: 'x-api-key',
  MAX_REQUEST_SIZE: '10mb',
  PARAMETER_LIMIT: 1000,
  ENABLE_COMPRESSION: true,
  COMPRESSION_THRESHOLD: 1024,
  ENABLE_ETAG: true,
  TRUST_PROXY: process.env.NODE_ENV === 'production'
};

// Monitoring and Alerting
export const MONITORING_CONFIG = {
  ENABLED: process.env.MONITORING_ENABLED === 'true',
  HEALTH_CHECK_INTERVAL: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000'),
  ALERT_WEBHOOK: process.env.ALERT_WEBHOOK_URL,
  ALERT_EMAIL: process.env.ALERT_EMAIL || 'security@caretrack.com',
  PERFORMANCE_THRESHOLD: parseInt(process.env.PERFORMANCE_THRESHOLD_MS || '2000'),
  ERROR_THRESHOLD_COUNT: parseInt(process.env.ERROR_THRESHOLD_COUNT || '10'),
  ERROR_THRESHOLD_WINDOW: parseInt(process.env.ERROR_THRESHOLD_WINDOW || '60000'),
  MEMORY_THRESHOLD_PERCENT: parseInt(process.env.MEMORY_THRESHOLD_PERCENT || '85'),
  CPU_THRESHOLD_PERCENT: parseInt(process.env.CPU_THRESHOLD_PERCENT || '80')
};

// Export validation function
export function validateSecurityConfig(): void {
  const requiredEnvVars = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'PHI_ENCRYPTION_KEY',
    'DATA_AT_REST_KEY'
  ];

  if (process.env.NODE_ENV === 'production') {
    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Required environment variable ${envVar} is not set`);
      }
    }
  }

  // Validate JWT secret strength
  if (JWT_CONFIG.SECRET && JWT_CONFIG.SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long');
  }

  // Validate encryption key format
  if (ENCRYPTION_CONFIG.PHI_ENCRYPTION_KEY && 
      !crypto.createHash('sha256').update(ENCRYPTION_CONFIG.PHI_ENCRYPTION_KEY).digest('hex')) {
    throw new Error('PHI_ENCRYPTION_KEY is not valid');
  }

  console.log('✅ Security configuration validated successfully');
}