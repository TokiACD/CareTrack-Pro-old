import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import session from 'express-session'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import { validateSecurityConfig, SESSION_CONFIG, API_CONFIG, DATABASE_CONFIG } from './config/security'
import {
  enhancedSecurityHeaders,
  csrfProtection,
  generateCSRFToken,
  adaptiveRateLimit,
  authRateLimit,
  progressiveDelay,
  phiProtectionMiddleware,
  enhancedInputValidation,
  enhancedSessionSecurity,
  comprehensiveAuditLogging
} from './middleware/enhancedSecurity'

import { enhancedErrorHandler } from './middleware/errorSanitization'
import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
import JobInitializer from './jobs/JobInitializer'
import { authRoutes } from './routes/authRoutes'
import invitationRoutes from './routes/invitationRoutes'
import { usersRouter } from './routes/users'
import { adminUserRoutes } from './routes/adminUserRoutes'
import { carerRoutes } from './routes/carerRoutes'
import { carePackageRoutes } from './routes/carePackageRoutes'
import { taskRoutes } from './routes/taskRoutes'
import { assignmentRoutes } from './routes/assignmentRoutes'
import { assessmentRoutes } from './routes/assessmentRoutes'
import { progressRoutes } from './routes/progressRoutes'
import { shiftRoutes } from './routes/shiftRoutes'
import { shiftSenderRoutes } from './routes/shiftSenderRoutes'
import { carerShiftRoutes } from './routes/carerShiftRoutes'
import { carerDashboardRoutes } from './routes/carerDashboardRoutes'
import { carerProgressRoutes } from './routes/carerProgressRoutes'
import { rotaRoutes } from './routes/rotaRoutes'
import { recycleBinRoutes } from './routes/recycleBinRoutes'
import { auditRoutes } from './routes/auditRoutes'
import { enhancedAuditRoutes } from './routes/enhancedAuditRoutes'
import { dashboardRoutes } from './routes/dashboardRoutes'
import { emailChangeRoutes } from './routes/emailChangeRoutes'
import { confirmedShiftsRoutes } from './routes/confirmedShiftsRoutes'
import { emailQueueRoutes } from './routes/emailQueueRoutes'
import { schedulerService } from './services/schedulerService'

// Initialize Prisma Client with enhanced security and performance
let prismaInstance: PrismaClient | null = null

export const prisma = (() => {
  if (!prismaInstance) {
    prismaInstance = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL
        }
      },
      // Enhanced connection pool configuration for security and performance
      __internal: {
        engine: {
          // Connection pool configuration from security config
          connection_limit: DATABASE_CONFIG.CONNECTION_LIMIT,
          pool_timeout: DATABASE_CONFIG.ACQUIRE_TIMEOUT,
          socket_timeout: DATABASE_CONFIG.TIMEOUT
        }
      }
    })
  }
  return prismaInstance
})()

// Performance monitoring - only log very slow queries (>2s) to reduce overhead
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 2000) { // Only log very slow queries (>2s)
      console.warn(`🐌 Very slow query detected: ${e.duration}ms - ${e.query.substring(0, 100)}...`)
    }
  })
}

// Validate security configuration
validateSecurityConfig();

// Initialize Express app
const app = express()

// Environment variables
const PORT = process.env.PORT || 5001  // Default to 5001 to match development setup
const NODE_ENV = process.env.NODE_ENV || 'development'

// Trust proxy for production deployments
if (API_CONFIG.TRUST_PROXY && NODE_ENV === 'production') {
  app.set('trust proxy', 1)
}

// Optimized rate limiting for better performance
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '2000'), // Increased limit
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Skip counting successful requests for performance
  // Simplified key generator for better performance
  keyGenerator: (req) => {
    return req.ip // Just use IP for simplicity and speed
  },
  skip: (req) => {
    // Skip rate limiting for health checks and other fast endpoints
    return req.path === '/health' || req.path === '/api/csrf-token'
  }
})

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs for auth
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Enhanced Security Middleware
app.use(enhancedSecurityHeaders)

