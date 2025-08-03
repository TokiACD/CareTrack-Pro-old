# PRISMA CLAUDE.md

This file provides guidance for working with the Prisma ORM database layer in CareTrack Pro.

## Prisma Architecture Overview

The Prisma directory contains the complete database schema, migrations, and seeding configuration for the care management system with PostgreSQL.

## Directory Structure & Files

### Core Configuration Files

**`schema.prisma`** - Database Schema Definition
- Complete data model with 12+ entities
- Relationship definitions and constraints
- Index specifications for performance
- Enum definitions for structured data
- Database connection configuration

**`seed.ts`** - Database Seeding Script
- Initial admin user creation
- Sample data for development
- Default system configuration
- Test data for all major entities

**`/migrations/`** - Database Migration History
- Timestamped migration files
- Schema evolution tracking
- Rollback capability
- Production deployment history

## Database Schema Architecture

### Core Entity Relationships

```
AdminUser (1) ──┬──< Invitation (many)
                ├──< AuditLog (many)
                ├──< AssessmentResponse (many)
                ├──< CompetencyRating (many)
                ├──< RotaEntry (many)
                └──< Shift (many)

Carer (1) ──────┬──< CarerPackageAssignment (many)
                ├──< AssessmentResponse (many)
                ├──< CompetencyRating (many)
                ├──< RotaEntry (many)
                ├──< ShiftAssignment (many)
                └──< TaskProgress (many)

CarePackage (1) ┬──< CarerPackageAssignment (many)
                ├──< PackageTaskAssignment (many)
                ├──< RotaEntry (many)
                ├──< Shift (many)
                └──< TaskProgress (many)

Task (1) ───────┬──< PackageTaskAssignment (many)
                ├──< AssessmentTaskCoverage (many)
                ├──< CompetencyRating (many)
                └──< TaskProgress (many)

Assessment (1) ─┬──< KnowledgeQuestion (many)
                ├──< PracticalSkill (many)
                ├──< EmergencyQuestion (many)
                ├──< AssessmentTaskCoverage (many)
                └──< AssessmentResponse (many)
```

### Entity Definitions

**User Management Entities:**

```prisma
model AdminUser {
  id                  String               @id @default(cuid())
  email               String               @unique
  name                String
  passwordHash        String               @map("password_hash")
  isActive            Boolean              @default(true) @map("is_active")
  createdAt           DateTime             @default(now()) @map("created_at")
  updatedAt           DateTime             @updatedAt @map("updated_at")
  deletedAt           DateTime?            @map("deleted_at")
  invitedBy           String?              @map("invited_by")
  lastLogin           DateTime?            @map("last_login")
  phone               String
  
  // Self-referencing invitation hierarchy
  invitedByAdmin      AdminUser?           @relation("AdminInvites", fields: [invitedBy], references: [id])
  invitedAdmins       AdminUser[]          @relation("AdminInvites")
  
  // System relationships
  assessmentResponses AssessmentResponse[]
  auditLogs           AuditLog[]
  competencyRatings   CompetencyRating[]
  sentInvitations     Invitation[]
  rotaEntries         RotaEntry[]
  shifts              Shift[]

  @@map("admin_users")
}

model Carer {
  id                  String                   @id @default(cuid())
  email               String                   @unique
  name                String
  phone               String
  isActive            Boolean                  @default(true) @map("is_active")
  createdAt           DateTime                 @default(now()) @map("created_at")
  updatedAt           DateTime                 @updatedAt @map("updated_at")
  deletedAt           DateTime?                @map("deleted_at")
  
  // Care management relationships
  assessmentResponses AssessmentResponse[]
  packageAssignments  CarerPackageAssignment[]
  competencyRatings   CompetencyRating[]
  rotaEntries         RotaEntry[]
  shiftAssignments    ShiftAssignment[]
  taskProgress        TaskProgress[]

  @@map("carers")
}
```

**Care Management Entities:**

