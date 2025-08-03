# SERVER SRC CLAUDE.md

This file provides guidance for working with the Node.js backend source code structure in CareTrack Pro.

## Source Code Architecture

The `/src` directory contains all Express.js backend source code, organized by feature and layer for a comprehensive care management API.

## Directory Structure & Purpose

### `/routes/` - API Endpoint Definitions

**Core System Routes:**
- **`authRoutes.ts`** - Authentication endpoints (`/api/auth/*`)
  - POST `/login` - Admin login with JWT token generation
  - POST `/logout` - Token invalidation and session cleanup
  - GET `/verify` - JWT token verification for protected routes
  - POST `/forgot-password` - Password reset request with email
  - POST `/reset-password` - Password reset completion with token

- **`invitationRoutes.ts`** - User invitation system (`/api/invitations/*`)
  - POST `/admin` - Send admin invitation with secure token
  - POST `/carer` - Send carer invitation with secure token
  - POST `/accept` - Accept invitation and create account
  - POST `/decline` - Decline invitation
  - GET `/` - List pending invitations
  - POST `/resend` - Resend invitation email

- **`dashboardRoutes.ts`** - Dashboard data endpoints (`/api/dashboard/*`)
  - GET `/summary` - Dashboard overview statistics
  - GET `/alerts` - Carers needing assessment alerts
  - GET `/activity` - Recent system activity

- **`auditRoutes.ts`** - System audit logging (`/api/audit/*`)
  - GET `/` - Paginated audit log retrieval
  - GET `/entity/:type/:id` - Entity-specific audit history
  - GET `/user/:userId` - User activity history

**User Management Routes:**
- **`adminUserRoutes.ts`** - Admin user management (`/api/admin-users/*`)
  - GET `/` - List all admin users with pagination
  - POST `/` - Create new admin user
  - GET `/:id` - Get admin user by ID
  - PUT `/:id` - Update admin user
  - DELETE `/:id` - Soft delete admin user

- **`carerRoutes.ts`** - Carer management (`/api/carers/*`)
  - GET `/` - List carers with competency data
  - POST `/` - Create new carer
  - GET `/:id` - Get carer with progress and competencies
  - PUT `/:id` - Update carer information
  - DELETE `/:id` - Soft delete carer
  - GET `/:id/progress` - Carer progress across packages
  - GET `/:id/competencies` - Carer competency ratings

- **`users.ts`** - General user operations (`/api/users/*`)
  - GET `/profile` - Current user profile
  - PUT `/profile` - Update user profile
  - POST `/change-password` - Change user password

- **`emailChangeRoutes.ts`** - Email change system (`/api/email-change/*`)
  - POST `/request` - Request email change with verification
  - POST `/verify` - Verify email change with token
  - POST `/cancel` - Cancel pending email change

**Care Management Routes:**
- **`carePackageRoutes.ts`** - Care package management (`/api/care-packages/*`)
  - GET `/` - List care packages with assignments
  - POST `/` - Create care package with postcode validation
  - GET `/:id` - Get care package with carers and tasks
  - PUT `/:id` - Update care package
  - DELETE `/:id` - Soft delete care package

- **`taskRoutes.ts`** - Task management (`/api/tasks/*`)
  - GET `/` - List tasks with competency data
  - POST `/` - Create task with target count
  - GET `/:id` - Get task with progress data
  - PUT `/:id` - Update task
  - DELETE `/:id` - Soft delete task

- **`assignmentRoutes.ts`** - Assignment management (`/api/assignments/*`)
  - POST `/carer-package` - Assign carer to package
  - DELETE `/carer-package/:id` - Remove carer assignment
  - POST `/task-package` - Assign task to package
  - DELETE `/task-package/:id` - Remove task assignment
  - GET `/carer/:id/packages` - Get carer's package assignments
  - GET `/package/:id/carers` - Get package's carer assignments

**Assessment & Progress Routes:**
- **`assessmentRoutes.ts`** - Assessment system (`/api/assessments/*`)
  - GET `/` - List assessments with structure
  - POST `/` - Create assessment with 4 sections
  - GET `/:id` - Get assessment with all sections
  - PUT `/:id` - Update assessment structure
  - DELETE `/:id` - Soft delete assessment
  - POST `/:id/response` - Submit assessment response
  - GET `/:id/responses` - Get assessment responses

- **`progressRoutes.ts`** - Progress tracking (`/api/progress/*`)
  - GET `/carer/:id` - Carer progress across packages
  - PUT `/carer/:id/task/:taskId` - Update task progress
  - GET `/package/:id` - Package progress overview
  - GET `/carer/:id/pdf` - Generate progress PDF report
  - POST `/competency` - Set manual competency rating

