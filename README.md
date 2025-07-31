# CareTrack Pro - Care Management System

A comprehensive admin web application for managing carers, care packages, tasks, assessments, and scheduling.

## 🏗️ Architecture

- **Frontend**: React 18 + TypeScript + Material-UI + React Query
- **Backend**: Node.js + Express + TypeScript + Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with email invite system

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- Docker Desktop (with WSL2 integration if on Windows)
- npm or yarn

### 1. Clone and Navigate
```bash
cd /path/to/CareTrack-Pro
```

### 2. One-Command Setup (Recommended)
```bash
npm run setup:dev
```
This single command:
- ✅ Starts PostgreSQL container
- ✅ Installs all dependencies
- ✅ Builds shared packages
- ✅ Runs database migrations
- ✅ Seeds initial data
- ✅ Ready to develop!

### 3. Start Development
```bash
npm run dev
```
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001
- **Database**: PostgreSQL on port 5432

### 4. Login
Default admin credentials (change after first login):
- **Email**: admin@caretrack.com
- **Password**: admin123

### 5. Optional: Database GUI
```bash
npm run db:studio
```
Opens Prisma Studio at http://localhost:5555

## 🐳 Docker Setup Details

The system uses Docker for PostgreSQL:
- **Container**: PostgreSQL 15 Alpine
- **Database**: caretrack_pro
- **Username**: caretrack
- **Password**: dev_password
- **Data**: Persists between restarts

### Docker Commands
```bash
npm run docker:up      # Start PostgreSQL container
npm run docker:down    # Stop container
npm run docker:logs    # View container logs
npm run docker:clean   # Remove container and data (careful!)
```

## 📊 Dashboard Features

### 10 Core Management Cards

1. **Users** - Manage admin and carer accounts with soft delete
2. **Care Packages** - Manage care packages (name + 3-digit postcode)
3. **Tasks** - Create tasks with completion targets
4. **Assignments** - Assign carers and tasks to packages
5. **Assessments** - 4-section competency assessments
6. **Progress** - Individual carer progress tracking with PDF export
7. **Shift Sender** - Send shifts based on competency
8. **Rota** - Drag-and-drop scheduling with rule validation
9. **Recycle Bin** - Manage soft-deleted items (30-day retention)
10. **Audit Login** - System activity tracking

### Key Features

- **Email Invite System**: Admin accounts created by invitation only
- **Soft Delete**: All entities support soft delete with restore capability
- **Competency System**: Assessment-based and manual competency ratings
- **Progress Tracking**: Package-specific task completion tracking
- **PDF Generation**: Carer progress reports with assessment details
- **Complex Scheduling**: Rule-based rota with automatic validation
- **Real-time Updates**: Live dashboard with activity monitoring

## 🛠️ Development Commands

```bash
# Setup
npm run setup:dev     # Complete development setup (one command)
npm run install:all   # Install all workspace dependencies

# Docker & Database
npm run docker:up     # Start PostgreSQL container
npm run docker:down   # Stop PostgreSQL container
npm run docker:logs   # View PostgreSQL logs
npm run docker:clean  # Remove container and data (careful!)

# Database Management
npm run db:generate   # Generate Prisma client
npm run db:migrate    # Run migrations
npm run db:studio     # Open Prisma Studio (http://localhost:5555)
npm run db:seed       # Seed sample data
npm run db:reset      # Reset database (careful!)

# Development
npm run dev           # Start both client & server
npm run dev:client    # Start frontend only (http://localhost:3000)
npm run dev:server    # Start backend only (http://localhost:3001)

# Building
npm run build         # Build all packages
npm run build:client  # Build frontend
npm run build:server  # Build backend
npm run build:shared  # Build shared types

# Type checking
npm run type-check    # Check TypeScript in server
```

## 📋 System Requirements

### Scheduling Rules (Rota Card)
- 36-hour weekly maximum per carer
- 1 competent staff member minimum per shift
- 1 week days → 1 week nights rotation
- No consecutive weekends
- 48-hour rest between night-to-day shifts