```prisma
model CarePackage {
  id               String                   @id @default(cuid())
  name             String
  postcode         String                   // UK postcode outward code (3 digits)
  isActive         Boolean                  @default(true) @map("is_active")
  createdAt        DateTime                 @default(now()) @map("created_at")
  updatedAt        DateTime                 @updatedAt @map("updated_at")
  deletedAt        DateTime?                @map("deleted_at")
  
  // Assignment relationships
  carerAssignments CarerPackageAssignment[]
  taskAssignments  PackageTaskAssignment[]
  rotaEntries      RotaEntry[]
  shifts           Shift[]
  taskProgress     TaskProgress[]

  @@map("care_packages")
}

model Task {
  id                     String                   @id @default(cuid())
  name                   String
  targetCount            Int                      @map("target_count")
  isActive               Boolean                  @default(true) @map("is_active")
  createdAt              DateTime                 @default(now()) @map("created_at")
  updatedAt              DateTime                 @updatedAt @map("updated_at")
  deletedAt              DateTime?                @map("deleted_at")
  
  // Assessment and competency relationships
  assessmentTaskCoverage AssessmentTaskCoverage[]
  competencyRatings      CompetencyRating[]
  packageAssignments     PackageTaskAssignment[]
  taskProgress           TaskProgress[]

  @@map("tasks")
}
```

**Assignment Entities (Many-to-Many Relationships):**

```prisma
model CarerPackageAssignment {
  id         String      @id @default(cuid())
  carerId    String      @map("carer_id")
  packageId  String      @map("package_id")
  assignedAt DateTime    @default(now()) @map("assigned_at")
  isActive   Boolean     @default(true) @map("is_active")
  
  carer      Carer       @relation(fields: [carerId], references: [id], onDelete: Cascade)
  package    CarePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@unique([carerId, packageId])
  @@map("carer_package_assignments")
}

model PackageTaskAssignment {
  id         String      @id @default(cuid())
  packageId  String      @map("package_id")
  taskId     String      @map("task_id")
  assignedAt DateTime    @default(now()) @map("assigned_at")
  isActive   Boolean     @default(true) @map("is_active")
  
  package    CarePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
  task       Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([packageId, taskId])
  @@map("package_task_assignments")
}
```

**Assessment System Entities:**

```prisma
model Assessment {
  id                  String                   @id @default(cuid())
  name                String
  displayTaskId       String?                  @map("display_task_id")
  isActive            Boolean                  @default(true) @map("is_active")
  createdAt           DateTime                 @default(now()) @map("created_at")
  updatedAt           DateTime                 @updatedAt @map("updated_at")
  deletedAt           DateTime?                @map("deleted_at")
  
  // 4-section assessment structure
  assessmentResponses AssessmentResponse[]
  tasksCovered        AssessmentTaskCoverage[]
  emergencyQuestions  EmergencyQuestion[]
  knowledgeQuestions  KnowledgeQuestion[]
  practicalSkills     PracticalSkill[]

  @@map("assessments")
}

// Section 1: Knowledge Questions
model KnowledgeQuestion {
  id                 String              @id @default(cuid())
  assessmentId       String              @map("assessment_id")
  question           String
  modelAnswer        String              @map("model_answer")
  order              Int
  
  assessment         Assessment          @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  knowledgeResponses KnowledgeResponse[]

  @@map("knowledge_questions")
}

// Section 2: Practical Skills
model PracticalSkill {
  id                 String              @id @default(cuid())
  assessmentId       String              @map("assessment_id")
  skillDescription   String              @map("skill_description")
  canBeNotApplicable Boolean             @default(false) @map("can_be_not_applicable")
  order              Int
  
  practicalResponses PracticalResponse[]
  assessment         Assessment          @relation(fields: [assessmentId], references: [id], onDelete: Cascade)

  @@map("practical_skills")
}

// Section 3: Emergency Questions
model EmergencyQuestion {
  id                 String              @id @default(cuid())
  assessmentId       String              @map("assessment_id")
  question           String
  modelAnswer        String              @map("model_answer")
  order              Int
  
  assessment         Assessment          @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  emergencyResponses EmergencyResponse[]

  @@map("emergency_questions")
}

// Section 4: Task Coverage
model AssessmentTaskCoverage {
  id           String     @id @default(cuid())
  assessmentId String     @map("assessment_id")
  taskId       String     @map("task_id")
  
  assessment   Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  task         Task       @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([assessmentId, taskId])
  @@map("assessment_task_coverage")
}
```

**Progress & Competency Entities:**