**Scheduling Routes:**
- **`shiftRoutes.ts`** - Shift management (`/api/shifts/*`)
  - GET `/` - List shifts with requirements
  - POST `/` - Create shift with competency requirements
  - GET `/:id` - Get shift with assignments
  - PUT `/:id` - Update shift
  - DELETE `/:id` - Delete shift
  - POST `/:id/assign` - Assign carer to shift
  - DELETE `/assignment/:id` - Remove shift assignment

- **`rotaRoutes.ts`** - Scheduling system (`/api/rota/*`)
  - GET `/` - Get rota entries with filtering
  - POST `/` - Create rota entry with rule validation
  - GET `/:id` - Get rota entry details
  - PUT `/:id` - Update rota entry
  - DELETE `/:id` - Delete rota entry
  - POST `/validate` - Validate scheduling rules
  - GET `/week/:date` - Get weekly schedule

**System Management Routes:**
- **`recycleBinRoutes.ts`** - Soft delete management (`/api/recycle-bin/*`)
  - GET `/` - List deleted items by entity type
  - POST `/restore/:entityType/:id` - Restore deleted item
  - DELETE `/permanent/:entityType/:id` - Permanently delete item

### `/controllers/` - Business Logic Layer

**Authentication & User Management:**
- **`AuthController.ts`** - Authentication business logic
  - User login with password validation
  - JWT token generation and validation
  - Password reset with secure tokens
  - Invitation acceptance and account creation

- **`UserController.ts`** - User CRUD operations
  - Admin and carer user management
  - Profile updates with audit logging
  - Password change with validation
  - User activation/deactivation

- **`InvitationController.ts`** - Invitation lifecycle
  - Secure token generation
  - Email sending with templates
  - Invitation validation and expiration
  - Acceptance and decline processing

**Care Management:**
- **`TaskController.ts`** - Task business logic
  - Task CRUD with target count validation
  - Progress calculation and percentage updates
  - Competency requirement management
  - Task-package assignment logic

- **`AssessmentController.ts`** - Assessment system
  - 4-section assessment creation
  - Response submission and validation
  - Competency rating calculation
  - Assessment-based competency updates

- **`AssignmentController.ts`** - Assignment management
  - Carer-package relationship validation
  - Task-package assignment logic
  - Conflict detection and resolution
  - Assignment history tracking

- **`ProgressController.ts`** - Progress tracking
  - Individual carer progress calculation
  - Package-specific progress tracking
  - PDF report generation
  - Competency rating management

**Scheduling:**
- **`RotaController.ts`** - Scheduling logic
  - Complex rule validation engine
  - Conflict detection for scheduling
  - Weekly hour calculation
  - Day/night shift rotation validation

- **`ShiftController.ts`** - Shift management
  - Shift creation with competency requirements
  - Carer assignment based on competency
  - Shift confirmation and completion
  - Competency-based filtering

### `/middleware/` - Request Processing Pipeline

**Security & Authentication:**
- **`auth.ts`** - JWT Authentication Middleware
  - Token validation from Authorization header
  - User session verification
  - Protected route enforcement
  - Token expiration handling

- **`validateRequest.ts`** - Input Validation Middleware
  - Express-validator integration
  - Request body validation
  - Parameter validation
  - Custom validation rules

**System Monitoring:**
- **`audit.ts`** - Audit Logging Middleware
  - Automatic audit trail creation
  - Database change tracking
  - User action logging
  - IP address and user agent capture

- **`errorHandler.ts`** - Global Error Handler
  - Centralized error processing
  - HTTP status code mapping
  - Error message standardization
  - Development vs production error details

- **`notFoundHandler.ts`** - 404 Route Handler
  - Catch-all for undefined routes
  - Consistent 404 response format
  - API documentation suggestions

### `/services/` - External Service Integration

**Communication Services:**
- **`emailService.ts`** - Email Service Integration
  - SendGrid API integration for production
  - SMTP fallback for development
  - Professional HTML email templates
  - Template rendering with dynamic content
  - Email sending with error handling

- **`auditService.ts`** - Audit Trail Management
  - Audit log creation utilities
  - Change tracking for entities
  - Audit query and filtering
  - Retention policy management

**Utility Services:**
- **`pdfService.ts`** - PDF Generation Service
  - Progress report generation
  - Assessment result formatting
  - Template-based PDF creation
  - File serving and download

