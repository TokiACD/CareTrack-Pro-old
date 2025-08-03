# SERVER CLAUDE.md

This file provides guidance for working with the Node.js backend API in CareTrack Pro.

## Backend Architecture Overview

The server is a Node.js/Express application with TypeScript, Prisma ORM, PostgreSQL, and comprehensive care management business logic.

## Key Entry Points

### Application Bootstrap
- **`src/index.ts`** - Express server setup, middleware, routes, database connection, graceful shutdown
- **`package.json`** - Dependencies and scripts for development/production
- **`nodemon.json`** - Development auto-reload configuration
- **`tsconfig.json`** - TypeScript configuration for Node.js

### Database Layer
- **`prisma/schema.prisma`** - Complete database schema with 12+ entities and relationships
- **`prisma/seed.ts`** - Database seeding with admin user and sample data
- **`prisma/migrations/`** - Database migration history

## Directory Structure

### `/src/routes/` - API Endpoint Definitions

**Core System Routes:**
- **`authRoutes.ts`** - Authentication (login, logout, token verification)
- **`invitationRoutes.ts`** - User invitation system (send, accept, decline, resend)
- **`dashboardRoutes.ts`** - Dashboard summary and statistics
- **`auditRoutes.ts`** - System activity and audit log retrieval

**User Management Routes:**
- **`adminUserRoutes.ts`** - Admin user CRUD operations
- **`carerRoutes.ts`** - Carer management with competency tracking
- **`users.ts`** - General user operations and utilities
- **`emailChangeRoutes.ts`** - Email change request handling

**Care Management Routes:**
- **`carePackageRoutes.ts`** - Care package CRUD with postcode validation
- **`taskRoutes.ts`** - Task management with target completion counts
- **`assignmentRoutes.ts`** - Carer-package and task-package assignments

**Assessment & Progress Routes:**
- **`assessmentRoutes.ts`** - Assessment creation, editing, and response submission
- **`progressRoutes.ts`** - Progress tracking, PDF generation, competency management

**Scheduling Routes:**
- **`shiftRoutes.ts`** - Shift creation and assignment with competency requirements
- **`rotaRoutes.ts`** - Scheduling with complex rule validation

**System Management Routes:**
- **`recycleBinRoutes.ts`** - Soft delete management and restoration

### `/src/controllers/` - Business Logic Layer

**Authentication & User Management:**
- **`AuthController.ts`** - Login, password reset, token management, invitation acceptance
- **`UserController.ts`** - User CRUD operations with audit logging
- **`InvitationController.ts`** - Invitation lifecycle management

**Care Management:**
- **`TaskController.ts`** - Task business logic, progress calculations
- **`AssessmentController.ts`** - Assessment creation, competency rating logic
- **`AssignmentController.ts`** - Assignment validation and relationship management
- **`ProgressController.ts`** - Progress tracking, PDF generation

**Scheduling:**
- **`RotaController.ts`** - Scheduling rule validation, conflict detection
- **`ShiftController.ts`** - Shift management with competency matching

### `/src/middleware/` - Request Processing

**Security & Authentication:**
- **`auth.ts`** - JWT token validation, user authentication middleware
- **`validateRequest.ts`** - Input validation using express-validator

**System Monitoring:**
- **`audit.ts`** - Automatic audit logging for all database changes
- **`errorHandler.ts`** - Global error handling with proper HTTP status codes
- **`notFoundHandler.ts`** - 404 route handler

### `/src/services/` - External Service Integration

**Communication Services:**
- **`emailService.ts`** - SendGrid and SMTP email service with professional templates
- **`auditService.ts`** - Audit trail creation and management

**Utility Services:**
- **`pdfService.ts`** - PDF generation for progress reports
- **`competencyService.ts`** - Competency level calculations and validations

### `/src/utils/` - Shared Utilities

**Validation & Processing:**
- **`validators.ts`** - Custom validation functions (postcode, email, etc.)
- **`dateUtils.ts`** - Date manipulation and formatting utilities
- **`constants.ts`** - Server-side constants and configuration

### `/src/types/` - Server-Specific Types

**Request/Response Types:**
- **`apiTypes.ts`** - API request/response interfaces
- **`authTypes.ts`** - Authentication-related types
- **`errorTypes.ts`** - Error handling type definitions

## Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Build TypeScript to JavaScript
npm run build

# Start production server
npm start

# Database operations
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run database migrations
npm run db:studio      # Open Prisma Studio GUI
npm run db:seed        # Seed development data
npm run db:reset       # Reset database (destructive)

# Code quality
npm run type-check     # TypeScript type checking
npm run lint          # ESLint code checking
```

## Database Architecture (Prisma ORM)

### Core Entities and Relationships

**User Management:**
```
AdminUser (1) ──< Invitation (many)
AdminUser (1) ──< AuditLog (many)
Carer (1) ──< CarerPackageAssignment (many)
```

**Care Management:**
```
CarePackage (1) ──< CarerPackageAssignment (many)
CarePackage (1) ──< PackageTaskAssignment (many)
Task (1) ──< PackageTaskAssignment (many)
Task (1) ──< CompetencyRating (many)
```

**Assessment System:**
```
Assessment (1) ──< KnowledgeQuestion (many)
Assessment (1) ──< PracticalSkill (many)
Assessment (1) ──< EmergencyQuestion (many)
Assessment (1) ──< AssessmentTaskCoverage (many)
AssessmentResponse (1) ──< KnowledgeResponse (many)
AssessmentResponse (1) ──< PracticalResponse (many)
```

**Scheduling:**
```
CarePackage (1) ──< Shift (many)
Shift (1) ──< ShiftAssignment (many)
CarePackage (1) ──< RotaEntry (many)
Carer (1) ──< RotaEntry (many)
```

### Database Patterns

**Soft Delete Pattern:**
```typescript
// All major entities include deletedAt timestamp
interface SoftDeletable {
  deletedAt?: Date
}