```prisma
model TaskProgress {
  id                   String      @id @default(cuid())
  carerId              String      @map("carer_id")
  packageId            String      @map("package_id")
  taskId               String      @map("task_id")
  completionCount      Int         @default(0) @map("completion_count")
  completionPercentage Int         @default(0) @map("completion_percentage")
  lastUpdated          DateTime    @updatedAt @map("last_updated")
  
  carer                Carer       @relation(fields: [carerId], references: [id], onDelete: Cascade)
  package              CarePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)
  task                 Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([carerId, packageId, taskId])
  @@map("task_progress")
}

model CompetencyRating {
  id                   String              @id @default(cuid())
  carerId              String              @map("carer_id")
  taskId               String              @map("task_id")
  level                CompetencyLevel
  source               CompetencySource
  assessmentResponseId String?             @map("assessment_response_id")
  setByAdminId         String?             @map("set_by_admin_id")
  setByAdminName       String?             @map("set_by_admin_name")
  setAt                DateTime            @default(now()) @map("set_at")
  notes                String?
  
  assessmentResponse   AssessmentResponse? @relation(fields: [assessmentResponseId], references: [id])
  carer                Carer               @relation(fields: [carerId], references: [id], onDelete: Cascade)
  setByAdmin           AdminUser?          @relation(fields: [setByAdminId], references: [id])
  task                 Task                @relation(fields: [taskId], references: [id], onDelete: Cascade)

  @@unique([carerId, taskId])
  @@map("competency_ratings")
}
```

**Scheduling Entities:**

```prisma
model Shift {
  id                   String            @id @default(cuid())
  packageId            String            @map("package_id")
  name                 String
  description          String
  requiredCompetencies String[]          @map("required_competencies")
  isCompetentOnly      Boolean           @default(false) @map("is_competent_only")
  createdAt            DateTime          @default(now()) @map("created_at")
  createdByAdminId     String            @map("created_by_admin_id")
  
  assignments          ShiftAssignment[]
  createdBy            AdminUser         @relation(fields: [createdByAdminId], references: [id])
  package              CarePackage       @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@map("shifts")
}

model RotaEntry {
  id               String      @id @default(cuid())
  packageId        String      @map("package_id")
  carerId          String      @map("carer_id")
  date             DateTime
  shiftType        ShiftType   @map("shift_type")
  startTime        String      @map("start_time")
  endTime          String      @map("end_time")
  isConfirmed      Boolean     @default(false) @map("is_confirmed")
  createdAt        DateTime    @default(now()) @map("created_at")
  createdByAdminId String      @map("created_by_admin_id")
  
  carer            Carer       @relation(fields: [carerId], references: [id], onDelete: Cascade)
  createdBy        AdminUser   @relation(fields: [createdByAdminId], references: [id])
  package          CarePackage @relation(fields: [packageId], references: [id], onDelete: Cascade)

  @@map("rota_entries")
}
```

**System Entities:**

```prisma
model AuditLog {
  id                   String    @id @default(cuid())
  action               String
  entityType           String    @map("entity_type")
  entityId             String    @map("entity_id")
  oldValues            Json?     @map("old_values")
  newValues            Json?     @map("new_values")
  performedByAdminId   String    @map("performed_by_admin_id")
  performedByAdminName String    @map("performed_by_admin_name")
  performedAt          DateTime  @default(now()) @map("performed_at")
  ipAddress            String?   @map("ip_address")
  userAgent            String?   @map("user_agent")
  
  performedBy          AdminUser @relation(fields: [performedByAdminId], references: [id])

  @@map("audit_logs")
}

model Invitation {
  id             String           @id @default(cuid())
  email          String           @unique
  userType       InvitationType   @map("user_type")
  token          String           @unique
  name           String?
  phone          String?
  invitedBy      String           @map("invited_by")
  invitedAt      DateTime         @default(now()) @map("invited_at")
  expiresAt      DateTime         @map("expires_at")
  acceptedAt     DateTime?        @map("accepted_at")
  declinedAt     DateTime?        @map("declined_at")
  status         InvitationStatus @default(PENDING)
  
  invitedByAdmin AdminUser        @relation(fields: [invitedBy], references: [id])

  @@map("invitations")
}
```

### Enum Definitions

