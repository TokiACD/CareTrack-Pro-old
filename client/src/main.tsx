import React, { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider, CssBaseline } from '@mui/material'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import { NotificationProvider } from './contexts/NotificationContext'
import theme from './theme'
import { initializeBrowserCompat } from './utils/crossBrowserCompat'
// Import UI validation in development
if (import.meta.env.DEV) {
  import('./utils/uiFixValidation')
}

// Create a query client with optimized settings for real-time updates
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 2 * 60 * 1000, // 2 minutes (shorter for real-time feel)
      gcTime: 10 * 60 * 1000, // 10 minutes (renamed from cacheTime)
      refetchOnMount: 'always', // Always refetch for fresh data
      refetchOnReconnect: 'always',
      // Enable background refetch for real-time updates
      refetchInterval: 5 * 60 * 1000, // 5 minutes background refresh
      refetchIntervalInBackground: false, // Only when tab is active
    },
    mutations: {
      retry: 1,
      onError: (error) => {
        console.error('Mutation error:', error)
      },
      // Global mutation success handler for cache invalidation
      onSuccess: () => {
        // Automatic background refetch after mutations
        queryClient.refetchQueries({ type: 'active' })
      },
    },
  },
})

// Initialize browser compatibility fixes
initializeBrowserCompat()

// Performance optimizations for React 18
const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

const root = ReactDOM.createRoot(rootElement)

root.render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AuthProvider>
            <NotificationProvider>
              <App />
            </NotificationProvider>
          </AuthProvider>
        </ThemeProvider>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)