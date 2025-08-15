# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# CareTrack Pro

Healthcare management system with React frontend, Express backend, and PostgreSQL database.

## Tech Stack
- Frontend: React 18, TypeScript, Material-UI v5, Vite
- Backend: Express.js, Prisma ORM, PostgreSQL, Redis
- Auth: JWT with refresh tokens
- Testing: Jest, Playwright

## Project Structure
- `client/`: React frontend (port 5000)
- `server/`: Express backend (port 5001)
- `shared/`: Common TypeScript types

## UI/UX Assets
- Logo: `Logo/Joshcarecompany_Alt-logo_white.png`
- Logo background color: `#0a223c`

## Key Commands
- `npm run dev` - Start both services
- `npm run build` - Build all packages
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed test data
- `npm run docker:up` - Start PostgreSQL/Redis containers

## Code Conventions
- Use TypeScript strict mode
- React functional components with hooks
- React Query for server state
- Soft deletes with `deletedAt` pattern
- Feature-organized components in `client/components/`
- Always use `auditService.log()` for significant actions

## API Patterns
- REST endpoints under `/api` prefix
- Wrap responses in `ApiResponse<T>` type
- Client uses axios with type-safe methods
- Server validates all inputs

## Security Requirements
- JWT validation on all protected routes
- Rate limiting with progressive delays
- Comprehensive audit logging for compliance
- Input sanitization and CSRF protection

## Healthcare Compliance
- 6-year data retention for deleted carers (CQC compliance)
- GDPR anonymization in audit logs
- Use regulatory PDF templates (CQC, Skills for Health, NICE, HSE)
- Maintain complete audit trails for inspections

## Database Rules
- Use Prisma for all database operations
- Include error handling on all queries
- Leverage database indexes for performance
- Follow established schema patterns

## Do Not
- Edit files in `server/legacy/` directory
- Skip audit logging for user actions
- Bypass input validation
- Commit secrets or credentials
- Modify Prisma schema without migrations