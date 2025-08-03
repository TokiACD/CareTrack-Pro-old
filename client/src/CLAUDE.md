# CLIENT SRC CLAUDE.md

This file provides guidance for working with the React frontend source code structure in CareTrack Pro.

## Source Code Architecture

The `/src` directory contains all React application source code, organized by feature and component type for a care management dashboard.

## Directory Structure & Purpose

### `/contexts/` - React Context Providers

**`AuthContext.tsx`** - Authentication State Management
- JWT token management and persistence
- User session state across the application
- Login/logout functionality with automatic redirects
- Token verification on app initialization
- Authentication hooks for components

**`NotificationContext.tsx`** - Global Notification System
- Material-UI Snackbar integration for system messages
- Success, error, warning, and info notification types
- Queue management for multiple notifications
- Auto-dismiss functionality with configurable duration

### `/pages/` - Route Components

**Authentication Flow Pages:**
- **`LoginPage.tsx`** - Admin login form with validation and error handling
- **`ForgotPasswordPage.tsx`** - Password reset request with email input
- **`ResetPasswordPage.tsx`** - Password reset completion with token validation
- **`AcceptInvitationPage.tsx`** - Multi-step invitation acceptance flow
- **`EmailChangeVerification.tsx`** - Email change confirmation and cancellation

**Main Application Pages:**
- **`DashboardPage.tsx`** - Central dashboard with 10 management cards
- **`TasksPage.tsx`** - Task management interface with CRUD operations
- **`AssignmentsPage.tsx`** - Carer and package assignment management
- **`AssessmentsPage.tsx`** - Assessment listing with filtering and search
- **`CreateAssessmentPage.tsx`** - Assessment builder with 4-section structure
- **`EditAssessmentPage.tsx`** - Assessment modification interface

### `/components/` - Reusable UI Components

**`/auth/` - Authentication Components**
- **`ProtectedRoute.tsx`** - Route wrapper requiring authentication
  - Checks JWT token validity
  - Redirects to login if unauthenticated
  - Shows loading spinner during auth check

**`/common/` - Shared UI Components**
- **`LoadingScreen.tsx`** - Full-screen loading spinner
  - Material-UI CircularProgress with backdrop
  - Used during authentication initialization
  - Consistent loading experience

**`/dashboard/` - Dashboard-Specific Components**
- **`DashboardCard.tsx`** - Reusable card template
  - Standard Material-UI Card layout
  - Props for title, count, action buttons
  - Loading and error states
  - Click handlers for navigation

- **`UsersCard.tsx`** - User management interface
  - Admin and carer user display
  - Invitation system integration
  - User status management (active/inactive)
  - Search and filtering capabilities

- **`CarePackagesCard.tsx`** - Care package management
  - CRUD operations for care packages
  - UK postcode validation
  - Package assignment views
  - Soft delete management

**`/profile/` - User Profile Components**
- **`EmailChangeDialog.tsx`** - Email change request dialog
  - Form validation for email changes
  - Confirmation dialog with security warnings
  - Integration with email change API

### `/hooks/` - Custom React Hooks

**`useSmartMutation.ts`** - Enhanced React Query Mutation
- Automatic cache invalidation based on mutation type
- Optimistic updates for better UX
- Error handling with rollback functionality
- Loading state management
- Success/error notifications

**`invalidationRules.ts`** - Cache Invalidation Configuration
- Mapping of mutations to affected queries
- Intelligent cache invalidation patterns
- Performance optimization for data freshness
- Relationship-aware invalidation (e.g., updating carers invalidates assignments)

### `/services/` - External Service Integration

**`api.ts`** - HTTP Client Service
- Axios-based HTTP client with interceptors
- Automatic JWT token attachment
- Response transformation to standard format
- Error handling and status code management
- Request/response logging in development
- File upload/download utilities

**`authService.ts`** - Authentication API
- Login/logout functionality
- Token verification and refresh
- Password reset operations
- Invitation acceptance
- User session management

### Root Source Files

**`main.tsx`** - Application Entry Point
- React 18 StrictMode setup
- Provider hierarchy (React Query, Material-UI, Auth, Notifications)
- Global error boundary
- Service worker registration (if applicable)

**`App.tsx`** - Main Router Component
- React Router setup with protected/public routes
- Route definitions and lazy loading
- Authentication-based route protection
- Navigation structure

**`theme.ts`** - Material-UI Theme Configuration
- Custom color palette for care management
- Typography scale and font families
- Component style overrides
- Responsive breakpoint definitions
- Competency level color mapping

**`vite-env.d.ts`** - TypeScript Environment Declarations
- Vite-specific type definitions
- Custom environment variable types
- Module declarations for imports

## Component Development Patterns