**Competency System Enums:**
```prisma
enum CompetencyLevel {
  NOT_ASSESSED      // No evaluation completed
  NOT_COMPETENT     // Requires training/support
  ADVANCED_BEGINNER // Basic skills demonstrated
  COMPETENT         // Meets required standards
  PROFICIENT        // Above average performance
  EXPERT            // Advanced practitioner level
}

enum CompetencySource {
  ASSESSMENT  // Derived from assessment completion
  MANUAL      // Set manually by administrator (takes precedence)
}

enum PracticalRating {
  COMPETENT        // Skill demonstrated competently
  NEEDS_SUPPORT    // Requires additional support
  NOT_APPLICABLE   // Skill not applicable to role
}
```

**Scheduling Enums:**
```prisma
enum ShiftStatus {
  PENDING    // Shift assigned but not confirmed
  CONFIRMED  // Shift confirmed by carer
  CANCELLED  // Shift cancelled
  COMPLETED  // Shift completed
}

enum ShiftType {
  DAY    // Day shift (typically 07:00-19:00)
  NIGHT  // Night shift (typically 19:00-07:00)
}
```

**User Management Enums:**
```prisma
enum InvitationType {
  ADMIN  // Admin user invitation
  CARER  // Carer user invitation
}

enum InvitationStatus {
  PENDING   // Invitation sent, awaiting response
  ACCEPTED  // Invitation accepted, account created
  DECLINED  // Invitation declined
  EXPIRED   // Invitation token expired
}
```

## Database Development Commands

### Schema Management
```bash
# Generate Prisma client after schema changes
npx prisma generate

# Create new migration
npx prisma migrate dev --name migration_description

# Apply migrations to production
npx prisma migrate deploy

# Reset database (development only)
npx prisma migrate reset --force
```

### Database Utilities
```bash
# Open Prisma Studio (database GUI)
npx prisma studio

# View database schema
npx prisma db pull

# Seed database with initial data
npx prisma db seed

# Format schema file
npx prisma format
```

## Common Query Patterns

### Soft Delete Queries
```typescript
// Query active records only
const activeCarers = await prisma.carer.findMany({
  where: { deletedAt: null }
})

// Include deleted records
const allCarers = await prisma.carer.findMany({
  where: {} // No deletedAt filter
})

// Soft delete record
await prisma.carer.update({
  where: { id: carerId },
  data: { deletedAt: new Date() }
})

// Restore soft deleted record
await prisma.carer.update({
  where: { id: carerId },
  data: { deletedAt: null }
})
```

### Complex Relationship Queries
```typescript
// Carer with all related data
const carerWithData = await prisma.carer.findUnique({
  where: { id: carerId },
  include: {
    packageAssignments: {
      include: {
        package: true
      }
    },
    competencyRatings: {
      include: {
        task: true
      }
    },
    taskProgress: {
      include: {
        task: true,
        package: true
      }
    }
  }
})

// Assessment with complete structure
const assessmentComplete = await prisma.assessment.findUnique({
  where: { id: assessmentId },
  include: {
    knowledgeQuestions: { orderBy: { order: 'asc' } },
    practicalSkills: { orderBy: { order: 'asc' } },
    emergencyQuestions: { orderBy: { order: 'asc' } },
    tasksCovered: {
      include: { task: true }
    }
  }
})
```

### Progress Calculation Queries
```typescript
// Calculate carer progress across packages
const carerProgress = await prisma.taskProgress.findMany({
  where: {
    carerId: carerId,
    carer: { deletedAt: null },
    package: { deletedAt: null },
    task: { deletedAt: null }
  },
  include: {
    task: true,
    package: true
  }
})

// Aggregate progress data
const progressSummary = await prisma.taskProgress.aggregate({
  where: { carerId: carerId },
  _avg: { completionPercentage: true },
  _count: { id: true }
})
```

### Competency System Queries
```typescript
// Get carer competencies with task details
const competencies = await prisma.competencyRating.findMany({
  where: { carerId: carerId },
  include: {
    task: true,
    assessmentResponse: {
      include: {
        assessment: true
      }
    }
  },
  orderBy: { setAt: 'desc' }
})

// Find carers competent for specific tasks
const competentCarers = await prisma.carer.findMany({
  where: {
    deletedAt: null,
    competencyRatings: {
      some: {
        taskId: { in: requiredTaskIds },
        level: { in: ['COMPETENT', 'PROFICIENT', 'EXPERT'] }
      }
    }
  },
  include: {
    competencyRatings: {
      where: { taskId: { in: requiredTaskIds } }
    }
  }
})
```