app.use(cors({
  origin: [
    'http://localhost:5000',  // Vite dev server
    'http://localhost:3000',  // Legacy/backup
    'http://localhost:3001',  // Legacy/backup
    'http://localhost:3002',  // Legacy/backup
    'http://localhost:3003',  // Legacy/backup
    process.env.FRONTEND_URL
  ].filter((url): url is string => Boolean(url)),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'x-request-id'],
  exposedHeaders: ['x-csrf-token']
}))

// Session configuration
app.use(session({
  secret: SESSION_CONFIG.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: SESSION_CONFIG.SECURE,
    httpOnly: SESSION_CONFIG.HTTP_ONLY,
    maxAge: SESSION_CONFIG.TIMEOUT_MS,
    sameSite: SESSION_CONFIG.SAME_SITE
  },
  name: 'caretrack.sid' // Custom session name
}))

// Enhanced compression with better settings
app.use(compression({
  filter: (req, res) => {
    // Don't compress responses with this request header
    if (req.headers['x-no-compression']) {
      return false
    }
    // Use compression filter function
    return compression.filter(req, res)
  },
  level: 6, // Good balance of compression vs CPU
  threshold: 1024, // Only compress if response is larger than 1KB
  memLevel: 8 // Memory level for zlib
}))
app.use(express.json({ 
  limit: API_CONFIG.MAX_REQUEST_SIZE,
  // Reviver function for better JSON parsing performance
  reviver: (key, value) => {
    // Handle date strings if needed
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return new Date(value)
    }
    return value
  }
}))
app.use(express.urlencoded({ 
  extended: true, 
  limit: API_CONFIG.MAX_REQUEST_SIZE,
  parameterLimit: API_CONFIG.PARAMETER_LIMIT
}))

// Enhanced security middleware stack
app.use(comprehensiveAuditLogging)
app.use(enhancedInputValidation)
app.use(phiProtectionMiddleware)
app.use(enhancedSessionSecurity)

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// CSRF Protection - optimized for performance
app.get('/api/csrf-token', generateCSRFToken) // Fast path for token generation
app.use('/api', (req, res, next) => {
  // Skip CSRF for GET requests and token endpoint to improve performance
  if (req.method === 'GET' || req.path === '/csrf-token') {
    return next();
  }
  return csrfProtection(req, res, next);
})

// Apply rate limiting with performance optimizations
app.use('/api/auth', (req, res, next) => {
  // Only apply strict rate limiting to login attempts
  if (req.path.includes('/login') && req.method === 'POST') {
    return authRateLimit(req, res, next)
  }
  next()
}, progressiveDelay)
app.use('/api', (req, res, next) => {
  // Skip rate limiting for frequent GET requests
  if (req.method === 'GET' && (req.path.includes('/verify') || req.path.includes('/csrf-token'))) {
    return next()
  }
  return adaptiveRateLimit(req, res, next)
})

// Enhanced health check endpoint with comprehensive system monitoring
app.get('/health', async (req, res) => {
  const startTime = Date.now()
  
  try {
    // Test database connectivity with timing
    const dbStart = Date.now()
    await prisma.$queryRaw`SELECT 1 as health`
    const dbTime = Date.now() - dbStart
    
    // Check job system status if initialized
    let jobSystemStatus = 'not-initialized'
    let jobSystemDetails = {}
    if (JobInitializer.isInitialized()) {
      const systemStatus = await JobInitializer.getSystemStatus()
      jobSystemStatus = systemStatus.healthy ? 'healthy' : 'unhealthy'
      jobSystemDetails = {
        redis: systemStatus.redis?.healthy ? 'connected' : 'disconnected',
        queues: systemStatus.jobProcessor?.queueCount || 0,
        workers: systemStatus.jobProcessor?.workerCount || 0
      }
    }
    
    // Memory usage
    const memUsage = process.memoryUsage()
    
    // Response timing
    const responseTime = Date.now() - startTime
    
    res.json({
      success: true,
      message: 'CareTrack Pro API is running',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      uptime: Math.floor(process.uptime()),
      performance: {
        responseTime: `${responseTime}ms`,
        databaseTime: `${dbTime}ms`,
        memory: {
          used: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          total: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        }
      },
      services: {
        database: { status: 'connected', responseTime: `${dbTime}ms` },
        jobSystem: { status: jobSystemStatus, ...jobSystemDetails },
        redis: jobSystemDetails.redis || 'unknown'
      },
      version: process.env.npm_package_version || '1.0.0'
    })
  } catch (error) {
    const responseTime = Date.now() - startTime
    res.status(503).json({
      success: false,
      message: 'Service unavailable - health check failed',
      timestamp: new Date().toISOString(),
      environment: NODE_ENV,
      performance: {
        responseTime: `${responseTime}ms`
      },
      services: {
        database: { status: 'error', error: error instanceof Error ? error.message : 'Unknown error' },
        jobSystem: { status: 'error' },
        redis: 'error'
      }
    })
  }
})

