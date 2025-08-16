# CareTrack Pro

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB.svg)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15%2B-336791.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A comprehensive healthcare management system designed for care providers to manage carers, assessments, training, compliance, and operational workflows. Built with modern web technologies and healthcare compliance in mind.

## 🚀 Features

### Core Functionality
- **Admin Dashboard**: Complete administrative control with analytics and reporting
- **Carer Management**: Registration, profiles, scheduling, and performance tracking
- **Assessment System**: Digital assessments with automated scoring and progress tracking
- **Training Management**: Competency tracking and certification workflows
- **Shift Management**: Advanced scheduling with availability matching
- **Audit System**: Comprehensive logging for compliance and regulatory requirements

### Healthcare Compliance
- **CQC Compliance**: 6-year data retention for deleted carers
- **GDPR Compliant**: Data anonymization and privacy controls
- **Audit Trails**: Complete action logging for inspections
- **Regulatory Templates**: CQC, Skills for Health, NICE, HSE documentation

### Advanced Features
- **Real-time Notifications**: Email invitations and system alerts
- **Performance Analytics**: Detailed reporting and metrics
- **Multi-device Support**: Responsive design for desktop, tablet, and mobile
- **Security**: JWT authentication, rate limiting, CSRF protection
- **Job Processing**: Background tasks with Redis queues

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React 18 + TypeScript + Material-UI v5 + Vite
- **Backend**: Express.js + Prisma ORM + PostgreSQL + Redis
- **Authentication**: JWT with refresh tokens
- **Testing**: Jest + Playwright
- **Deployment**: Docker support with production configurations

### Project Structure
```
CareTrack-Pro/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/         # Application pages/routes
│   │   ├── services/      # API services and utilities
│   │   ├── hooks/         # Custom React hooks
│   │   └── utils/         # Helper functions
├── server/                # Express backend API
│   ├── src/
│   │   ├── controllers/   # Route controllers
│   │   ├── middleware/    # Express middleware
│   │   ├── services/      # Business logic services
│   │   ├── routes/        # API route definitions
│   │   └── utils/         # Server utilities
│   └── prisma/           # Database schema and migrations
├── shared/                # Shared TypeScript types and utilities
└── docs/                 # Documentation and guides
```

## 🚦 Quick Start

### Prerequisites
- Node.js 18+ and npm 9+
- Docker and Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd CareTrack-Pro
   ```

2. **Environment Setup**
   ```bash
   # Copy environment files
   cp server/.env.example server/.env
   cp client/.env.example client/.env
   
   # Edit the .env files with your configuration
   ```

3. **Quick Development Setup**
   ```bash
   npm run setup:dev
   ```
   This command will:
   - Start PostgreSQL and Redis containers
   - Install all dependencies
   - Build shared packages
   - Run database migrations
   - Seed initial data

4. **Start Development Servers**
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:5000
   - Backend: http://localhost:5001

### Default Admin Credentials
- **Email**: admin@caretrack.com
- **Password**: admin123
- ⚠️ **Change password after first login!**

## 🛠️ Development

### Available Commands

#### Root Level Commands
```bash
# Development
npm run dev                    # Start both frontend and backend
npm run build                  # Build all packages
npm run setup:dev             # Complete development setup

# Database
npm run db:migrate            # Run database migrations
npm run db:seed               # Seed test data
npm run db:studio             # Open Prisma Studio
npm run db:reset              # Reset database

# Docker
npm run docker:up             # Start PostgreSQL/Redis containers
npm run docker:down           # Stop containers
npm run docker:clean          # Remove containers and volumes

# Testing
npm run test:unit             # Run unit tests
npm run test:e2e              # Run end-to-end tests
npm run test:integration      # Run integration tests

# Quality
npm run lint:all              # Lint all packages
npm run type-check:all        # TypeScript type checking
npm run security:scan         # Security vulnerability scan
```

#### Client Commands
```bash
cd client
npm run dev                   # Start development server
npm run build                 # Build for production
npm run build:analyze         # Analyze bundle size
npm run lint                  # Lint TypeScript/React code
npm run type-check            # TypeScript type checking
```

#### Server Commands
```bash
cd server
npm run dev                   # Start development server
npm run build                 # Build for production
npm run start                 # Start production server
npm run db:generate           # Generate Prisma client
npm run db:migrate            # Run database migrations
npm run db:seed               # Seed database
npm run test                  # Run server tests
```

### Environment Variables

#### Server (.env)
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/caretrack"

# Redis
REDIS_URL="redis://localhost:6379"

# JWT
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# Email (Mailtrap for development)
SMTP_HOST="sandbox.smtp.mailtrap.io"
SMTP_PORT=2525
SMTP_USER="your-mailtrap-user"
SMTP_PASS="your-mailtrap-password"

# Application
NODE_ENV="development"
PORT=5001
CORS_ORIGIN="http://localhost:5000"
```