- **`competencyService.ts`** - Competency Management
  - Competency level calculations
  - Assessment-based rating updates
  - Manual rating override logic
  - Competency requirement validation

### `/utils/` - Shared Utility Functions

**Validation & Processing:**
- **`validators.ts`** - Custom Validation Functions
  - UK postcode validation
  - Email format validation
  - Phone number validation
  - Date range validation

- **`dateUtils.ts`** - Date Manipulation Utilities
  - Date formatting for different contexts
  - Time zone handling
  - Date range calculations
  - Week/month boundaries

- **`constants.ts`** - Server-Side Constants
  - Database limits and constraints
  - Validation rules and patterns
  - Error codes and messages
  - System configuration values

### `/types/` - Server-Specific Type Definitions

**Request/Response Types:**
- **`apiTypes.ts`** - API-Specific Interfaces
  - Request body interfaces
  - Response format definitions
  - Pagination structures
  - Filter and sort parameters

- **`authTypes.ts`** - Authentication Types
  - JWT payload structure
  - Login request/response types
  - Password reset types
  - Session management types

- **`errorTypes.ts`** - Error Handling Types
  - Custom error class definitions
  - Error response structures
  - Validation error formats
  - HTTP status code mappings

### Root Source Files

**`index.ts`** - Express Application Entry Point
- Express server configuration
- Middleware pipeline setup
- Route registration
- Database connection
- Graceful shutdown handling
- Health check endpoint

## Development Patterns

### Controller Pattern
```typescript
export class ExampleController {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      // Input validation
      const validatedData = this.validateInput(req.body)
      
      // Business logic
      const result = await this.service.create(validatedData)
      
      // Audit logging
      await this.auditService.log('CREATE', 'Example', result.id, req.user)
      
      // Response
      res.status(201).json({
        success: true,
        data: result,
        message: 'Example created successfully'
      })
    } catch (error) {
      next(error) // Handled by global error middleware
    }
  }
}
```

### Service Layer Pattern
```typescript
export class ExampleService {
  async create(data: CreateExampleRequest): Promise<Example> {
    // Validation
    await this.validateBusinessRules(data)
    
    // Database transaction
    return await prisma.$transaction(async (tx) => {
      const example = await tx.example.create({ data })
      await this.updateRelatedEntities(tx, example)
      return example
    })
  }
  
  private async validateBusinessRules(data: CreateExampleRequest) {
    // Complex business validation
  }
}
```

### Middleware Pattern
```typescript
export const exampleMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Process request
    const processed = await processRequest(req)
    
    // Modify request object
    req.processed = processed
    
    // Continue to next middleware
    next()
  } catch (error) {
    next(error)
  }
}
```

### Route Definition Pattern
```typescript
import { Router } from 'express'
import { auth } from '../middleware/auth'
import { validateRequest } from '../middleware/validateRequest'
import { ExampleController } from '../controllers/ExampleController'

const router = Router()
const controller = new ExampleController()

// Protected route with validation
router.post('/',
  auth,                    // Authentication required
  validateExampleInput,    // Input validation
  controller.create        // Controller method
)

// Public route
router.get('/public', controller.getPublicData)

export { router as exampleRoutes }
```

## Database Integration Patterns

### Prisma ORM Usage
```typescript
// Basic CRUD operations
const example = await prisma.example.create({
  data: {
    name: 'Example',
    isActive: true
  }
})

// Complex queries with relations
const exampleWithRelations = await prisma.example.findMany({
  where: { deletedAt: null },
  include: {
    relatedEntity: true,
    anotherRelation: {
      where: { isActive: true }
    }
  }
})

// Transactions for complex operations
await prisma.$transaction(async (tx) => {
  const example = await tx.example.create({ data })
  await tx.relatedEntity.updateMany({
    where: { exampleId: example.id },
    data: { updated: true }
  })
})
```

### Soft Delete Pattern
```typescript
// Soft delete implementation
async softDelete(id: string) {
  return await prisma.example.update({
    where: { id },
    data: { deletedAt: new Date() }
  })
}

// Query active records only
async findActive() {
  return await prisma.example.findMany({
    where: { deletedAt: null }
  })
}
```

### Audit Trail Pattern
```typescript
// Automatic audit logging via middleware
async updateWithAudit(id: string, data: UpdateData, user: AdminUser) {
  const oldRecord = await prisma.example.findUnique({ where: { id } })
  
  const updated = await prisma.example.update({
    where: { id },
    data
  })
  
  await auditService.log({
    action: 'UPDATE',
    entityType: 'Example',
    entityId: id,
    oldValues: oldRecord,
    newValues: updated,
    performedBy: user
  })
  
  return updated
}
```

