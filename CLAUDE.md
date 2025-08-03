# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Architecture

CareTrack Pro is a comprehensive care management system built with a monorepo structure:

- **Frontend**: React 18 + TypeScript + Material-UI + React Query (in `client/`)
- **Backend**: Node.js + Express + TypeScript + Prisma ORM (in `server/`)
- **Database**: PostgreSQL (containerized with Docker)
- **Shared**: Common types and utilities (in `shared/`)

The application manages carers, care packages, tasks, assessments, and scheduling with a sophisticated permission and competency system.

## Essential Development Commands

### Setup & Environment
```bash
# Complete development setup (one command does everything)
npm run setup:dev

# Start both frontend and backend for development
npm run dev

# Install dependencies across all workspaces
npm run install:all
```

### Database Management
```bash
# Generate Prisma client after schema changes
npm run db:generate

# Run database migrations
npm run db:migrate

# Open Prisma Studio (GUI for database)
npm run db:studio

# Seed development data
npm run db:seed

# Reset database (destructive)
npm run db:reset
```

### Docker & PostgreSQL
```bash
# Start PostgreSQL container
npm run docker:up

# Stop PostgreSQL container
npm run docker:down

# View PostgreSQL logs
npm run docker:logs

# Remove container and data (careful!)
npm run docker:clean
```

### Building & Type Checking
```bash
# Build all packages
npm run build

# Build individual packages
npm run build:client
npm run build:server
npm run build:shared

# Type check server code
npm run type-check
```

### Linting
```bash
# Client linting
cd client && npm run lint

# Server linting  
cd server && npm run lint
```

## Database Schema Architecture

The system uses Prisma ORM with PostgreSQL. Key entities:

- **AdminUser**: System administrators with invitation capabilities
- **Carer**: Care workers with competency ratings and progress tracking
- **CarePackage**: Care locations with 3-digit UK postcodes
- **Task**: Activities with target completion counts
- **Assessment**: 4-section competency evaluations
- **CompetencyRating**: Skills assessment (NOT_ASSESSED → EXPERT levels)
- **TaskProgress**: Package-specific completion tracking
- **RotaEntry**: Scheduling with complex validation rules
- **Invitation**: Secure token-based user onboarding

All entities support soft deletion with `deletedAt` timestamps.

## Authentication & Security

- JWT token authentication with 8-hour expiration
- Password hashing with bcrypt
- Email-based invitation system with secure tokens
- Rate limiting and CORS protection
- Audit logging for all administrative actions
- Soft delete with 30-day retention policy

## Frontend Architecture

### State Management
- React Query for server state and caching
- React Context for authentication state
- Custom hooks for data fetching and mutations

### Key Patterns
- Protected routes with `ProtectedRoute` component
- Centralized API service with axios interceptors
- Material-UI theming and responsive design
- Form handling with react-hook-form
- Error boundaries and loading states

### API Integration
The frontend uses a centralized `apiService` class that:
- Automatically adds JWT tokens to requests
- Handles 401 redirects to login
- Transforms errors to standard format
- Supports file upload/download

## Backend Architecture

### Route Structure
All API routes are in `server/src/routes/`:
- `/api/auth` - Authentication endpoints
- `/api/invitations` - User invitation management
- `/api/carers` - Carer CRUD operations
- `/api/care-packages` - Care package management
- `/api/tasks` - Task management
- `/api/assessments` - Assessment system
- `/api/progress` - Progress tracking and PDF generation
- `/api/rota` - Scheduling with rule validation
- `/api/audit` - Activity logging

### Database Patterns
- All operations use Prisma ORM
- Soft delete pattern: `deletedAt: null` for active records
- Audit logging for tracked operations
- Relationship loading with Prisma includes
- Transaction support for complex operations

### Email System
- SendGrid integration for production
- SMTP fallback for development
- Professional HTML email templates
- Invitation and notification sending

## Competency & Assessment System

### Competency Levels (in priority order)
1. `NOT_ASSESSED` - No evaluation yet
2. `NOT_COMPETENT` - Requires training
3. `ADVANCED_BEGINNER` - Basic skills
4. `COMPETENT` - Meets standards
5. `PROFICIENT` - Above average
6. `EXPERT` - Advanced practitioner

### Assessment Structure
- **Section 1**: Knowledge questions with model answers
- **Section 2**: Practical skills with competency ratings
- **Section 3**: Emergency scenarios with model answers
- **Section 4**: Task coverage selection

### Competency Sources
- `ASSESSMENT` - Derived from assessment completion
- `MANUAL` - Set by administrators (takes precedence)

## Scheduling Rules System

The rota system enforces complex scheduling rules:
- 36-hour weekly maximum per carer
- Minimum 1 competent staff per shift
- Day/night rotation requirements
- No consecutive weekends
- 48-hour rest between night-to-day shifts

