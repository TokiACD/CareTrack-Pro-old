import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'
import rateLimit from 'express-rate-limit'
import { PrismaClient } from '@prisma/client'

import { errorHandler } from './middleware/errorHandler'
import { notFoundHandler } from './middleware/notFoundHandler'
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
import { rotaRoutes } from './routes/rotaRoutes'
import { recycleBinRoutes } from './routes/recycleBinRoutes'
import { auditRoutes } from './routes/auditRoutes'
import { dashboardRoutes } from './routes/dashboardRoutes'

// Initialize Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
})

// Initialize Express app
const app = express()

// Environment variables
const PORT = process.env.PORT || 3001
const NODE_ENV = process.env.NODE_ENV || 'development'

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}))

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'http://localhost:3002',
    'http://localhost:3003',
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(compression())
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'))
} else {
  app.use(morgan('combined'))
}

// Apply rate limiting to all requests
app.use(limiter)

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'CareTrack Pro API is running',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  })
})

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
app.use('/api/rota', rotaRoutes)
app.use('/api/recycle-bin', recycleBinRoutes)
app.use('/api/audit', auditRoutes)
app.use('/api/dashboard', dashboardRoutes)

// Error handlers (must be last)
app.use(notFoundHandler)
app.use(errorHandler)

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...')
  await prisma.$disconnect()
  process.exit(0)
})

// Start server
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connected successfully')

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`)
      console.log(`📊 Environment: ${NODE_ENV}`)
      console.log(`🔍 Health check: http://localhost:${PORT}/health`)
      
      if (NODE_ENV === 'development') {
        console.log(`📘 Prisma Studio: npx prisma studio`)
      }
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()