// Job system status endpoint (development only)
if (NODE_ENV === 'development') {
  app.get('/job-status', async (req, res) => {
    try {
      const systemStatus = await JobInitializer.getSystemStatus()
      res.json({
        success: true,
        data: systemStatus
      })
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}

// Performance metrics endpoint (development only)
if (NODE_ENV === 'development') {
  app.get('/metrics', async (req, res) => {
    const memoryUsage = process.memoryUsage()
    const uptime = process.uptime()
    
    res.json({
      success: true,
      data: {
        uptime: uptime,
        memory: {
          rss: Math.round(memoryUsage.rss / 1024 / 1024) + ' MB',
          heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + ' MB',
          heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + ' MB',
          external: Math.round(memoryUsage.external / 1024 / 1024) + ' MB',
        },
        nodeVersion: process.version,
        platform: process.platform
      }
    })
  })
}

// API Routes
app.use('/api/auth', authRoutes)
app.use('/api/invitations', invitationRoutes)
app.use('/api/users', usersRouter)
app.use('/api/admin-users', adminUserRoutes)
app.use('/api/carers', carerRoutes)
app.use('/api/care-packages', carePackageRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/assignments', assignmentRoutes)
app.use('/api/assessments', assessmentRoutes)
app.use('/api/progress', progressRoutes)
app.use('/api/shifts', shiftRoutes)
app.use('/api/shift-sender', shiftSenderRoutes)
app.use('/api/carer-shifts', carerShiftRoutes)
app.use('/api/carer-dashboard', carerDashboardRoutes)
app.use('/api/carer-progress', carerProgressRoutes)
app.use('/api/rota', rotaRoutes)
app.use('/api/recycle-bin', recycleBinRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/enhanced-audit', enhancedAuditRoutes)
app.use('/api/dashboard', dashboardRoutes)
app.use('/api/email-change', emailChangeRoutes)
app.use('/api/confirmed-shifts', confirmedShiftsRoutes)
app.use('/api/email-queue', emailQueueRoutes)

// Serve frontend static files in production with enhanced security
if (NODE_ENV === 'production') {
  // Secure static file serving with path sanitization
  app.use(express.static(path.join(__dirname, '../../client/dist'), {
    // Security options
    dotfiles: 'deny', // Deny access to dotfiles
    etag: API_CONFIG.ENABLE_ETAG,
    extensions: ['html', 'js', 'css', 'png', 'jpg', 'jpeg', 'gif', 'ico', 'svg', 'woff', 'woff2'],
    index: ['index.html'],
    maxAge: '1h', // Cache for 1 hour
    redirect: false,
    // Custom setHeaders for security
    setHeaders: (res, filePath) => {
      // Prevent MIME type sniffing
      res.setHeader('X-Content-Type-Options', 'nosniff')
      
      // Prevent caching of sensitive files
      if (path.basename(filePath) === 'index.html') {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
        res.setHeader('Pragma', 'no-cache')
        res.setHeader('Expires', '0')
      }
      
      // Add Content Security Policy
      if (filePath.endsWith('.html')) {
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:;")
      }
    },
    // Fallback function for security
    fallthrough: false
  }))
  
  // Secure catch-all handler with path validation
  app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, '../../client/dist/index.html')
    
    // Validate that the requested path is safe
    const sanitizedPath = path.normalize(req.path)
    if (sanitizedPath.includes('..') || sanitizedPath.includes('~')) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        code: 'INVALID_PATH'
      })
    }
    
    // Send index.html with security headers
    res.sendFile(indexPath, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    }, (err) => {
      if (err) {
        console.error('Error serving index.html:', err)
        res.status(500).json({
          success: false,
          error: 'Internal server error',
          code: 'SERVER_ERROR'
        })
      }
    })
  })
} else {
  // In development, redirect invitation URLs to frontend
  app.get('/invitation/accept', (req, res) => {
    const { token } = req.query
    if (token) {
      res.redirect(`${process.env.FRONTEND_URL}/invitation/accept?token=${token}`)
    } else {
      res.redirect(process.env.FRONTEND_URL || 'http://localhost:3001')
    }
  })
}