## Complete File Structure

**🔍 TIP**: For detailed guidance on specific areas, refer to the CLAUDE.md files in each major subfolder. Use the Read tool to access these specialized guides:
- `client/CLAUDE.md` - React frontend guidance
- `server/CLAUDE.md` - Node.js backend guidance  
- `shared/CLAUDE.md` - TypeScript types and constants
- `client/src/CLAUDE.md` - Frontend source code structure
- `server/src/CLAUDE.md` - Backend source code structure
- `server/prisma/CLAUDE.md` - Database schema and Prisma ORM

### 📁 Root Level Structure
```
CareTrack-Pro/
├── 📁 client/                    # React frontend application
├── 📁 server/                    # Node.js backend API
├── 📁 shared/                    # Shared TypeScript types & utilities
├── 📁 Docs/                      # Project documentation
├── 📁 postgres_data/             # Docker PostgreSQL data (gitignored)
├── 📄 package.json               # Root workspace configuration
├── 📄 docker-compose.yml         # PostgreSQL container setup
├── 📄 README.md                  # Main project documentation
├── 📄 CLAUDE.md                  # This file - main AI guidance
└── 📄 Setup files               # EMAIL_SETUP.md, SENDGRID_SETUP.md, etc.
```

### 📁 CLIENT (`/client/`) - React Frontend
**See `client/CLAUDE.md` for detailed frontend guidance**

#### Entry Points & Configuration
- **`index.html`** - Main HTML template with React root
- **`src/main.tsx`** - React app entry point with providers setup
- **`src/App.tsx`** - Main router with protected/public routes
- **`vite.config.ts`** - Vite build configuration
- **`package.json`** - Frontend dependencies (React 18, Material-UI, React Query)

#### Source Code Structure (`/src/`)
**See `client/src/CLAUDE.md` for detailed source code guidance**

**`/contexts/`** - React Context Providers
- **`AuthContext.tsx`** - JWT authentication state management
- **`NotificationContext.tsx`** - Global notification system

**`/pages/`** - Route Components
- **`LoginPage.tsx`** - Admin login form
- **`DashboardPage.tsx`** - Main dashboard with 10 management cards
- **`AcceptInvitationPage.tsx`** - Multi-step invitation acceptance
- **`TasksPage.tsx`** - Task management interface
- **`AssessmentsPage.tsx`** - Assessment listing and management
- **`CreateAssessmentPage.tsx`** - Assessment builder (4 sections)
- **`AssignmentsPage.tsx`** - Assignment management
- **Plus password reset and email change pages**

**`/components/`** - Reusable UI Components
- **`/auth/ProtectedRoute.tsx`** - Authentication wrapper
- **`/common/LoadingScreen.tsx`** - Loading spinner
- **`/dashboard/`** - Dashboard cards (DashboardCard, UsersCard, CarePackagesCard)
- **`/profile/EmailChangeDialog.tsx`** - Email change dialog

**`/hooks/`** - Custom React Hooks
- **`useSmartMutation.ts`** - Enhanced React Query mutation
- **`invalidationRules.ts`** - Cache invalidation configuration

**`/services/`** - API Integration
- **`api.ts`** - Axios HTTP client with interceptors
- **`authService.ts`** - Authentication API calls

#### Configuration Files
- **`theme.ts`** - Material-UI theme with competency colors
- **`vite-env.d.ts`** - TypeScript environment definitions

### 📁 SERVER (`/server/`) - Node.js Backend
**See `server/CLAUDE.md` for detailed backend guidance**

#### Entry Points & Configuration
- **`src/index.ts`** - Express server setup with middleware and routes
- **`package.json`** - Backend dependencies (Express, Prisma, SendGrid, JWT)
- **`nodemon.json`** - Development auto-reload configuration
- **`tsconfig.json`** - TypeScript configuration

#### Database Layer (`/prisma/`)
**See `server/prisma/CLAUDE.md` for detailed database guidance**
- **`schema.prisma`** - Complete database schema (12+ entities)
- **`seed.ts`** - Database seeding with admin user and sample data
- **`/migrations/`** - Database migration history

#### Source Code Structure (`/src/`)
**See `server/src/CLAUDE.md` for detailed source code guidance**

