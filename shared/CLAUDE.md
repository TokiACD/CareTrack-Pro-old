# SHARED CLAUDE.md

This file provides guidance for working with the shared TypeScript types and utilities in CareTrack Pro.

## Shared Package Overview

The shared package contains TypeScript types, constants, and utilities used by both client and server applications to ensure type safety and consistency across the entire system.

## Package Structure

### Entry Point
- **`src/index.ts`** - Main export file that re-exports all shared code
- **`package.json`** - Package configuration with TypeScript as peer dependency

### Core Files
- **`src/types.ts`** - Complete type definitions for the entire application
- **`src/constants.ts`** - System-wide constants and configuration values
- **`src/utils.ts`** - Shared utility functions

## Type System Architecture (`src/types.ts`)

### Core User Types

**Admin User Management:**
```typescript
interface AdminUser {
  id: string
  email: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  invitedBy?: string
  lastLogin?: Date
}
```

**Carer Management:**
```typescript
interface Carer {
  id: string
  email: string
  name: string
  phone: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  // Computed fields for UI
  isFullyAssessed?: boolean
  packages?: CarerPackageAssignment[]
  competencies?: CompetencyRating[]
}
```

### Care Management Types

**Care Package System:**
```typescript
interface CarePackage {
  id: string
  name: string
  postcode: string  // UK postcode outward code (e.g., SW1A, M1, B33)
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  // Relations loaded as needed
  carers?: CarerPackageAssignment[]
  tasks?: PackageTaskAssignment[]
}
```

**Task Management:**
```typescript
interface Task {
  id: string
  name: string
  targetCount: number  // Target completion count for 100%
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  // Relations
  packages?: PackageTaskAssignment[]
  assessments?: AssessmentTaskCoverage[]
}
```

### Assignment Relationship Types

**Many-to-Many Relationships:**
```typescript
// Carer assigned to Care Package
interface CarerPackageAssignment {
  id: string
  carerId: string
  packageId: string
  assignedAt: Date
  isActive: boolean
  // Relations
  carer?: Carer
  package?: CarePackage
  progress?: TaskProgress[]
}

// Task assigned to Care Package
interface PackageTaskAssignment {
  id: string
  packageId: string
  taskId: string
  assignedAt: Date
  isActive: boolean
  // Relations
  package?: CarePackage
  task?: Task
}
```

### Assessment System Types

**Complete Assessment Structure:**
```typescript
interface Assessment {
  id: string
  name: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
  // 4-section assessment structure
  knowledgeQuestions: KnowledgeQuestion[]    // Section 1
  practicalSkills: PracticalSkill[]          // Section 2  
  emergencyQuestions: EmergencyQuestion[]    // Section 3
  tasksCovered: AssessmentTaskCoverage[]     // Section 4
  displayTaskId?: string  // Task to show assessment button on
}
```

**Assessment Sections:**
```typescript
// Section 1: Knowledge Questions
interface KnowledgeQuestion {
  id: string
  assessmentId: string
  question: string
  modelAnswer: string  // Expected answer for comparison
  order: number
}

// Section 2: Practical Skills
interface PracticalSkill {
  id: string
  assessmentId: string
  skillDescription: string
  canBeNotApplicable: boolean
  order: number
}

// Section 3: Emergency Scenarios
interface EmergencyQuestion {
  id: string
  assessmentId: string
  question: string
  modelAnswer: string  // Expected emergency response
  order: number
}

// Section 4: Task Coverage
interface AssessmentTaskCoverage {
  id: string
  assessmentId: string
  taskId: string
  assessment?: Assessment
  task?: Task
}
```

**Assessment Response System:**
```typescript
interface AssessmentResponse {
  id: string
  assessmentId: string
  carerId: string
  assessorId: string
  assessorName: string
  assessorUniqueId: string
  completedAt: Date
  overallRating: CompetencyLevel
  // Response sections matching assessment structure
  knowledgeResponses: KnowledgeResponse[]
  practicalResponses: PracticalResponse[]
  emergencyResponses: EmergencyResponse[]
}
```

### Progress & Competency System

**Progress Tracking:**
```typescript
interface TaskProgress {
  id: string
  carerId: string
  packageId: string
  taskId: string
  completionCount: number      // Current completion count
  completionPercentage: number // Calculated percentage (0-100)
  lastUpdated: Date
  // Relations
  carer?: Carer
  package?: CarePackage
  task?: Task
}
```

