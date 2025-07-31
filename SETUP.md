# CareTrack Pro - Development Setup Guide

## 🚀 Quick Setup (Recommended)

Run this single command to set up everything:

```bash
npm run setup:dev
```

This will:
1. Start PostgreSQL container
2. Install all dependencies  
3. Build shared package
4. Generate Prisma client
5. Run database migrations
6. Seed initial data

## 📋 Manual Step-by-Step Setup

If you prefer to run each step manually:

### 1. Start PostgreSQL Container
```bash
npm run docker:up
```
This starts PostgreSQL 15 in a Docker container with:
- Database: `caretrack_pro`
- Username: `caretrack`
- Password: `dev_password`
- Port: `5432`

### 2. Install Dependencies
```bash
npm run install:all
```
Installs dependencies for all packages (root, client, server, shared).

### 3. Build Shared Package
```bash
cd shared && npm run build
```
Builds TypeScript types used by both client and server.

### 4. Generate Prisma Client
```bash
npm run db:generate
```
Generates the Prisma client based on your schema.

### 5. Run Database Migrations
```bash
npm run db:migrate
```
Creates all database tables and relationships.

### 6. Seed Initial Data
```bash
npm run db:seed
```
Creates:
- Initial admin user: `admin@caretrack.com` / `admin123`
- Sample care packages
- Sample tasks
- Sample carers

### 7. Start Development Servers
```bash
npm run dev
```
Starts both:
- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## 🔐 Login Credentials

**Default Admin Account:**
- Email: `admin@caretrack.com`
- Password: `admin123`
- ⚠️ **Change this password after first login!**

## 🛠️ Useful Commands

### Database Management
```bash
npm run db:studio          # Open Prisma Studio (database GUI)
npm run db:reset           # Reset database (careful!)
npm run docker:logs        # View PostgreSQL logs
```

### Docker Management
```bash
npm run docker:up          # Start PostgreSQL container
npm run docker:down        # Stop containers
npm run docker:clean       # Stop and remove all data (careful!)
```

### Development
```bash
npm run dev                # Start both client & server
npm run dev:client         # Start only frontend
npm run dev:server         # Start only backend
```

## 🔍 Verification Steps

### 1. Check Database Container
```bash
docker ps
```
Should show `caretrack_postgres` container running.

### 2. Check Database Connection
```bash
npm run db:studio
```
Should open Prisma Studio at http://localhost:5555

### 3. Check Backend API
Visit: http://localhost:3001/health
Should return: `{"success": true, "message": "CareTrack Pro API is running"}`

### 4. Check Frontend
Visit: http://localhost:3000
Should show the CareTrack Pro login page.

### 5. Test Login
- Go to http://localhost:3000
- Login with `admin@caretrack.com` / `admin123`
- Should see dashboard with 10 cards

## 🚨 Troubleshooting

### PostgreSQL Container Issues
```bash
# Check container logs
npm run docker:logs

# Restart container
npm run docker:down
npm run docker:up

# Complete reset (removes all data)
npm run docker:clean
npm run docker:up
npm run db:migrate
npm run db:seed
```

### Port Conflicts
If port 5432 is in use:
1. Stop any existing PostgreSQL services
2. Or modify the port in `docker-compose.yml` and update `DATABASE_URL` in `server/.env`

### Database Connection Issues
```bash
# Regenerate Prisma client
npm run db:generate

# Check database URL in server/.env matches docker-compose.yml
```

### Dependencies Issues
```bash
# Clean install all dependencies
rm -rf node_modules client/node_modules server/node_modules shared/node_modules
npm run install:all
```

## 📊 What You Should See

After successful setup:

1. **Dashboard**: 10 functional cards for system management
2. **Authentication**: Working login/logout system
3. **Database**: Tables created with sample data
4. **API**: All endpoints responding (even if placeholder)

## 🎯 Next Steps

With the environment running, you can:
1. Explore the 10 dashboard cards
2. Check Prisma Studio to see the database structure
3. Review the API endpoints at `/api/*`
4. Start implementing specific card functionality

## 💡 Daily Workflow

```bash
# Start your development day:
npm run docker:up    # Start database
npm run dev          # Start app

# End your development day:
npm run docker:down  # Stop database (data persists)
```

The database data persists between container restarts, so you won't lose your work!