### Scheduling Queries
```typescript
// Get weekly schedule for carer
const weeklySchedule = await prisma.rotaEntry.findMany({
  where: {
    carerId: carerId,
    date: {
      gte: weekStart,
      lt: weekEnd
    }
  },
  include: {
    package: true
  },
  orderBy: { date: 'asc' }
})

// Calculate weekly hours
const weeklyHours = await prisma.rotaEntry.aggregate({
  where: {
    carerId: carerId,
    date: { gte: weekStart, lt: weekEnd }
  },
  _sum: {
    // Hours calculated in application logic
  }
})
```

### Assignment Management
```typescript
// Assign carer to package with conflict checking
const assignment = await prisma.$transaction(async (tx) => {
  // Check for existing assignment
  const existing = await tx.carerPackageAssignment.findFirst({
    where: { carerId, packageId, isActive: true }
  })
  
  if (existing) {
    throw new Error('Carer already assigned to package')
  }
  
  // Create assignment
  return await tx.carerPackageAssignment.create({
    data: { carerId, packageId, isActive: true }
  })
})
```

## Database Performance Considerations

### Indexing Strategy
```prisma
// Important indexes (automatically created by Prisma)
@@unique([carerId, packageId])  // Unique constraints create indexes
@@unique([carerId, taskId])     // Prevents duplicate competency ratings

// Additional indexes for performance (manually added)
@@index([deletedAt])           // Fast soft delete filtering
@@index([createdAt])           // Temporal queries
@@index([isActive])            // Active record filtering
```

### Query Optimization
- Use `select` instead of `include` when only specific fields needed
- Implement proper pagination with `skip` and `take`
- Use transactions for related operations
- Monitor query performance with Prisma logging

### Connection Management
```typescript
// Connection pooling configuration
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// Connection limits in production
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=60"
```

## Migration Best Practices

### Development Workflow
1. Modify `schema.prisma`
2. Run `npx prisma migrate dev --name descriptive_name`
3. Review generated migration SQL
4. Test migration with existing data
5. Commit schema and migration files

### Production Deployment
1. Review all pending migrations
2. Backup database before applying migrations
3. Run `npx prisma migrate deploy` in production
4. Verify migration success
5. Monitor application for issues

### Data Migration Patterns
```sql
-- Example: Adding new enum value safely
ALTER TYPE "CompetencyLevel" ADD VALUE 'ADVANCED_EXPERT';

-- Example: Backfilling data
UPDATE "tasks" SET "target_count" = 100 WHERE "target_count" IS NULL;

-- Example: Creating indexes
CREATE INDEX CONCURRENTLY "idx_audit_logs_performed_at" ON "audit_logs"("performed_at");
```

## Seeding Strategy

### Development Seed Data
```typescript
// Create admin user
const admin = await prisma.adminUser.create({
  data: {
    email: 'admin@caretrack.com',
    name: 'System Administrator',
    passwordHash: await bcrypt.hash('admin123', 10),
    phone: '+44 1234 567890'
  }
})

// Create sample carers
const carers = await Promise.all([
  // Sample carer data
])

// Create care packages
const packages = await Promise.all([
  // Sample package data
])

// Create tasks with target counts
const tasks = await Promise.all([
  // Sample task data
])
```

### Production Seed Data
- Essential system configuration
- Default admin account
- Initial competency levels
- System constants and limits

## Backup and Recovery

### Database Backup Strategy
```bash
# Full database backup
pg_dump caretrack_pro > backup_$(date +%Y%m%d_%H%M%S).sql

# Schema-only backup
pg_dump --schema-only caretrack_pro > schema_backup.sql

# Data-only backup
pg_dump --data-only caretrack_pro > data_backup.sql
```

### Disaster Recovery
1. Restore from latest backup
2. Apply any pending migrations
3. Verify data integrity
4. Test application functionality
5. Monitor for issues