**Competency Rating System:**
```typescript
interface CompetencyRating {
  id: string
  carerId: string
  taskId: string
  level: CompetencyLevel      // Current competency level
  source: CompetencySource    // ASSESSMENT or MANUAL
  assessmentResponseId?: string
  setByAdminId?: string
  setByAdminName?: string
  setAt: Date
  notes?: string
  // Relations
  carer?: Carer
  task?: Task
  assessmentResponse?: AssessmentResponse
}
```

### Scheduling System Types

**Shift Management:**
```typescript
interface Shift {
  id: string
  packageId: string
  name: string
  description: string
  requiredCompetencies: string[]  // Task IDs requiring competency
  isCompetentOnly: boolean        // Requires competent+ level
  createdAt: Date
  createdByAdminId: string
  // Relations
  package?: CarePackage
  assignments?: ShiftAssignment[]
}

interface ShiftAssignment {
  id: string
  shiftId: string
  carerId: string
  assignedAt: Date
  confirmedAt?: Date
  status: ShiftStatus  // PENDING, CONFIRMED, CANCELLED, COMPLETED
}
```

**Rota System:**
```typescript
interface RotaEntry {
  id: string
  packageId: string
  carerId: string
  date: Date
  shiftType: ShiftType     // DAY or NIGHT
  startTime: string        // HH:MM format
  endTime: string          // HH:MM format
  isConfirmed: boolean
  createdAt: Date
  createdByAdminId: string
  // Relations
  package?: CarePackage
  carer?: Carer
}
```

### System & Audit Types

**Audit Trail:**
```typescript
interface AuditLog {
  id: string
  action: string                    // CREATE, UPDATE, DELETE, etc.
  entityType: string               // Table/model name
  entityId: string                 // Record identifier
  oldValues?: Record<string, any>  // Previous state
  newValues?: Record<string, any>  // New state
  performedByAdminId: string
  performedByAdminName: string
  performedAt: Date
  ipAddress?: string
  userAgent?: string
}
```

**Invitation System:**
```typescript
interface Invitation {
  id: string
  email: string
  userType: InvitationType        // ADMIN or CARER
  token: string                   // Secure invitation token
  name?: string                   // For admin invitations
  firstName?: string              // For carer invitations
  lastName?: string               // For carer invitations
  phone?: string                  // For carer invitations
  invitedBy: string              // Admin user ID
  invitedAt: Date
  expiresAt: Date                // Token expiration
  acceptedAt?: Date
  declinedAt?: Date
  status: InvitationStatus       // PENDING, ACCEPTED, DECLINED, EXPIRED
  invitedByAdmin?: AdminUser
}
```

### System Enums

**Competency System Enums:**
```typescript
enum CompetencyLevel {
  NOT_ASSESSED = 'NOT_ASSESSED',        // No evaluation yet
  NOT_COMPETENT = 'NOT_COMPETENT',      // Requires training
  ADVANCED_BEGINNER = 'ADVANCED_BEGINNER', // Basic skills
  COMPETENT = 'COMPETENT',              // Meets standards
  PROFICIENT = 'PROFICIENT',            // Above average
  EXPERT = 'EXPERT'                     // Advanced practitioner
}

enum CompetencySource {
  ASSESSMENT = 'ASSESSMENT',    // From assessment completion
  MANUAL = 'MANUAL'            // Set by administrator (takes precedence)
}

enum PracticalRating {
  COMPETENT = 'COMPETENT',
  NEEDS_SUPPORT = 'NEEDS_SUPPORT',
  NOT_APPLICABLE = 'NOT_APPLICABLE'
}
```

**Scheduling Enums:**
```typescript
enum ShiftStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED'
}

enum ShiftType {
  DAY = 'DAY',
  NIGHT = 'NIGHT'
}
```

**User Management Enums:**
```typescript
enum InvitationType {
  ADMIN = 'ADMIN',
  CARER = 'CARER'
}

enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  DECLINED = 'DECLINED',
  EXPIRED = 'EXPIRED'
}
```

### API Response Types

**Standard Response Wrappers:**
```typescript
interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
```

