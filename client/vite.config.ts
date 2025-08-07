import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      // Enable React DevTools in development
      include: '**/*.{tsx,ts,jsx,js}',
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/components': path.resolve(__dirname, './src/components'),
      '@/pages': path.resolve(__dirname, './src/pages'),
      '@/hooks': path.resolve(__dirname, './src/hooks'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/contexts': path.resolve(__dirname, './src/contexts'),
      '@/utils': path.resolve(__dirname, './src/utils'),
    },
  },
  server: {
    host: true,
    port: 5000,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
        timeout: 30000, // 30 second timeout instead of 0
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.error('🔴 Proxy Error:', err.message, 'for', req.url);
            console.error('🔍 Check if server is running on http://localhost:5001');
            if (res && !res.headersSent) {
              res.writeHead(503, {
                'Content-Type': 'application/json'
              });
              res.end(JSON.stringify({ 
                success: false, 
                error: 'Backend server unavailable. Please ensure the server is running on port 5001.',
                details: err.message
              }));
            }
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log('🔄 Proxying:', req.method, req.url, '→ http://localhost:5001');
            proxyReq.removeHeader('origin');
            proxyReq.setHeader('host', 'localhost:5001');
            // Add request timeout handling
            proxyReq.setTimeout(30000, () => {
              console.error('⏰ Proxy request timeout for:', req.url);
              proxyReq.destroy();
            });
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('✅ Response:', req.url, proxyRes.statusCode);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'esbuild',
    target: 'esnext',
    // Optimize bundle splitting
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom'],
          'vendor-mui': ['@mui/material', '@mui/icons-material'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-router': ['react-router-dom'],
          'vendor-forms': ['react-hook-form'],
          'vendor-utils': ['axios', 'date-fns'],
          // App chunks
          'components-common': [
            './src/components/common/BrandHeader.tsx',
            './src/components/common/LoadingScreen.tsx',
            './src/components/common/ErrorBoundary.tsx',
          ],
          'components-dashboard': [
            './src/components/dashboard/DashboardCard.tsx',
            './src/components/dashboard/UsersCard.tsx',
            './src/components/dashboard/CarePackagesCard.tsx',
          ],
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk'
          return `js/${facadeModuleId}-[hash].js`
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const ext = info[info.length - 1]
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `images/[name]-[hash].${ext}`
          }
          if (/css/i.test(ext || '')) {
            return `css/[name]-[hash].${ext}`
          }
          return `assets/[name]-[hash].${ext}`
        },
      },
    },
    // Build performance optimizations
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096,
  },
  // Performance optimizations
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      '@mui/material',
      '@mui/icons-material',
      '@tanstack/react-query',
      'react-router-dom',
      'axios',
      'date-fns',
    ],
    exclude: ['@vitejs/client'],
  },
  // CSS optimizations
  css: {
    devSourcemap: process.env.NODE_ENV === 'development',
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
})