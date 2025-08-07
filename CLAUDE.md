# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CareTrack Pro is a professional healthcare management system designed for care organizations. It's built as a monorepo with three workspaces:

- **client**: React frontend with Material-UI and Vite
- **server**: Express.js backend with Prisma ORM and PostgreSQL 
- **shared**: Common TypeScript types and utilities

The system manages carer assessments, competency tracking, shift scheduling (rota), and care package assignments with robust security and compliance features.

## Development Commands

### Quick Start
```bash
# Full development setup (first time)
npm run setup:dev

# Start both client and server in development
npm run dev

# Start individual services
npm run dev:client  # Frontend on port 5000
npm run dev:server  # Backend on port 5001
```

### Building
```bash
# Build all packages
npm run build

# Build individual packages (run in order)
npm run build:shared
npm run build:client  
npm run build:server

# Analyze client bundle
npm run build:analyze
```

### Database Management
```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Seed database with test data
npm run db:seed

# Open Prisma Studio
npm run db:studio

# Reset database (destructive)
npm run db:reset
```

### Docker Services
```bash
# Start PostgreSQL and Redis containers
npm run docker:up

# Stop containers
npm run docker:down

# View database logs
npm run docker:logs:postgres

# Clean volumes (destructive)
npm run docker:clean
```

### Testing & Quality
```bash
# Run all linting
npm run lint:all

# Run type checking
npm run type-check:all

# Run unit tests
npm run test:unit

# Run E2E tests (Playwright)
npm run test:e2e

# Run production validation tests
npm run validate:production
```

## Architecture

### Client Architecture
- **React 18** with TypeScript and Material-UI v5
- **State Management**: React Query for server state, React Context for auth
- **Routing**: React Router v6 with protected routes
- **Forms**: React Hook Form with validation
- **Build Tool**: Vite with optimized bundle splitting

Key client directories:
- `components/`: Feature-organized UI components
- `pages/`: Route-level page components  
- `hooks/`: Custom React hooks including React Query hooks
- `services/`: API client and external service integrations
- `contexts/`: React contexts for global state

### Server Architecture
- **Express.js** with comprehensive security middleware
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens with session management
- **Security**: Helmet, CORS, rate limiting, CSRF protection
- **Caching**: Redis for performance optimization

Key server directories:
- `controllers/`: Request handlers grouped by domain
- `routes/`: Express route definitions
- `middleware/`: Authentication, security, validation middleware
- `services/`: Business logic and external integrations
- `config/`: Configuration management

### Shared Package
Exports common TypeScript interfaces, types, constants, and utilities used by both client and server.

## Key Technologies & Patterns

### Authentication Flow
- JWT-based authentication with refresh tokens
- Protected routes on client with `ProtectedRoute` component
- Server middleware validates tokens and handles auth state

### Database Schema
- Prisma schema at `server/prisma/schema.prisma`
- Soft deletes using `deletedAt` timestamp pattern
- Comprehensive indexes for performance
- HIPAA compliance features (data retention, encryption fields)

### API Architecture
- RESTful endpoints under `/api` prefix
- Standardized `ApiResponse<T>` wrapper type
- Client-side caching with React Query
- Type-safe API client with axios

### Performance Optimizations
- Bundle splitting in Vite config
- React Query caching strategies
- Database query optimization
- Memory leak prevention hooks

### Security Features
- Enhanced security middleware stack
- Input validation and sanitization
- Comprehensive audit logging
- CSRF protection
- Rate limiting and progressive delays

## Development Workflow

1. **Environment Setup**: Copy `.env.example` files and configure variables
2. **Database**: Ensure Docker containers are running (`npm run docker:up`)
3. **Dependencies**: Install with `npm run install:all`
4. **Database Schema**: Run `npm run db:generate && npm run db:migrate`
5. **Development**: Use `npm run dev` to start both services

### Port Configuration
- Client: http://localhost:5000
- Server: http://localhost:5001  
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Code Quality
Run linting and type-checking before commits:
```bash
npm run lint:all && npm run type-check:all
```

The project enforces TypeScript strict mode and includes comprehensive ESLint configurations.