## Business Logic Implementation

### Competency System Logic
```typescript
// Competency level calculation
calculateCompetencyLevel(assessmentScore: number): CompetencyLevel {
  if (assessmentScore >= 90) return CompetencyLevel.EXPERT
  if (assessmentScore >= 80) return CompetencyLevel.PROFICIENT
  if (assessmentScore >= 70) return CompetencyLevel.COMPETENT
  if (assessmentScore >= 60) return CompetencyLevel.ADVANCED_BEGINNER
  return CompetencyLevel.NOT_COMPETENT
}

// Manual ratings override assessment ratings
async setCompetencyRating(
  carerId: string,
  taskId: string,
  level: CompetencyLevel,
  source: CompetencySource,
  adminId?: string
) {
  return await prisma.competencyRating.upsert({
    where: { carerId_taskId: { carerId, taskId } },
    update: { level, source, setByAdminId: adminId, setAt: new Date() },
    create: { carerId, taskId, level, source, setByAdminId: adminId }
  })
}
```

### Scheduling Rules Engine
```typescript
// Complex scheduling validation
class SchedulingRulesEngine {
  async validateRotaEntry(entry: RotaEntry): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = []
    
    // Rule 1: Maximum 36 hours per week
    const weeklyHours = await this.calculateWeeklyHours(entry.carerId, entry.date)
    if (weeklyHours > 36) {
      violations.push({
        rule: 'MAX_WEEKLY_HOURS',
        message: 'Carer exceeds 36-hour weekly limit',
        severity: 'error'
      })
    }
    
    // Rule 2: Minimum 1 competent staff per shift
    const competentStaff = await this.getCompetentStaffForShift(entry)
    if (competentStaff.length === 0) {
      violations.push({
        rule: 'MIN_COMPETENT_STAFF',
        message: 'Shift requires at least 1 competent staff member',
        severity: 'error'
      })
    }
    
    // Additional rules...
    
    return violations
  }
}
```

### Assessment Processing Logic
```typescript
// Assessment response processing
async processAssessmentResponse(response: AssessmentResponse) {
  // Calculate overall competency based on sections
  const knowledgeScore = this.calculateKnowledgeScore(response.knowledgeResponses)
  const practicalScore = this.calculatePracticalScore(response.practicalResponses)
  const emergencyScore = this.calculateEmergencyScore(response.emergencyResponses)
  
  const overallLevel = this.calculateOverallCompetency(
    knowledgeScore,
    practicalScore,
    emergencyScore
  )
  
  // Update competency ratings for covered tasks
  const assessment = await prisma.assessment.findUnique({
    where: { id: response.assessmentId },
    include: { tasksCovered: true }
  })
  
  for (const taskCoverage of assessment.tasksCovered) {
    await this.setCompetencyRating(
      response.carerId,
      taskCoverage.taskId,
      overallLevel,
      CompetencySource.ASSESSMENT,
      response.assessorId
    )
  }
  
  return overallLevel
}
```

## Error Handling Strategy

### Custom Error Classes
```typescript
export class ValidationError extends Error {
  constructor(
    message: string,
    public field: string,
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public rule: string,
    public code: string = 'BUSINESS_RULE_VIOLATION'
  ) {
    super(message)
    this.name = 'BusinessRuleError'
  }
}
```

### Global Error Handler
```typescript
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Log error
  console.error('Error:', error)
  
  // Handle specific error types
  if (error instanceof ValidationError) {
    return res.status(400).json({
      success: false,
      error: error.message,
      field: error.field,
      code: error.code
    })
  }
  
  if (error instanceof BusinessRuleError) {
    return res.status(409).json({
      success: false,
      error: error.message,
      rule: error.rule,
      code: error.code
    })
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  })
}
```

## Testing Strategy

Currently no test framework configured. When implementing tests:

1. **Unit Tests**: Test individual functions and methods
2. **Integration Tests**: Test API endpoints with database
3. **Business Logic Tests**: Test complex rules and calculations
4. **Authentication Tests**: Test JWT and invitation flows
5. **Database Tests**: Test Prisma operations and transactions

## Performance Optimization

### Database Optimization
- Proper indexing on frequently queried fields
- Query optimization with Prisma includes
- Connection pooling for production
- Database query logging and monitoring

### Caching Strategy
- API response caching for static data
- Database query result caching
- Session management optimization
- File upload/download optimization

### API Optimization
- Response pagination for large datasets
- Compression middleware for responses
- Rate limiting to prevent abuse
- Proper HTTP status codes and caching headers