#### Client (.env)
```env
VITE_API_URL=http://localhost:5001
VITE_APP_NAME="CareTrack Pro"
```

## 🏥 Healthcare Features

### Assessment System
- Digital competency assessments with automated scoring
- Progress tracking and analytics
- Regulatory compliance templates
- Mobile-friendly interface for field use

### Audit & Compliance
- Comprehensive action logging with `auditService.log()`
- 6-year data retention for CQC compliance
- GDPR-compliant data anonymization
- Export capabilities for regulatory inspections

### Carer Management
- Complete profile management with emergency contacts
- Availability tracking and shift scheduling
- Training and certification management
- Performance analytics and reporting

### Security Features
- JWT-based authentication with refresh tokens
- Progressive rate limiting with delays
- CSRF protection and input sanitization
- Comprehensive audit trails

## 🧪 Testing

### Test Types
- **Unit Tests**: Component and service testing with Jest
- **Integration Tests**: API endpoint and database testing
- **E2E Tests**: Full user workflow testing with Playwright
- **Performance Tests**: Load testing and optimization validation

### Running Tests
```bash
# All tests
npm run test:unit             # Unit tests
npm run test:integration      # Integration tests
npm run test:e2e             # End-to-end tests

# With coverage
npm run test:coverage         # Generate coverage reports

# Specific test suites
cd client && npm test         # Client unit tests
cd server && npm test         # Server unit tests
```

## 🚀 Deployment

### Production Build
```bash
npm run build                 # Build all packages
npm run validate:production   # Validate production build
```

### Docker Deployment
```bash
# Start all services
docker-compose up -d

# Production build
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Setup
1. Set production environment variables
2. Configure SSL certificates
3. Set up database backups
4. Configure monitoring and logging

## 📊 Performance

### Optimization Features
- Bundle splitting and lazy loading
- React Query for efficient server state management
- Database connection pooling
- Redis caching for sessions and frequently accessed data
- Progressive loading and virtualization for large lists

### Monitoring
- Performance logging and metrics
- Memory leak prevention
- Error tracking and reporting
- API response time monitoring

## 🔧 API Documentation

### Base URLs
- Development: `http://localhost:5001`
- Production: `https://your-domain.com`

### Authentication
All protected endpoints require JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Key Endpoints
```
POST   /api/auth/login           # Admin/Carer login
POST   /api/auth/refresh         # Refresh access token
POST   /api/admin/invite         # Invite new admin
POST   /api/carer/invite         # Invite new carer
GET    /api/carers               # List carers
GET    /api/assessments          # List assessments
POST   /api/assessments          # Create assessment
GET    /api/shifts               # List shifts
POST   /api/shifts               # Create shift
```

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make changes following the coding standards
4. Run tests: `npm run test:all`
5. Commit with conventional commits
6. Push and create a Pull Request

### Coding Standards
- Use TypeScript strict mode
- Follow React functional components with hooks
- Use Prisma for all database operations
- Include audit logging for significant actions
- Follow established component patterns (DashboardCard, PageLayout)
- Maintain 95% component reusability

### Code Review Checklist
- [ ] TypeScript types are properly defined
- [ ] Audit logging is included for user actions
- [ ] Input validation is implemented
- [ ] Error handling is comprehensive
- [ ] Tests cover new functionality
- [ ] Documentation is updated

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Getting Help
- Check the [documentation](docs/)
- Review [troubleshooting guide](docs/troubleshooting.md)
- Open an issue for bugs or feature requests

### System Requirements
- Node.js 18+
- PostgreSQL 15+
- Redis 6+
- 4GB RAM minimum (8GB recommended)
- Modern web browser with JavaScript enabled

### Performance Recommendations
- Use SSD storage for database
- Configure Redis with appropriate memory limits
- Set up database connection pooling
- Enable gzip compression
- Use CDN for static assets in production

---

**CareTrack Pro** - Empowering healthcare management through technology