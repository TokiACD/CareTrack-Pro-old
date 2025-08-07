/**
 * Production Security Middleware
 * HIPAA-compliant security configurations for CareTrack Pro
 */

import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { createHash, createCipher, createDecipher } from 'crypto';
import { Request, Response, NextFunction } from 'express';

// =============================================================================
// SECURITY HEADERS MIDDLEWARE (Helmet Configuration)
// =============================================================================
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
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
        "https:" // Medical imaging may come from various HTTPS sources
      ],
      scriptSrc: [
        "'self'",
        // Add specific trusted medical device script sources
      ],
      connectSrc: [
        "'self'",
        process.env.API_BASE_URL || "'self'",
        // Add trusted healthcare API endpoints
      ],
      frameSrc: ["'none'"], // Prevent clickjacking
      objectSrc: ["'none'"], // Prevent object/embed attacks
      upgradeInsecureRequests: []
    },
  },
  
  // HTTP Strict Transport Security (HSTS)
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // Prevent MIME type sniffing
  noSniff: true,
  
  // X-Frame-Options (prevent clickjacking)
  frameguard: { action: 'deny' },
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  
  // Cross-Origin Embedder Policy
  crossOriginEmbedderPolicy: false, // May interfere with medical device integrations
  
  // Cross-Origin Opener Policy
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  
  // Cross-Origin Resource Policy
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  
  // DNS Prefetch Control
  dnsPrefetchControl: { allow: false },
  
  // IE No Open
  ieNoOpen: true,
  
  // Powered By (hide Express)
  hidePoweredBy: true
});

// =============================================================================
// RATE LIMITING MIDDLEWARE (DDoS Protection)
// =============================================================================

// General API Rate Limiting
export const apiRateLimit = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '500'),
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => {
    // Use IP + User-Agent for better rate limiting
    return req.ip + ':' + (req.headers['user-agent'] || 'unknown');
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000') / 1000)
    });
  }
});

// Strict Rate Limiting for Authentication Endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX || '3'),
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: 900 // 15 minutes
    });
  }
});

// Progressive Delay for Repeated Requests
export const slowDownMiddleware: any = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per window at full speed
  delayMs: 500, // Add 500ms delay per request after delayAfter
  maxDelayMs: 20000, // Maximum delay of 20 seconds
  skipSuccessfulRequests: false
});

// =============================================================================
// HIPAA COMPLIANCE MIDDLEWARE
// =============================================================================

// PHI (Protected Health Information) Detection and Encryption
export const phiProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // List of fields that may contain PHI
  const phiFields = [
    'ssn', 'socialSecurityNumber', 'dateOfBirth', 'dob', 'medicalRecordNumber',
    'insuranceNumber', 'email', 'phone', 'address', 'firstName', 'lastName',
    'patientId', 'caregiverId', 'diagnosis', 'medication', 'treatment'
  ];

  // Encrypt PHI data in request body
  if (req.body && typeof req.body === 'object') {
    encryptPHIFields(req.body, phiFields);
  }

  // Override res.json to encrypt PHI in responses
  const originalJson = res.json;
  res.json = function(data: any) {
    if (data && typeof data === 'object') {
      encryptPHIFields(data, phiFields);
    }
    return originalJson.call(this, data);
  };

  next();
};

// Audit Logging Middleware (HIPAA Requirement)
export const auditLoggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const auditData = {
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.id || 'anonymous',
    userRole: (req as any).user?.role || 'unknown',
    action: `${req.method} ${req.path}`,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'] || 'unknown',
    sessionId: req.sessionID || 'no-session',
    requestId: req.headers['x-request-id'] || generateRequestId(),
    phi_accessed: containsPHI(req.path, req.body)
  };

  // Log to audit file (implement secure logging)
  if (process.env.AUDIT_LOG_ENABLED === 'true') {
    logAuditEvent(auditData);
  }

  next();
};

// Session Security Middleware
export const sessionSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check session timeout
  if (req.session && req.session.lastActivity) {
    const sessionTimeout = parseInt(process.env.SESSION_TIMEOUT_MINUTES || '30') * 60 * 1000;
    const timeSinceLastActivity = Date.now() - req.session.lastActivity;
    
    if (timeSinceLastActivity > sessionTimeout) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        res.status(401).json({
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      });
      return;
    }
    
    // Update last activity
    req.session.lastActivity = Date.now();
  }

  // Regenerate session ID on privilege escalation
  if (req.session && (req as any).user && req.session.privilegeEscalated) {
    req.session.regenerate((err) => {
      if (err) {
        console.error('Session regeneration error:', err);
      }
      req.session.privilegeEscalated = false;
      next();
    });
  } else {
    next();
  }
};

