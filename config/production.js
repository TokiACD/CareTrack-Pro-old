/**
 * CareTrack Pro - Production Configuration
 * Healthcare-grade security and performance settings
 * 
 * SECURITY WARNING: This configuration is for production use only
 * Ensure all secrets are properly managed and rotated regularly
 */

const config = {
  // =============================================================================
  // SERVER CONFIGURATION
  // =============================================================================
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    nodeEnv: 'production',
    trustProxy: true,
    // Production timeouts
    requestTimeout: 30000,
    serverTimeout: 35000,
    keepAliveTimeout: 5000,
    headersTimeout: 60000
  },

  // =============================================================================
  // DATABASE CONFIGURATION (Production Optimized)
  // =============================================================================
  database: {
    url: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: true,
      ca: process.env.DATABASE_SSL_CA,
      cert: process.env.DATABASE_SSL_CERT,
      key: process.env.DATABASE_SSL_KEY
    },
    pool: {
      min: parseInt(process.env.DATABASE_POOL_MIN) || 5,
      max: parseInt(process.env.DATABASE_POOL_MAX) || 50,
      idleTimeoutMillis: parseInt(process.env.DATABASE_POOL_IDLE_TIMEOUT) || 10000,
      connectionTimeoutMillis: parseInt(process.env.DATABASE_CONNECT_TIMEOUT) || 10000,
      acquireTimeoutMillis: parseInt(process.env.DATABASE_ACQUIRE_TIMEOUT) || 20000
    },
    // Query optimization
    queryTimeout: 30000,
    statementTimeout: 60000,
    // Performance monitoring
    logging: ['error', 'warn'],
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000
  },

  // =============================================================================
  // SECURITY CONFIGURATION (HIPAA Compliant)
  // =============================================================================
  security: {
    // JWT Configuration
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '2h',
      refreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
      algorithm: 'HS256',
      issuer: 'caretrack-pro',
      audience: 'caretrack-users'
    },

    // Session Configuration
    session: {
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: true, // HTTPS only
        httpOnly: true,
        maxAge: 30 * 60 * 1000, // 30 minutes
        sameSite: 'strict',
        domain: process.env.COOKIE_DOMAIN
      },
      rolling: true // Reset expiration on activity
    },

    // Password Policy (HIPAA Compliant)
    passwordPolicy: {
      minLength: parseInt(process.env.PASSWORD_MIN_LENGTH) || 12,
      requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE === 'true',
      requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE === 'true',
      requireNumbers: process.env.PASSWORD_REQUIRE_NUMBERS === 'true',
      requireSymbols: process.env.PASSWORD_REQUIRE_SYMBOLS === 'true',
      maxAge: parseInt(process.env.PASSWORD_MAX_AGE_DAYS) || 90,
      preventReuse: 12 // Last 12 passwords
    },

    // Multi-Factor Authentication
    mfa: {
      enabled: process.env.ENFORCE_MFA === 'true',
      type: 'totp', // Time-based One-Time Password
      window: 1, // Allow 1 step tolerance
      issuer: 'CareTrack Pro'
    },

    // Rate Limiting (DDoS Protection)
    rateLimit: {
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
      max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 500,
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
      // Different limits for different endpoints
      endpoints: {
        auth: {
          max: parseInt(process.env.RATE_LIMIT_AUTH_MAX) || 3,
          windowMs: 15 * 60 * 1000 // 15 minutes
        },
        api: {
          max: 1000,
          windowMs: 15 * 60 * 1000
        }
      }
    },

    // Account Security
    account: {
      maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 3,
      lockoutDuration: parseInt(process.env.LOCKOUT_DURATION_MINUTES) || 30,
      sessionTimeout: parseInt(process.env.SESSION_TIMEOUT_MINUTES) || 30
    }
  },

  // =============================================================================
  // HIPAA COMPLIANCE CONFIGURATION
  // =============================================================================
  hipaa: {
    enabled: process.env.HIPAA_COMPLIANCE_MODE === 'strict',
    
    // PHI (Protected Health Information) Settings
    phi: {
      encryptionKey: process.env.PHI_ENCRYPTION_KEY,
      algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
      retentionDays: parseInt(process.env.PHI_RETENTION_DAYS) || 2555 // 7 years
    },

    // Audit Logging (Required for HIPAA)
    audit: {
      enabled: process.env.AUDIT_LOG_ENABLED === 'true',
      logAllAccess: process.env.AUDIT_LOG_ALL_ACCESS === 'true',
      logPHIAccess: process.env.AUDIT_LOG_PHI_ACCESS === 'true',
      retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS) || 2555,
      logPath: process.env.AUDIT_LOG_PATH || '/var/log/caretrack/audit.log'
    },

    // Data Breach Notification
    breachNotification: {
      enabled: true,
      emailRecipients: ['security@your-healthcare-domain.com'],
      reportingTimeHours: 72 // Report within 72 hours
    },

    // Access Controls
    accessControl: {
      minimumNecessary: true, // Implement minimum necessary standard
      roleBasedAccess: true,
      timeBasedAccess: true,
      locationBasedAccess: false
    }
  },

  // =============================================================================
  // CORS CONFIGURATION (Production Domains Only)
  // =============================================================================
  cors: {
    origin: process.env.CORS_ORIGINS?.split(',') || ['https://your-healthcare-domain.com'],
    credentials: process.env.CORS_CREDENTIALS === 'true',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'X-CSRF-Token'
    ],
    exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
    maxAge: parseInt(process.env.CORS_MAX_AGE) || 86400,
    optionsSuccessStatus: 200
  },

  // =============================================================================
  // LOGGING CONFIGURATION (Production Grade)
  // =============================================================================
  logging: {
    level: process.env.LOG_LEVEL || 'warn',
    format: 'json', // Structured logging for production
    timestamp: true,
    
    // File Logging
    file: {
      enabled: process.env.LOG_TO_FILE === 'true',
      path: process.env.LOG_FILE_PATH || '/var/log/caretrack/app.log',
      maxSize: process.env.LOG_MAX_SIZE || '100MB',
      maxFiles: parseInt(process.env.LOG_MAX_FILES) || 10,
      rotationSchedule: process.env.LOG_ROTATE || 'daily'
    },

    // Console Logging (Minimal in production)
    console: {
      enabled: false,
      colorize: false
    },

    // Error Tracking
    errorTracking: {
      enabled: true,
      service: 'sentry',
      dsn: process.env.SENTRY_DSN,
      environment: 'production'
    },

    // Performance Monitoring
    apm: {
      enabled: process.env.APM_ENABLED === 'true',
      serviceName: process.env.APM_SERVICE_NAME || 'caretrack-prod',
      newRelicKey: process.env.NEW_RELIC_LICENSE_KEY
    }
  },

  // =============================================================================
  // CACHING CONFIGURATION (Performance)
  // =============================================================================
  cache: {
    enabled: process.env.ENABLE_CACHE === 'true',
    
    // Redis Configuration
    redis: {
      url: process.env.REDIS_URL,
      tls: process.env.REDIS_TLS === 'true',
      pool: {
        min: parseInt(process.env.REDIS_POOL_MIN) || 5,
        max: parseInt(process.env.REDIS_POOL_MAX) || 20
      },
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3
    },

    // Cache TTL Settings
    ttl: {
      default: parseInt(process.env.CACHE_TTL) || 3600, // 1 hour
      static: parseInt(process.env.STATIC_CACHE_TTL) || 86400, // 24 hours
      session: 1800, // 30 minutes
      user: 300, // 5 minutes
      api: 60 // 1 minute
    }
  },

  // =============================================================================
  // FILE UPLOAD & STORAGE (HIPAA Compliant)
  // =============================================================================
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE_MB) || 50,
    uploadDir: process.env.UPLOAD_DIR || '/secure/uploads',
    allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png'
    ],
    encryption: {
      enabled: process.env.FILE_ENCRYPTION === 'true',
      algorithm: 'aes-256-gcm'
    },
    virusScanning: {
      enabled: true,
      service: 'clamav'
    }
  },

  // Cloud Storage (AWS S3 with Encryption)
  cloudStorage: {
    provider: process.env.CLOUD_STORAGE_PROVIDER || 'aws',
    aws: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1',
      bucket: process.env.AWS_S3_BUCKET,
      encryption: process.env.AWS_S3_ENCRYPTION || 'AES256',
      versioning: true,
      lifecycle: {
        transitionDays: 30, // Move to IA after 30 days
        glacierDays: 90,    // Move to Glacier after 90 days
        deleteDays: 2555    // Delete after 7 years (HIPAA)
      }
    }
  },

  // =============================================================================
  // BACKUP & RECOVERY CONFIGURATION
  // =============================================================================
  backup: {
    enabled: process.env.BACKUP_ENABLED === 'true',
    schedule: process.env.BACKUP_SCHEDULE || '0 2 * * *', // Daily at 2 AM
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS) || 90,
    encryption: process.env.BACKUP_ENCRYPTION === 'true',
    
    local: {
      enabled: true,
      location: process.env.BACKUP_LOCATION || '/secure/backups'
    },
    
    cloud: {
      enabled: process.env.CLOUD_BACKUP_ENABLED === 'true',
      bucket: process.env.BACKUP_S3_BUCKET,
      encryption: 'AES256'
    },
    
    // Database-specific backup settings
    database: {
      pgDump: {
        format: 'custom',
        compression: 9,
        verbose: false,
        blobs: true
      }
    }
  },

  // =============================================================================
  // HEALTH CHECKS & MONITORING
  // =============================================================================
  health: {
    enabled: process.env.HEALTH_CHECK_ENABLED === 'true',
    path: process.env.HEALTH_CHECK_PATH || '/health',
    timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 30000,
    
    checks: {
      database: process.env.HEALTH_CHECK_DB === 'true',
      redis: process.env.HEALTH_CHECK_REDIS === 'true',
      external: process.env.EXTERNAL_HEALTH_CHECK_URL
    },
    
    // Alerting
    alerts: {
      enabled: true,
      email: ['ops@your-healthcare-domain.com'],
      webhook: process.env.HEALTH_ALERT_WEBHOOK
    }
  },

  // =============================================================================
  // EMAIL CONFIGURATION (HIPAA Compliant)
  // =============================================================================
  email: {
    service: process.env.EMAIL_SERVICE || 'sendgrid',
    
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      encryption: process.env.EMAIL_ENCRYPTION === 'true',
      digitalSignature: process.env.EMAIL_DIGITAL_SIGNATURE === 'true'
    },
    
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: true
      }
    },
    
    from: process.env.SMTP_FROM || 'CareTrack Pro <noreply@your-healthcare-domain.com>',
    
    // Email templates
    templates: {
      path: '/app/templates',
      cache: true
    }
  },

  // =============================================================================
  // FEATURE FLAGS
  // =============================================================================
  features: {
    maintenanceMode: process.env.MAINTENANCE_MODE === 'true',
    debugMode: false, // Always disabled in production
    apiDocs: false,   // Always disabled in production
    metricsEndpoint: false, // Always disabled in production
    
    // Healthcare-specific features
    telemedicine: true,
    clinicalDecisionSupport: true,
    patientPortal: true
  }
};

module.exports = config;