### Assessment System
- **Section 1**: Knowledge questions with model answers
- **Section 2**: Practical skills with competency ratings
- **Section 3**: Emergency scenarios with model answers  
- **Section 4**: Task coverage selection

### Competency Levels
- Not Assessed → Not Competent → Advanced Beginner → Competent → Proficient → Expert
- Manual ratings take precedence over assessment results
- Package-specific progress tracking

## 🔧 Environment Variables

Environment files are pre-configured for development with Docker:

### Server (.env) - Pre-configured
```bash
# Database (Docker PostgreSQL)
DATABASE_URL="postgresql://caretrack:dev_password@localhost:5432/caretrack_pro?schema=public"

# JWT Authentication
JWT_SECRET="caretrack-pro-development-secret-key-change-in-production"
JWT_EXPIRES_IN="8h"

# Email (Configure with real SMTP for invitations)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FRONTEND_URL="http://localhost:3000"
```

### Client (.env) - Pre-configured
```bash
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_NODE_ENV=development
```

**Note**: Email configuration is optional for development. Admin invitations will work but emails won't be sent unless SMTP is configured.

## 🎯 Implementation Status

### ✅ Phase 1: Core Infrastructure (COMPLETE)
- [x] Monorepo project structure (client/server/shared)
- [x] React 18 + TypeScript + Material-UI frontend
- [x] Node.js + Express + TypeScript backend
- [x] PostgreSQL with Docker setup
- [x] Prisma ORM with 12-entity schema
- [x] JWT authentication with email invites
- [x] Admin dashboard with 10 card layout
- [x] Error handling and loading states
- [x] Audit logging system
- [x] Development workflow with Docker
- [x] One-command setup script

### 🚧 Phase 2: Dashboard Card Implementation (NEXT)
- [ ] **Users Card** - Admin/Carer management with soft delete
- [ ] **Care Packages Card** - CRUD with postcode validation
- [ ] **Tasks Card** - Target count management
- [ ] **Assignments Card** - Many-to-many relationships
- [ ] **Assessments Card** - 4-section assessment builder
- [ ] **Progress Card** - Progress tracking + PDF generation
- [ ] **Shift Sender Card** - Competency-based shift assignment
- [ ] **Rota Card** - Drag-and-drop scheduling with rules
- [ ] **Recycle Bin Card** - Soft delete management
- [ ] **Audit Login Card** - Activity logging display

### 🔮 Phase 3: Advanced Features (PLANNED)
- [ ] Real-time progress calculations
- [ ] Complex scheduling rule validation
- [ ] PDF generation system
- [ ] Email notification system
- [ ] Advanced search and filtering
- [ ] Performance optimization

## 🔒 Security Features

- JWT token authentication
- Password hashing with bcrypt
- Request rate limiting
- Input validation and sanitization
- CORS protection
- SQL injection prevention via Prisma
- Audit trail for all actions

## 📱 Mobile Responsive

- Mobile-first design with Material-UI breakpoints
- Touch-friendly interfaces
- Responsive dashboard cards
- Optimized forms for mobile input

## 🎨 UI/UX Design

- Clean Material Design interface
- Consistent color coding for competency levels
- Intuitive navigation with breadcrumbs
- Loading states and error boundaries
- Accessibility compliance (WCAG 2.1)

---

## 🔗 API Endpoints

All endpoints require authentication except `/api/auth/login`.

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/logout` - Logout  
- `GET /api/auth/verify` - Verify token
- `POST /api/auth/invite` - Invite new admin

### Dashboard Cards
- `GET /api/dashboard/summary` - Dashboard overview
- `GET /api/admin-users` - List admins
- `GET /api/carers` - List carers
- `GET /api/care-packages` - List care packages
- `GET /api/tasks` - List tasks
- `GET /api/assignments` - List assignments
- `GET /api/assessments` - List assessments
- `GET /api/progress/:carerId` - Carer progress
- `GET /api/audit` - Audit logs
- `GET /api/recycle-bin` - Deleted items

## 📄 License

Private - CareTrack Pro Care Management System