// Enhanced Error handlers (must be last)
app.use(notFoundHandler)
app.use(enhancedErrorHandler) // Use enhanced error handler
app.use(errorHandler) // Fallback

// Graceful shutdown with job system cleanup
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  
  // Shutdown job system first
  if (JobInitializer.isInitialized()) {
    console.log('🔄 Shutting down job processing system...')
    await JobInitializer.shutdown()
  }
  
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  
  // Shutdown job system first
  if (JobInitializer.isInitialized()) {
    console.log('🔄 Shutting down job processing system...')
    await JobInitializer.shutdown()
  }
  
  await prisma.$disconnect()
  process.exit(0)
})

// Enhanced environment variable validation
function validateEnvironmentVariables() {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET']
  const missingVars = requiredVars.filter(varName => !process.env[varName])
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars)
    throw new Error(`Missing environment variables: ${missingVars.join(', ')}`)
  }
  
  // Validate JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long')
  }
  
  console.log('✅ Environment variables validated')
}

// Start server with enhanced security validation
async function startServer() {
  try {
    // Validate environment variables first
    validateEnvironmentVariables()
    
    // Test database connection with timeout
    console.log('🔍 Testing database connection...')
    await Promise.race([
      prisma.$connect(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 10000)
      )
    ])
    console.log('✅ Database connection established')

    // Validate database integrity
    await prisma.$queryRaw`SELECT 1 as health`
    console.log('✅ Database health check passed')

    // Initialize job processing system
    console.log('🔄 Initializing job processing system...')
    try {
      await JobInitializer.initialize()
      console.log('✅ Job processing system ready')
    } catch (jobError) {
      console.warn('⚠️  Job processing system failed to initialize:', jobError)
      console.warn('⚠️  Server will continue without background job processing')
      console.warn('⚠️  Email operations will fall back to synchronous processing')
    }

    // Initialize scheduler service for automated tasks
    console.log('⏰ Initializing scheduler service...')
    try {
      schedulerService.init()
      console.log('✅ Scheduler service ready')
    } catch (schedulerError) {
      console.warn('⚠️  Scheduler service failed to initialize:', schedulerError)
      console.warn('⚠️  Automated cleanup and notifications will not work')
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📊 Environment: ${NODE_ENV}`)
      console.log(`🔍 Health check: http://localhost:${PORT}/health`)
      console.log(`🛡️  Security configuration: Enhanced`)
      console.log(`🔒 Database connection pool: ${DATABASE_CONFIG.CONNECTION_LIMIT} connections`)
      
      if (NODE_ENV === 'development') {
        console.log(`📘 Prisma Studio: npx prisma studio`)
        console.log(`📊 Metrics: http://localhost:${PORT}/metrics`)
        console.log(`🔧 Job Status: http://localhost:${PORT}/job-status`)
      }
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    
    // Cleanup on startup failure
    try {
      await prisma.$disconnect()
      
      // Cleanup job system if it was initialized
      if (JobInitializer.isInitialized()) {
        await JobInitializer.shutdown()
      }
    } catch (disconnectError) {
      console.error('Error during cleanup:', disconnectError)
    }
    
    process.exit(1)
  }
}

startServer()