/**
 * Enhanced Security Middleware Suite
 * Healthcare-grade security with HIPAA compliance
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import helmet from 'helmet';
import validator from 'validator';
import { createHash, randomBytes, createCipheriv, createDecipheriv } from 'crypto';
import {
  JWT_CONFIG,
  PASSWORD_CONFIG,
  ENCRYPTION_CONFIG,
  RATE_LIMIT_CONFIG,
  CSRF_CONFIG,
  CSP_CONFIG,
  HIPAA_CONFIG,
  SECURITY_HEADERS,
  FILE_UPLOAD_CONFIG,
  AUDIT_CONFIG
} from '../config/security';

// =============================================================================
// ENHANCED HELMET CONFIGURATION
// =============================================================================

const enhancedSecurityHeaders = helmet({
  contentSecurityPolicy: {
    directives: CSP_CONFIG,
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false, // May interfere with medical integrations
  crossOriginOpenerPolicy: { policy: 'same-origin' },
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  hidePoweredBy: true
});

// =============================================================================
// CSRF PROTECTION
// =============================================================================

interface CSRFTokenData {
  token: string;
  expires: number;
  sessionId?: string;
  userId?: string;
  used: boolean;
}

const csrfTokens = new Map<string, CSRFTokenData>();

const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  // Skip CSRF for safe methods, API keys, and the CSRF token endpoint itself
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method) || 
      req.headers['x-api-key'] ||
      req.path === '/csrf-token' ||
      req.path === '/api/csrf-token') {
    return next();
  }

  const token = req.headers[CSRF_CONFIG.HEADER_NAME] as string || 
                req.body._csrf || 
                req.query._csrf;

  console.log('🔒 [CSRF-DEBUG] CSRF Protection Check', {
    method: req.method,
    path: req.path,
    tokenPresent: !!token,
    tokenSource: token ? (req.headers[CSRF_CONFIG.HEADER_NAME] ? 'header' : req.body._csrf ? 'body' : 'query') : 'none',
    tokenLength: token ? token.length : 0,
    activeTokens: csrfTokens.size,
    timestamp: new Date().toISOString()
  });

  if (!token) {
    console.log('❌ [CSRF-DEBUG] CSRF token missing');
    return res.status(403).json({
      success: false,
      error: 'CSRF token missing',
      code: 'CSRF_TOKEN_MISSING'
    });
  }

  const tokenData = csrfTokens.get(token);
  
  if (!tokenData || tokenData.expires < Date.now() || tokenData.used) {
    console.log('❌ [CSRF-DEBUG] CSRF token invalid, expired, or already used', {
      tokenFound: !!tokenData,
      expired: tokenData ? tokenData.expires < Date.now() : false,
      used: tokenData ? tokenData.used : false,
      expiresAt: tokenData ? new Date(tokenData.expires).toISOString() : 'N/A',
      now: new Date().toISOString()
    });
    
    // Clean up expired or used token if found
    if (tokenData && (tokenData.expires < Date.now() || tokenData.used)) {
      csrfTokens.delete(token);
    }
    
    return res.status(403).json({
      success: false,
      error: 'CSRF token invalid, expired, or already used',
      code: 'CSRF_TOKEN_INVALID'
    });
  }

  // Check session binding if available (relaxed for development)
  const sessionId = req.session?.id || req.sessionID;
  const userId = req.user?.id;
  
  // Only enforce strict session binding in production with proper session store
  const shouldEnforceSessionBinding = process.env.NODE_ENV === 'production' && 
                                     process.env.REDIS_SESSION_STORE === 'true';
  
  if (shouldEnforceSessionBinding && tokenData.sessionId && sessionId && 
      tokenData.sessionId !== sessionId) {
    console.log('❌ [CSRF-DEBUG] CSRF token session mismatch', {
      tokenSessionId: tokenData.sessionId,
      requestSessionId: sessionId,
      environment: process.env.NODE_ENV
    });
    
    return res.status(403).json({
      success: false,
      error: 'CSRF token session mismatch',
      code: 'CSRF_SESSION_MISMATCH'
    });
  }
  
  // Log session info for debugging in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🔍 [CSRF-DEBUG] Session binding check', {
      tokenSessionId: tokenData.sessionId,
      requestSessionId: sessionId,
      enforcingBinding: shouldEnforceSessionBinding,
      environment: process.env.NODE_ENV
    });
  }

  console.log('✅ [CSRF-DEBUG] CSRF token validation passed');
  
  // Mark token as used (one-time use)
  tokenData.used = true;
  
  next();
};

// Generate CSRF token endpoint
const generateCSRFToken = (req: Request, res: Response) => {
  const token = randomBytes(CSRF_CONFIG.TOKEN_LENGTH).toString('hex');
  const expires = Date.now() + CSRF_CONFIG.MAX_AGE * 1000;
  
  // Get session and user information for binding
  const sessionId = req.session?.id || req.sessionID;
  const userId = req.user?.id;
  
  // In development, be more lenient with session binding
  const shouldBindToSession = process.env.NODE_ENV === 'production' && 
                              process.env.REDIS_SESSION_STORE === 'true';
  
  csrfTokens.set(token, {
    token,
    expires,
    sessionId: shouldBindToSession ? sessionId : undefined,
    userId: userId || undefined,
    used: false
  });

  // Clean up expired tokens
  let cleanedCount = 0;
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires < Date.now()) {
      csrfTokens.delete(key);
      cleanedCount++;
    }
  }

  console.log('🔑 [CSRF-DEBUG] Generated new CSRF token', {
    tokenLength: token.length,
    expiresAt: new Date(expires).toISOString(),
    activeTokens: csrfTokens.size,
    cleanedExpiredTokens: cleanedCount,
    cookieName: CSRF_CONFIG.COOKIE_NAME,
    secure: CSRF_CONFIG.SECURE,
    sessionBinding: shouldBindToSession,
    sessionId: shouldBindToSession ? sessionId : 'not-bound',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });

  res.cookie(CSRF_CONFIG.COOKIE_NAME, token, {
    httpOnly: true,
    secure: CSRF_CONFIG.SECURE,
    sameSite: CSRF_CONFIG.SAME_SITE,
    maxAge: CSRF_CONFIG.MAX_AGE * 1000
  });

  res.json({ success: true, token });
};

// =============================================================================
// ENHANCED RATE LIMITING
// =============================================================================

// Adaptive rate limiting based on user behavior
const adaptiveRateLimit = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.GENERAL.WINDOW_MS,
  max: (req) => {
    // Higher limits for authenticated users
    if ((req as any).user) {
      return RATE_LIMIT_CONFIG.GENERAL.MAX_REQUESTS * 2;
    }
    return RATE_LIMIT_CONFIG.GENERAL.MAX_REQUESTS;
  },
  message: {
    success: false,
    error: 'Too many requests from this IP',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use combination of IP, User-Agent, and user ID for better tracking
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userId = (req as any).user?.id || 'anonymous';
    return `${req.ip}:${createHash('md5').update(userAgent).digest('hex').substring(0, 8)}:${userId}`;
  },
  handler: (req, res) => {
    // Log rate limit violations for security monitoring
    logSecurityEvent(req, 'RATE_LIMIT_EXCEEDED', 'HIGH');
    
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.GENERAL.WINDOW_MS / 1000)
    });
  }
});

// Strict rate limiting for authentication endpoints
const authRateLimit = rateLimit({
  windowMs: RATE_LIMIT_CONFIG.AUTH.WINDOW_MS,
  max: RATE_LIMIT_CONFIG.AUTH.MAX_REQUESTS,
  skipSuccessfulRequests: false, // Count all attempts
  keyGenerator: (req) => req.ip + ':' + req.url,
  handler: (req, res) => {
    logSecurityEvent(req, 'AUTH_RATE_LIMIT_EXCEEDED', 'CRITICAL');
    
    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(RATE_LIMIT_CONFIG.AUTH.WINDOW_MS / 1000)
    });
  }
});

// Progressive delay for repeated requests
const progressiveDelay: any = slowDown({
  windowMs: RATE_LIMIT_CONFIG.AUTH.WINDOW_MS,
  delayAfter: 2,
  delayMs: () => 1000, // Updated for express-slow-down v2
  maxDelayMs: RATE_LIMIT_CONFIG.AUTH.MAX_DELAY_MS,
  skipSuccessfulRequests: false,
  validate: { delayMs: false } // Disable the warning
});

// =============================================================================
// ENHANCED PHI PROTECTION
// =============================================================================

class PHIProtection {
  private static encryptionKey = Buffer.from(ENCRYPTION_CONFIG.PHI_ENCRYPTION_KEY, 'hex');

  static encrypt(data: string): string {
    try {
      const iv = randomBytes(ENCRYPTION_CONFIG.IV_LENGTH);
      const cipher = createCipheriv(ENCRYPTION_CONFIG.ALGORITHM, this.encryptionKey, iv);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Return IV + encrypted data + tag
      return iv.toString('hex') + ':' + encrypted + ':' + tag.toString('hex');
    } catch (error) {
      console.error('PHI encryption error:', error);
      throw new Error('Failed to encrypt sensitive data');
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'hex');
      const encrypted = parts[1];
      const tag = Buffer.from(parts[2], 'hex');

      const decipher = createDecipheriv(ENCRYPTION_CONFIG.ALGORITHM, this.encryptionKey, iv);
      decipher.setAuthTag(tag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      console.error('PHI decryption error:', error);
      throw new Error('Failed to decrypt sensitive data');
    }
  }

  static isPHIField(fieldName: string): boolean {
    return HIPAA_CONFIG.PHI_FIELDS.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }

  static maskPHI(data: any): any {
    if (typeof data === 'string' && data.length > 4) {
      return data.substring(0, 2) + '*'.repeat(data.length - 4) + data.substring(data.length - 2);
    }
    return '***';
  }
}

// PHI Protection Middleware
const phiProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Skip PHI encryption for authentication, public endpoints, and invitation endpoints
  const isAuthEndpoint = req.path.includes('/auth/') || 
                         req.path.includes('/login') || 
                         req.path.includes('/reset-password') || 
                         req.path.includes('/forgot-password') ||
                         req.path.includes('/invitations/') ||
                         req.path === '/api/csrf-token' ||
                         req.path === '/health' ||
                         req.path === '/metrics';
  
  // Encrypt PHI fields in request body (skip for auth endpoints)
  if (!isAuthEndpoint && req.body && typeof req.body === 'object') {
    encryptPHIFields(req.body);
  }

  // Override res.json to handle PHI in responses
  const originalJson = res.json;
  res.json = function(data: any) {
    if (data && typeof data === 'object') {
      // Only decrypt for authorized access
      if ((req as any).user && hasPhiAccess(req)) {
        decryptPHIFields(data);
      } else {
        maskPHIFields(data);
      }
    }
    return originalJson.call(this, data);
  };

  next();
};

function encryptPHIFields(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (PHIProtection.isPHIField(key) && typeof obj[key] === 'string') {
      obj[key] = PHIProtection.encrypt(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      encryptPHIFields(obj[key]);
    }
  }
}

function decryptPHIFields(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (PHIProtection.isPHIField(key) && typeof obj[key] === 'string') {
      try {
        obj[key] = PHIProtection.decrypt(obj[key]);
      } catch (error) {
        // If decryption fails, it might not be encrypted data
        console.warn(`Failed to decrypt field ${key}:`, error);
      }
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      decryptPHIFields(obj[key]);
    }
  }
}

function maskPHIFields(obj: any): void {
  if (!obj || typeof obj !== 'object') return;

  for (const key in obj) {
    if (PHIProtection.isPHIField(key)) {
      obj[key] = PHIProtection.maskPHI(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      maskPHIFields(obj[key]);
    }
  }
}

function hasPhiAccess(req: Request): boolean {
  const user = (req as any).user;
  return user && (user.role === 'admin' || user.phiAccess === true);
}

// =============================================================================
// ENHANCED INPUT VALIDATION
// =============================================================================

const enhancedInputValidation = (req: Request, res: Response, next: NextFunction) => {
  // Skip input validation for public endpoints and invitation endpoints (they have their own validation)
  const isPublicEndpoint = req.path === '/api/csrf-token' || 
                          req.path.includes('/api/auth/') || 
                          req.path.includes('/api/invitations/') ||
                          req.path === '/health' ||
                          req.path === '/metrics';
  
  if (isPublicEndpoint) {
    return next();
  }
  
  const errors: string[] = [];

  // Validate request structure
  if (req.body && Object.keys(req.body).length > 50) {
    errors.push('Request body has too many fields');
  }

  // Optimized suspicious patterns - reduced to most critical for performance
  const suspiciousPatterns = [
    // Critical SQL Injection patterns only
    /(\b(DROP|DELETE|EXEC|UNION)\b)/gi,
    /(;--|\*\/)/gi,
    // Critical XSS patterns only
    /<script[\s\S]*?>/gi,
    /javascript:/gi,
    // Path traversal
    /\.\.\//gi
  ];

  const validateObject = (obj: any, path = ''): void => {
    if (typeof obj === 'string') {
      // Check string length
      if (obj.length > 10000) {
        errors.push(`Field ${path} is too long`);
        return;
      }

      // Check for suspicious patterns
      for (const pattern of suspiciousPatterns) {
        if (pattern.test(obj)) {
          errors.push(`Suspicious content detected in ${path}`);
          logSecurityEvent(req, 'SUSPICIOUS_INPUT_DETECTED', 'HIGH', {
            field: path,
            pattern: pattern.toString(),
            value: obj.substring(0, 100) // Log first 100 chars only
          });
          return;
        }
      }

      // Validate common field types
      if (path.includes('email') && !validator.isEmail(obj)) {
        errors.push(`Invalid email format in ${path}`);
      }
      // Phone validation removed - field not in schema
      // if (path.includes('phone') && !validator.isMobilePhone(obj, 'any', { strictMode: false })) {
      //   errors.push(`Invalid phone format in ${path}`);
      // }
      if (path.includes('url') && !validator.isURL(obj, { require_protocol: true })) {
        errors.push(`Invalid URL format in ${path}`);
      }
    } else if (typeof obj === 'object' && obj !== null) {
      for (const key in obj) {
        // Check key names for suspicious characters
        if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
          errors.push(`Invalid field name: ${key}`);
          continue;
        }
        validateObject(obj[key], `${path}.${key}`);
      }
    }
  };

  // Validate all request data
  validateObject(req.body, 'body');
  validateObject(req.query, 'query');
  validateObject(req.params, 'params');

  if (errors.length > 0) {
    logSecurityEvent(req, 'INPUT_VALIDATION_FAILED', 'MEDIUM', { errors });
    return res.status(400).json({
      success: false,
      error: 'Invalid input data',
      code: 'INVALID_INPUT',
      details: process.env.NODE_ENV === 'development' ? errors : undefined
    });
  }

  next();
};

// =============================================================================
// ENHANCED SESSION SECURITY
// =============================================================================

const enhancedSessionSecurity = (req: Request, res: Response, next: NextFunction) => {
  // Skip session security for public endpoints
  const isPublicEndpoint = req.path === '/api/csrf-token' || 
                          req.path.includes('/api/auth/') || 
                          req.path === '/health' ||
                          req.path === '/metrics';
  
  if (isPublicEndpoint) {
    return next();
  }
  
  // Session timeout check
  if (req.session && req.session.lastActivity) {
    const timeSinceLastActivity = Date.now() - req.session.lastActivity;
    const sessionTimeout = HIPAA_CONFIG.AUTO_LOGOFF_MINUTES * 60 * 1000;

    if (timeSinceLastActivity > sessionTimeout) {
      logSecurityEvent(req, 'SESSION_TIMEOUT', 'INFO');
      
      return req.session.destroy((err) => {
        if (err) {
          console.error('Session destruction error:', err);
        }
        res.status(401).json({
          success: false,
          error: 'Session expired',
          code: 'SESSION_EXPIRED'
        });
      });
    }

    // Update last activity
    req.session.lastActivity = Date.now();
  }

  // Session hijacking protection (less aggressive for authenticated users)
  const currentFingerprint = createSessionFingerprint(req);
  if (req.session?.fingerprint && req.session.fingerprint !== currentFingerprint) {
    // For authenticated users with JWT tokens, log but don't block (they have additional security)
    const hasJWTToken = req.headers.authorization?.startsWith('Bearer ');
    // FIXED: Correct SSE route path detection
    const hasSSEToken = (req.path === '/api/notifications/stream' || req.path === '/notifications/stream') && req.query.token;
    const isCSRFEndpoint = req.path === '/csrf-token' || req.path === '/api/csrf-token';
    const isInvitationEndpoint = req.path.includes('/invitations/accept') || req.path.includes('/invitations/decline');
    // ADDED: SSE-specific route patterns
    const isSSEEndpoint = req.path.includes('/notifications/stream') || req.path.includes('/api/notifications');
    
    if (hasJWTToken || hasSSEToken || isCSRFEndpoint || isInvitationEndpoint || isSSEEndpoint) {
      // Log suspicious activity but allow the request through for authenticated endpoints
      logSecurityEvent(req, 'SESSION_FINGERPRINT_MISMATCH', 'WARNING', {
        hasJWTToken,
        hasSSEToken,
        isSSEEndpoint,
        path: req.path,
        reason: 'Allowing authenticated endpoint with session fingerprint mismatch'
      });
      // Update fingerprint for future requests
      req.session.fingerprint = currentFingerprint;
    } else {
      // For unauthenticated users, maintain strict checking
      logSecurityEvent(req, 'SESSION_HIJACK_ATTEMPT', 'CRITICAL', {
        path: req.path,
        fingerprint: currentFingerprint,
        sessionFingerprint: req.session.fingerprint
      });
      
      return req.session.destroy((err) => {
        res.status(401).json({
          success: false,
          error: 'Session security violation',
          code: 'SESSION_INVALID'
        });
      });
    }
  }

  // Set or update session fingerprint
  if (req.session) {
    req.session.fingerprint = currentFingerprint;
  }

  next();
};

function createSessionFingerprint(req: Request): string {
  // Use more stable identifiers that don't change on refresh
  const components = [
    req.ip,
    req.headers['user-agent'] || ''
    // Removed accept-language and accept-encoding as they can vary on refresh
  ].join('|');

  return createHash('sha256').update(components).digest('hex');
}

// =============================================================================
// COMPREHENSIVE AUDIT LOGGING
// =============================================================================

interface SecurityEvent {
  timestamp: string;
  eventType: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  userId?: string;
  userRole?: string;
  ipAddress: string;
  userAgent: string;
  requestId: string;
  sessionId?: string;
  path: string;
  method: string;
  additionalData?: any;
}

const comprehensiveAuditLogging = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = randomBytes(16).toString('hex');
  
  // Add request ID to headers
  req.headers['x-request-id'] = requestId;

  // Log request
  const auditEvent: SecurityEvent = {
    timestamp: new Date().toISOString(),
    eventType: 'REQUEST',
    severity: 'LOW',
    userId: (req as any).user?.id,
    userRole: (req as any).user?.role,
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    requestId,
    sessionId: req.sessionID,
    path: req.path,
    method: req.method,
    additionalData: {
      containsPHI: containsPHI(req.path, req.body),
      queryParams: Object.keys(req.query),
      bodySize: JSON.stringify(req.body || {}).length
    }
  };

  logSecurityEvent(req, 'REQUEST', 'LOW', auditEvent.additionalData);

  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk?: any, encoding?: any) {
    const duration = Date.now() - startTime;
    
    logSecurityEvent(req, 'RESPONSE', 'LOW', {
      statusCode: res.statusCode,
      duration,
      responseSize: res.get('content-length') || 0
    });

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

// =============================================================================
// SECURITY EVENT LOGGING
// =============================================================================

function logSecurityEvent(
  req: Request,
  eventType: string,
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL',
  additionalData?: any
): void {
  const event: SecurityEvent = {
    timestamp: new Date().toISOString(),
    eventType,
    severity,
    userId: (req as any).user?.id || 'anonymous',
    userRole: (req as any).user?.role || 'unknown',
    ipAddress: req.ip || 'unknown',
    userAgent: req.headers['user-agent'] || 'unknown',
    requestId: req.headers['x-request-id'] as string || 'unknown',
    sessionId: req.sessionID,
    path: req.path,
    method: req.method,
    additionalData
  };

  // Log to console (replace with proper logging system)
  console.log('[SECURITY EVENT]', JSON.stringify(event));

  // In production, send to SIEM system, security monitoring, etc.
  if (process.env.NODE_ENV === 'production') {
    // Send to external monitoring system
    sendToSecurityMonitoring(event);
  }

  // Alert on critical events
  if (severity === 'CRITICAL') {
    sendSecurityAlert(event);
  }
}

function containsPHI(path: string, body: any): boolean {
  const phiPaths = ['/carers', '/patients', '/assessments', '/medical-records'];
  const pathContainsPhi = phiPaths.some(phiPath => path.includes(phiPath));
  
  if (body && typeof body === 'object') {
    const bodyContainsPhi = Object.keys(body).some(key => 
      PHIProtection.isPHIField(key)
    );
    return pathContainsPhi || bodyContainsPhi;
  }

  return pathContainsPhi;
}

async function sendToSecurityMonitoring(event: SecurityEvent): Promise<void> {
  // Implement integration with security monitoring system
  // This could be Splunk, ELK Stack, DataDog, etc.
  try {
    // Example: Send to webhook endpoint
    if (process.env.SECURITY_WEBHOOK_URL) {
      // Implementation would go here
    }
  } catch (error) {
    console.error('Failed to send security event to monitoring system:', error);
  }
}

async function sendSecurityAlert(event: SecurityEvent): Promise<void> {
  // Implement critical security alerting
  try {
    if (process.env.SECURITY_ALERT_EMAIL) {
      // Send email alert
    }
    if (process.env.SECURITY_ALERT_SLACK) {
      // Send Slack notification
    }
    if (process.env.SECURITY_ALERT_SMS) {
      // Send SMS alert for critical events
    }
  } catch (error) {
    console.error('Failed to send security alert:', error);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  enhancedSecurityHeaders,
  csrfProtection,
  generateCSRFToken,
  adaptiveRateLimit,
  authRateLimit,
  progressiveDelay,
  phiProtectionMiddleware,
  enhancedInputValidation,
  enhancedSessionSecurity,
  comprehensiveAuditLogging,
  PHIProtection
};