// Query active records only
const activeRecords = await prisma.task.findMany({
  where: { deletedAt: null }
})
```

**Audit Trail Pattern:**
```typescript
// Automatic audit logging via middleware
interface AuditLog {
  action: string           // CREATE, UPDATE, DELETE
  entityType: string       // Table name
  entityId: string         // Record ID
  oldValues?: object       // Previous state
  newValues?: object       // New state
  performedBy: string      // Admin user ID
  performedAt: Date        // Timestamp
}
```

## API Patterns and Conventions

### Standard Response Format
```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}
```

### Error Handling Pattern
```typescript
// Controllers use try-catch with proper error types
try {
  const result = await service.performOperation(data)
  res.json({ success: true, data: result })
} catch (error) {
  next(error) // Handled by global error middleware
}
```

### Authentication Middleware Usage
```typescript
// Protected routes require auth middleware
router.get('/protected-endpoint', auth, async (req, res) => {
  // req.user contains authenticated admin user
  const userId = req.user.id
})
```

### Validation Pattern
```typescript
// Input validation using express-validator
import { body, validationResult } from 'express-validator'

router.post('/endpoint',
  [
    body('email').isEmail(),
    body('name').isLength({ min: 2 })
  ],
  validateRequest, // Middleware to check validation results
  controller.handleRequest
)
```

## Business Logic Implementations

### Competency System
```typescript
enum CompetencyLevel {
  NOT_ASSESSED = 'NOT_ASSESSED',
  NOT_COMPETENT = 'NOT_COMPETENT', 
  ADVANCED_BEGINNER = 'ADVANCED_BEGINNER',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT'
}

// Manual ratings override assessment ratings
// Competency calculations affect scheduling eligibility
```

### Invitation System
```typescript
// Secure token-based invitation flow
1. Admin sends invitation → Creates Invitation record with secure token
2. Email sent with invitation link containing token
3. User clicks link → Frontend validates token
4. User sets password → Account created, invitation marked accepted
```

### Assessment Processing
```typescript
// 4-section assessment structure
1. Knowledge Questions → Text answers compared to model answers
2. Practical Skills → Competency ratings (COMPETENT/NEEDS_SUPPORT/NOT_APPLICABLE)
3. Emergency Scenarios → Text answers for emergency situations
4. Task Coverage → Selection of tasks covered by assessment
```

### Scheduling Rules Engine
```typescript
// Complex validation rules for rota entries
- Maximum 36 hours per week per carer
- Minimum 1 competent staff member per shift
- Day/night rotation requirements (1 week days → 1 week nights)
- No consecutive weekends for same carer
- 48-hour rest period between night-to-day shifts
```

## Environment Configuration

### Required Environment Variables (`.env`)
```bash
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/caretrack_pro"

# Authentication
JWT_SECRET="secure-secret-key"
JWT_EXPIRES_IN="8h"

# Email Service (SendGrid preferred)
EMAIL_SERVICE="sendgrid"
SENDGRID_API_KEY="your-sendgrid-api-key"
SMTP_FROM="CareTrack Pro <noreply@caretrack.com>"

# Fallback SMTP (if not using SendGrid)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Frontend URL for email links
FRONTEND_URL="http://localhost:3000"

# Server Configuration
PORT=3001
NODE_ENV="development"

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000    # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100    # 100 requests per window
```

## Security Features

### Authentication & Authorization
- JWT token-based authentication with 8-hour expiration
- Password hashing using bcrypt with salt rounds
- Protected routes requiring valid JWT tokens
- Role-based access (admin-only operations)

### Data Protection
- SQL injection prevention via Prisma ORM
- Input validation on all endpoints
- Rate limiting to prevent abuse
- CORS configuration for frontend-only access
- Helmet.js for security headers

### Audit Trail
- Complete audit logging for all administrative actions
- IP address and user agent tracking
- Soft delete with retention policies
- Password reset token expiration

## Email System

### SendGrid Integration (Production)
```typescript
// Professional HTML email templates
- Invitation emails with branded design
- Password reset notifications
- System alerts and notifications
- Responsive design for all email clients
```

### SMTP Fallback (Development)
```typescript
// Nodemailer configuration for development
- Gmail/SMTP server support
- Local testing with development credentials
- Template rendering with dynamic content
```

## Development Patterns

### Controller Pattern
```typescript
export class ExampleController {
  async createRecord(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await this.service.create(req.body)
      res.json({ success: true, data })
    } catch (error) {
      next(error)
    }
  }
}
```

### Service Layer Pattern
```typescript
export class ExampleService {
  async create(data: CreateRequest): Promise<Entity> {
    // Business logic
    // Validation
    // Database operations
    // Return result
  }
}
```

### Middleware Pattern
```typescript
export const exampleMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Process request
  // Modify req/res objects
  // Call next() or handle error
}
```

## Testing Strategy

Currently no test framework configured. Manual testing approach:

1. **API Testing**: Use Postman/Insomnia for endpoint testing
2. **Database Testing**: Use Prisma Studio for data verification
3. **Integration Testing**: Test complete workflows through frontend
4. **Error Testing**: Verify error handling and status codes
5. **Security Testing**: Test authentication and authorization

## Production Deployment

### Build Process
```bash
npm run build          # Compile TypeScript
```

### Database Preparation
```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Apply migrations
```

### Environment Setup
- Configure production environment variables
- Set up SendGrid for email service
- Configure production database
- Set JWT secret and proper CORS origins

### Process Management
- PM2 or similar for process management
- Health check endpoint at `/health`
- Graceful shutdown handling
- Database connection pooling