### Dashboard & UI Types

**Dashboard Data:**
```typescript
interface DashboardSummary {
  totalCarers: number
  totalActiveCarers: number
  totalCarePackages: number
  totalTasks: number
  carersNeedingAssessment: CarerAssessmentAlert[]
  recentActivity: AuditLog[]
}

interface CarerAssessmentAlert {
  carer: Carer
  package: CarePackage
  completionPercentage: number
  missingCompetencies: Task[]
}
```

### Form & Request Types

**Authentication Forms:**
```typescript
interface LoginRequest {
  email: string
  password: string
}

interface AcceptInvitationRequest {
  token: string
  password: string
}
```

**Management Forms:**
```typescript
interface InviteAdminRequest {
  email: string
  name: string
}

interface InviteCarerRequest {
  email: string
  firstName: string
  lastName: string
  phone?: string
}

interface CreateCarePackageRequest {
  name: string
  postcode: string  // Validated as UK postcode format
}

interface CreateTaskRequest {
  name: string
  targetCount: number
}
```

**Assignment Requests:**
```typescript
interface AssignCarerToPackageRequest {
  carerId: string
  packageId: string
}

interface AssignTaskToPackageRequest {
  taskId: string
  packageId: string
}
```

### Validation & Rule Types

**Validation System:**
```typescript
interface ValidationError {
  field: string
  message: string
}

interface RuleViolation {
  rule: string
  message: string
  severity: 'error' | 'warning'
}
```

**Scheduling Rules:**
```typescript
interface SchedulingRule {
  id: string
  name: string
  description: string
  validate: (entry: RotaEntry, allEntries: RotaEntry[]) => RuleViolation[]
}

interface WeeklyScheduleSummary {
  carerId: string
  weekStart: Date
  totalHours: number
  dayShifts: number
  nightShifts: number
  violations: RuleViolation[]
}
```

## Constants System (`src/constants.ts`)

### System Limits
```typescript
export const SYSTEM_LIMITS = {
  MAX_WEEKLY_HOURS: 36,
  MIN_COMPETENT_STAFF_PER_SHIFT: 1,
  NIGHT_TO_DAY_REST_HOURS: 48,
  INVITATION_EXPIRY_DAYS: 7,
  SOFT_DELETE_RETENTION_DAYS: 30
}
```

### API Endpoints
```typescript
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  CARERS: '/api/carers',
  CARE_PACKAGES: '/api/care-packages',
  TASKS: '/api/tasks',
  ASSESSMENTS: '/api/assessments',
  // ... complete endpoint mapping
}
```

### Error Messages
```typescript
export const ERROR_MESSAGES = {
  AUTHENTICATION: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    TOKEN_EXPIRED: 'Your session has expired',
    UNAUTHORIZED: 'You are not authorized to perform this action'
  },
  VALIDATION: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    INVALID_POSTCODE: 'Please enter a valid UK postcode'
  }
  // ... categorized error messages
}
```

## Development Usage

### Import Patterns
```typescript
// Client usage (React components)
import { Carer, CompetencyLevel, ApiResponse } from '@caretrack/shared'

// Server usage (API controllers)
import { CreateTaskRequest, ValidationError } from '@caretrack/shared'
```

### Type Safety Enforcement
```typescript
// Ensures consistency between client and server
const createCarer = async (data: CreateCarerRequest): Promise<ApiResponse<Carer>> => {
  // Implementation guaranteed to match types
}
```

### Enum Usage
```typescript
// Consistent enum values across client/server
if (competency.level === CompetencyLevel.COMPETENT) {
  // Type-safe competency checking
}
```

## Build Process

### Development
```bash
npm run dev        # Watch mode compilation
```

### Production
```bash
npm run build      # Compile TypeScript to JavaScript
npm run clean      # Remove dist folder
```

### Distribution
- **Output**: Compiled JavaScript in `/dist/`
- **Types**: TypeScript declarations included
- **Imports**: ESM module format
- **Consumption**: Used by both client and server packages

## Version Management

The shared package version should be updated when:
1. Adding new types or interfaces
2. Modifying existing type structures
3. Adding new constants or utilities
4. Breaking changes to API contracts

Both client and server `package.json` should reference the same shared version to ensure type consistency across the monorepo.