**`/routes/`** - API Endpoint Definitions
- **`authRoutes.ts`** - Authentication (`/api/auth/*`)
- **`invitationRoutes.ts`** - Invitation system (`/api/invitations/*`)
- **`adminUserRoutes.ts`** - Admin user management
- **`carerRoutes.ts`** - Carer management with competencies
- **`carePackageRoutes.ts`** - Care package CRUD
- **`taskRoutes.ts`** - Task management
- **`assignmentRoutes.ts`** - Assignment relationships
- **`assessmentRoutes.ts`** - Assessment creation and responses
- **`progressRoutes.ts`** - Progress tracking and PDF generation
- **`shiftRoutes.ts`** - Shift management
- **`rotaRoutes.ts`** - Scheduling with rule validation
- **`recycleBinRoutes.ts`** - Soft delete management
- **`auditRoutes.ts`** - Audit log retrieval
- **`dashboardRoutes.ts`** - Dashboard data
- **`emailChangeRoutes.ts`** - Email change handling

**`/controllers/`** - Business Logic Layer
- **`AuthController.ts`** - Authentication logic
- **`TaskController.ts`** - Task business logic
- **`AssessmentController.ts`** - Assessment and competency logic
- **`AssignmentController.ts`** - Assignment management
- **`ProgressController.ts`** - Progress tracking
- **`RotaController.ts`** - Scheduling rules engine
- **Plus additional controllers for each domain**

**`/middleware/`** - Request Processing
- **`auth.ts`** - JWT token validation
- **`audit.ts`** - Automatic audit logging
- **`errorHandler.ts`** - Global error handling
- **`validateRequest.ts`** - Input validation

**`/services/`** - External Service Integration
- **`emailService.ts`** - SendGrid and SMTP email service
- **`auditService.ts`** - Audit trail management

### 📁 SHARED (`/shared/`) - Common Types & Utilities
**See `shared/CLAUDE.md` for detailed shared code guidance**

#### Core Files
- **`src/index.ts`** - Main export file
- **`src/types.ts`** - Complete type definitions (200+ interfaces)
- **`src/constants.ts`** - System-wide constants
- **`src/utils.ts`** - Shared utility functions
- **`package.json`** - TypeScript-only package

#### Type System Highlights
- **User Types**: AdminUser, Carer with relations
- **Care Management**: CarePackage, Task, Assignment interfaces
- **Assessment System**: 4-section assessment structure
- **Progress & Competency**: TaskProgress, CompetencyRating with 6 levels
- **Scheduling**: Shift, RotaEntry with complex validation
- **System Types**: AuditLog, Invitation, API response wrappers
- **Enums**: CompetencyLevel, ShiftStatus, InvitationType, etc.

### File Locations Quick Reference

#### Configuration Files
- Database schema: `server/prisma/schema.prisma`
- Shared types: `shared/src/types.ts`
- Frontend theme: `client/src/theme.ts`
- Server environment: `server/.env`
- Client environment: `client/.env`

#### Key Entry Points
- Frontend app: `client/src/main.tsx`
- Backend server: `server/src/index.ts`
- Database client: Generated from `server/prisma/schema.prisma`

#### Important Directories
- API routes: `server/src/routes/`
- Frontend pages: `client/src/pages/`
- React components: `client/src/components/`
- Business controllers: `server/src/controllers/`
- Database migrations: `server/prisma/migrations/`

## Development Workflow

1. **Environment Setup**: Run `npm run setup:dev` for complete setup
2. **Database Changes**: Update `schema.prisma`, run `npm run db:generate` and `npm run db:migrate`
3. **Shared Types**: Update `shared/src/types.ts`, run `npm run build:shared`
4. **Frontend Development**: Use `npm run dev:client` for frontend-only development
5. **Backend Development**: Use `npm run dev:server` for backend-only development
6. **Testing**: No test framework configured - verify functionality manually
7. **Type Safety**: Run `npm run type-check` before commits

## Common Tasks

### Adding New Entities
1. Update Prisma schema in `server/prisma/schema.prisma`
2. Add corresponding TypeScript types in `shared/src/types.ts`
3. Create API routes in `server/src/routes/`
4. Generate database migration: `npm run db:migrate`
5. Build shared package: `npm run build:shared`

### Invitation System
- Admin invitations: POST `/api/invitations/admin`
- Carer invitations: POST `/api/invitations/carer`
- Accept invitation: POST `/api/invitations/accept`
- Email templates in `server/src/services/emailService.ts`

### Dashboard Cards
Each management feature is implemented as a dashboard card:
- Users, Care Packages, Tasks, Assignments
- Assessments, Progress, Shift Sender, Rota
- Recycle Bin, Audit Login

New cards should follow the existing pattern in `client/src/components/dashboard/`.

## Production Considerations

- Environment variables must be configured for email service
- Database migrations should be run in production
- Static files are served from the backend in production mode
- Rate limiting and security headers are configured
- Audit logging captures all administrative actions

## Database Connection

Development uses Docker PostgreSQL:
- **Host**: localhost:5432
- **Database**: caretrack_pro  
- **Username**: caretrack
- **Password**: dev_password

Connection string is in `server/.env` as `DATABASE_URL`.