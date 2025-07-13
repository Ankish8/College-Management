import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Performance optimizations
  productionBrowserSourceMaps: false,
  images: {
    unoptimized: true,
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Enable React strict mode for better performance in dev
  reactStrictMode: true,
  
  // Optimize for smaller bundle sizes
  compress: true,
  poweredByHeader: false,
  
  // Enable experimental features for better performance
  experimental: {
    // Enable optimized CSS loading
    optimizeCss: true,
    
    // Better tree shaking and package optimization
    optimizePackageImports: [
      '@tanstack/react-query',
      '@radix-ui/react-icons',
      'lucide-react',
      'date-fns',
      'recharts'
    ],
    
    // Enable server actions
    serverActions: true,
    
    // Enable React server components optimization
    serverComponentsExternalPackages: ['prisma', '@prisma/client'],
    
    // Optimize CSS loading
    cssChunking: 'strict',
    
    // Enable static optimization
    optimisticClientCache: true,
    
    // Enable turbo mode for faster builds
    turbo: {
      loaders: {
        '.svg': ['@svgr/webpack'],
      },
      rules: {
        '*.svg': {
          loaders: ['@svgr/webpack'],
          as: '*.js',
        },
      },
    },
  },
  
  // Webpack optimizations
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Optimize bundle splitting
    if (!dev && !isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            // Vendor chunk for stable dependencies
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              enforce: true,
            },
            // UI components chunk
            ui: {
              test: /[\\/]components[\\/]ui[\\/]/,
              name: 'ui',
              chunks: 'all',
              priority: 10,
            },
            // Feature-specific chunks
            timetable: {
              test: /[\\/](components|pages)[\\/].*timetable.*[\\/]/,
              name: 'timetable',
              chunks: 'all',
              priority: 20,
            },
            attendance: {
              test: /[\\/](components|pages)[\\/].*attendance.*[\\/]/,
              name: 'attendance', 
              chunks: 'all',
              priority: 20,
            },
            // React Query chunk
            query: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]react-query/,
              name: 'react-query',
              chunks: 'all',
              priority: 30,
            },
          },
        },
      }
      
      // Tree shaking optimization
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
      
      // Module concatenation
      config.optimization.concatenateModules = true
    }
    
    // SVG handling
    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack']
    })
    
    // Production-only optimizations
    if (!dev) {
      // Remove console logs in production
      config.optimization.minimizer[0].options.minimizer.options.compress = {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
      }
    }
    
    // Development-only optimizations
    if (dev) {
      // Disable caching in development for hot reload
      config.cache = false
    }
    
    return config
  },
  
  // Headers for security and performance
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin'
          },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=86400'
          }
        ]
      }
    ]
  },
  
  // Development specific settings
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      maxInactiveAge: 25 * 1000,
      pagesBufferLength: 2,
    },
  }),
  
  // Production specific settings  
  ...(process.env.NODE_ENV === 'production' && {
    compiler: {
      removeConsole: {
        exclude: ['error', 'warn'],
      },
    },
    swcMinify: true,
  }),
};

export default nextConfig;