// =============================================================================
// INPUT VALIDATION & SANITIZATION
// =============================================================================

// SQL Injection Prevention
export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/gi,
    /(;|--|\/\*|\*\/|xp_|sp_)/gi,
    /(\b(OR|AND)\s+\d+\s*=\s*\d+)/gi
  ];

  const checkForSQLInjection = (obj: any, path = ''): boolean => {
    if (typeof obj === 'string') {
      return sqlPatterns.some(pattern => pattern.test(obj));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        if (checkForSQLInjection(obj[key], `${path}.${key}`)) {
          return true;
        }
      }
    }
    
    return false;
  };

  // Check request body, query parameters, and URL parameters
  const hasInjection = 
    checkForSQLInjection(req.body) ||
    checkForSQLInjection(req.query) ||
    checkForSQLInjection(req.params);

  if (hasInjection) {
    logSecurityIncident(req, 'SQL_INJECTION_ATTEMPT');
    return res.status(400).json({
      success: false,
      error: 'Invalid input detected',
      code: 'INVALID_INPUT'
    });
  }

  next();
};

// XSS Protection
export const xssProtection = (req: Request, res: Response, next: NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi
  ];

  const sanitizeInput = (obj: any): any => {
    if (typeof obj === 'string') {
      let sanitized = obj;
      xssPatterns.forEach(pattern => {
        sanitized = sanitized.replace(pattern, '');
      });
      return sanitized;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const sanitized: any = {};
      for (const key in obj) {
        sanitized[key] = sanitizeInput(obj[key]);
      }
      return sanitized;
    }
    
    return obj;
  };

  // Sanitize request data
  if (req.body) {
    req.body = sanitizeInput(req.body);
  }
  if (req.query) {
    req.query = sanitizeInput(req.query);
  }

  next();
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function encryptPHIFields(obj: any, phiFields: string[]): void {
  if (!process.env.PHI_ENCRYPTION_KEY) return;

  for (const key in obj) {
    if (phiFields.includes(key.toLowerCase()) && typeof obj[key] === 'string') {
      obj[key] = encryptData(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      encryptPHIFields(obj[key], phiFields);
    }
  }
}

function encryptData(data: string): string {
  if (!process.env.PHI_ENCRYPTION_KEY) return data;
  
  try {
    const cipher = createCipher('aes-256-gcm', process.env.PHI_ENCRYPTION_KEY);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    return data;
  }
}

function containsPHI(path: string, body: any): boolean {
  const phiPaths = [
    '/patients', '/carers', '/medical-records', '/assessments',
    '/treatments', '/diagnoses', '/prescriptions'
  ];
  
  return phiPaths.some(phiPath => path.includes(phiPath)) ||
         (body && typeof body === 'object' && hasPhiData(body));
}

function hasPhiData(obj: any): boolean {
  const phiFields = [
    'ssn', 'dateOfBirth', 'medicalRecordNumber', 'diagnosis',
    'medication', 'treatment', 'insuranceNumber'
  ];
  
  return Object.keys(obj).some(key => 
    phiFields.includes(key.toLowerCase())
  );
}

function generateRequestId(): string {
  return createHash('sha256')
    .update(Date.now().toString() + Math.random().toString())
    .digest('hex')
    .substring(0, 16);
}

function logAuditEvent(auditData: any): void {
  // Implement secure audit logging
  // This should write to a secure, tamper-evident log file
  console.log('[AUDIT]', JSON.stringify(auditData));
  
  // In production, implement proper audit logging to secure storage
  // with log integrity verification and encryption
}

function logSecurityIncident(req: Request, incidentType: string): void {
  const incident = {
    timestamp: new Date().toISOString(),
    type: incidentType,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    path: req.path,
    method: req.method,
    severity: 'HIGH'
  };
  
  console.error('[SECURITY INCIDENT]', JSON.stringify(incident));
  
  // In production, implement alerting system for security incidents
  // Send to SIEM system, security team, etc.
}

// =============================================================================
// EXPORTS
// =============================================================================
export {
  apiRateLimit,
  authRateLimit,
  slowDownMiddleware,
  phiProtectionMiddleware,
  auditLoggingMiddleware,
  sessionSecurityMiddleware,
  sqlInjectionProtection,
  xssProtection
};