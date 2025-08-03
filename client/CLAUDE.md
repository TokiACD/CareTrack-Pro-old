# CLIENT CLAUDE.md

This file provides guidance for working with the React frontend application in CareTrack Pro.

## Frontend Architecture Overview

The client is a React 18 application built with TypeScript, Material-UI, and React Query for a comprehensive care management dashboard.

## Key Entry Points

### Application Bootstrap
- **`src/main.tsx`** - Application entry point with providers (React Query, Material-UI theme, Auth context, Notifications)
- **`src/App.tsx`** - Main router with protected/public route definitions
- **`index.html`** - HTML template with React root mounting point

### Development Configuration
- **`vite.config.ts`** - Vite configuration with path aliases and proxy
- **`package.json`** - Dependencies and scripts
- **`tsconfig.json`** - TypeScript configuration with strict mode

## Directory Structure

### `/src/contexts/` - Global State Management
- **`AuthContext.tsx`** - JWT authentication state, user session, login/logout logic
- **`NotificationContext.tsx`** - Global notification system with Material-UI snackbars

### `/src/pages/` - Page Components
**Authentication Pages:**
- **`LoginPage.tsx`** - Admin login form with validation
- **`AcceptInvitationPage.tsx`** - Multi-step invitation acceptance flow
- **`ForgotPasswordPage.tsx`** - Password reset request
- **`ResetPasswordPage.tsx`** - Password reset completion
- **`EmailChangeVerification.tsx`** - Email change verification flow

**Application Pages:**
- **`DashboardPage.tsx`** - Main dashboard with 10 management cards
- **`TasksPage.tsx`** - Task management interface
- **`AssignmentsPage.tsx`** - Carer and package assignment management
- **`AssessmentsPage.tsx`** - Assessment listing and management
- **`CreateAssessmentPage.tsx`** - Multi-section assessment builder
- **`EditAssessmentPage.tsx`** - Assessment editing interface

### `/src/components/` - Reusable Components

**`/auth/`** - Authentication Components
- **`ProtectedRoute.tsx`** - Route wrapper requiring authentication

**`/common/`** - Common UI Components  
- **`LoadingScreen.tsx`** - Global loading spinner with Material-UI

**`/dashboard/`** - Dashboard-Specific Components
- **`DashboardCard.tsx`** - Reusable card template for dashboard items
- **`UsersCard.tsx`** - Admin and carer user management
- **`CarePackagesCard.tsx`** - Care package management interface

**`/profile/`** - User Profile Components
- **`EmailChangeDialog.tsx`** - Email change request dialog

### `/src/hooks/` - Custom React Hooks
- **`useSmartMutation.ts`** - Enhanced React Query mutation with automatic cache invalidation
- **`invalidationRules.ts`** - Query cache invalidation rules configuration

### `/src/services/` - API Integration
- **`api.ts`** - Axios HTTP client with interceptors and error handling
- **`authService.ts`** - Authentication API calls and token management

### `/src/` - Configuration Files
- **`theme.ts`** - Material-UI theme configuration with custom colors
- **`vite-env.d.ts`** - TypeScript environment definitions

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint TypeScript/React code
npm run lint

# Type checking
npm run type-check
```

## Key Development Patterns

### State Management Strategy
- **Server State**: React Query with automatic caching and invalidation
- **Authentication State**: React Context with JWT token management
- **UI State**: Local component state and Material-UI components
- **Form State**: React Hook Form for complex forms

### API Integration Pattern
```typescript
// Using the centralized API service
import { apiService } from '../services/api'

// GET request
const data = await apiService.get<ResponseType>('/endpoint')

// POST request  
const result = await apiService.post<ResponseType>('/endpoint', payload)
```

### Authentication Flow
1. User logs in → JWT token stored in localStorage
2. API service automatically adds Bearer token to requests
3. 401 responses trigger automatic redirect to login
4. AuthContext manages user state across the application

### Component Structure Pattern
```typescript
// Typical page component structure
import { useAuth } from '../contexts/AuthContext'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiService } from '../services/api'

export function ExamplePage() {
  const { user } = useAuth()
  
  const { data, isLoading } = useQuery({
    queryKey: ['example-data'],
    queryFn: () => apiService.get('/api/example')
  })
  
  // Component logic and JSX
}
```

### Material-UI Theme Usage
- Custom theme defined in `theme.ts`
- Consistent color scheme for competency levels
- Responsive breakpoints for mobile-first design
- Custom typography and spacing

### Route Protection
- All routes except login/invitation wrapped with `ProtectedRoute`
- Automatic redirect to login for unauthenticated users
- Auth state persistence across page refreshes

## Environment Configuration

### Environment Variables (`.env`)
```bash
VITE_API_URL=http://localhost:3001    # Backend API URL
VITE_NODE_ENV=development             # Environment mode
```

### Vite Configuration Features
- Path aliases for clean imports (`@/components`, `@/services`)
- Proxy configuration for development API calls
- TypeScript support with strict checking
- Hot module replacement for development

## Testing Strategy

Currently no test framework is configured. Manual testing workflow:

1. **Authentication Flow**: Test login, logout, protected routes
2. **Dashboard Functionality**: Verify all cards load and function
3. **Form Validation**: Test all forms with valid/invalid data
4. **API Integration**: Verify all CRUD operations work correctly
5. **Responsive Design**: Test on mobile and desktop breakpoints

## Common Development Tasks

### Adding New Pages
1. Create page component in `/src/pages/`
2. Add route definition in `App.tsx`
3. Add navigation if needed in dashboard
4. Update any related API service calls

### Adding New Components
1. Create component in appropriate `/src/components/` subfolder
2. Follow Material-UI patterns for styling
3. Add TypeScript interfaces for props
4. Export from component index if needed

### API Integration
1. Add endpoint calls to appropriate service file
2. Define TypeScript interfaces in `@caretrack/shared`
3. Use React Query for data fetching
4. Add proper error handling and loading states

### State Management
1. Server state → Use React Query
2. Authentication state → Use AuthContext
3. UI state → Local component state
4. Form state → React Hook Form

## File Naming Conventions

- **Components**: PascalCase (e.g., `DashboardCard.tsx`)
- **Pages**: PascalCase with "Page" suffix (e.g., `LoginPage.tsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `useSmartMutation.ts`)
- **Services**: camelCase (e.g., `authService.ts`)
- **Types**: Defined in shared package, imported as needed

## Build Output

- **Development**: Runs on `http://localhost:3000`
- **Production**: Static files in `/dist/` served by backend
- **Assets**: Optimized and bundled by Vite
- **TypeScript**: Compiled and type-checked during build