### Page Component Structure
```typescript
// Standard page component pattern
import React from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { useAuth } from '../../contexts/AuthContext'
import { apiService } from '../../services/api'

export function ExamplePage() {
  const { user } = useAuth()
  
  // Data fetching with React Query
  const { data, isLoading, error } = useQuery({
    queryKey: ['example-data'],
    queryFn: () => apiService.get('/api/example'),
    enabled: !!user // Only fetch when authenticated
  })
  
  // Mutations with automatic cache invalidation
  const createMutation = useMutation({
    mutationFn: (data) => apiService.post('/api/example', data),
    onSuccess: () => {
      // Handled by useSmartMutation
    }
  })
  
  // Component JSX with Material-UI components
  return (
    <Container>
      {/* Component implementation */}
    </Container>
  )
}
```

### Dashboard Card Pattern
```typescript
// Reusable dashboard card structure
import { DashboardCard } from '../components/dashboard/DashboardCard'

export function ExampleCard() {
  return (
    <DashboardCard
      title="Example Management"
      count={data?.length || 0}
      loading={isLoading}
      error={error}
      actions={[
        { label: 'Add New', onClick: handleAdd },
        { label: 'View All', onClick: handleViewAll }
      ]}
    >
      {/* Card content */}
    </DashboardCard>
  )
}
```

### Form Handling Pattern
```typescript
// React Hook Form integration
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'

export function ExampleForm() {
  const { control, handleSubmit, formState: { errors } } = useForm({
    resolver: yupResolver(validationSchema),
    defaultValues: {}
  })
  
  const onSubmit = (data) => {
    // Form submission logic
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      {/* Form fields with validation */}
    </form>
  )
}
```

## State Management Strategy

### Server State (React Query)
- All API data managed through React Query
- Automatic caching with configurable TTL
- Background refetching for data freshness
- Optimistic updates for better UX
- Error handling with retry logic

### Authentication State (Context)
- User session persisted in localStorage
- JWT token automatic renewal
- Global authentication state
- Logout with cleanup

### UI State (Local Component State)
- Form state with React Hook Form
- Modal/dialog open/close state
- Local UI interactions
- Component-specific state

### Notification State (Context)
- Global notification queue
- Auto-dismiss functionality
- Multiple notification types
- Queue management

## API Integration Patterns

### Standard Data Fetching
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => apiService.get(`/api/entity/${id}`),
  staleTime: 5 * 60 * 1000, // 5 minutes
  cacheTime: 10 * 60 * 1000  // 10 minutes
})
```

### Smart Mutations
```typescript
const { mutate, isLoading } = useSmartMutation({
  mutationFn: (data) => apiService.post('/api/entity', data),
  entityType: 'entity', // Triggers automatic cache invalidation
  onSuccess: () => {
    // Success notification automatically shown
  }
})
```

### Error Handling
```typescript
// Global error handling in api.ts interceptor
// Component-level error display
{error && (
  <Alert severity="error">
    {error.message || 'An error occurred'}
  </Alert>
)}
```

## Routing Strategy

### Protected Routes
- All routes except login/invitation require authentication
- Automatic redirect to login for unauthenticated users
- Loading state during authentication check

### Route Structure
```
/                          → Redirect to /dashboard
/login                     → LoginPage (public)
/forgot-password           → ForgotPasswordPage (public)
/reset-password            → ResetPasswordPage (public)
/invitation/accept         → AcceptInvitationPage (public)
/email-change/verify       → EmailChangeVerification (public)
/dashboard                 → DashboardPage (protected)
/tasks                     → TasksPage (protected)
/assignments               → AssignmentsPage (protected)
/assessments               → AssessmentsPage (protected)
/assessments/create        → CreateAssessmentPage (protected)
/assessments/:id/edit      → EditAssessmentPage (protected)
```

## Material-UI Integration

### Theme Customization
- Custom color palette for competency levels
- Consistent typography across components
- Responsive design with mobile-first approach
- Component style overrides for brand consistency

### Component Usage
- Consistent Material-UI component usage
- Custom styled components for specific needs
- Responsive design with breakpoint system
- Accessibility compliance

## Development Workflow

### Adding New Pages
1. Create page component in `/src/pages/`
2. Add route definition in `App.tsx`
3. Implement authentication protection if needed
4. Add navigation links where appropriate

### Adding New Components
1. Create component in appropriate subfolder
2. Follow Material-UI design patterns
3. Add TypeScript interfaces for props
4. Include error and loading states

### API Integration
1. Add API calls to appropriate service file
2. Use React Query for data fetching
3. Implement proper error handling
4. Add loading and success states

### State Management
1. Use React Query for server state
2. Use local state for UI interactions
3. Use context for global state (auth, notifications)
4. Avoid prop drilling with appropriate state placement

## Testing Considerations

Currently no test framework configured. When implementing tests:

1. **Component Testing**: Test component rendering and interactions
2. **Hook Testing**: Test custom hooks in isolation
3. **API Testing**: Mock API calls and test error handling
4. **Integration Testing**: Test complete user workflows
5. **Accessibility Testing**: Ensure WCAG compliance

## Performance Optimization

### Code Splitting
- Lazy loading for route components
- Dynamic imports for large components
- Bundle optimization with Vite

### React Query Optimization
- Appropriate cache times for different data types
- Background refetching for critical data
- Optimistic updates for better UX

### Material-UI Optimization
- Tree shaking for unused components
- Custom theme for consistent styling
- Responsive design for mobile performance