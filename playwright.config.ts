import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright Configuration for College Management System E2E Testing
 * 
 * This configuration supports:
 * - Multi-browser testing (Chrome, Firefox, Safari, Edge)
 * - Mobile device simulation
 * - Accessibility testing
 * - Performance monitoring
 * - Visual regression testing
 * - Parallel test execution
 */

export default defineConfig({
  // Test directory structure
  testDir: './tests/e2e',
  
  // Global setup and teardown
  globalSetup: require.resolve('./tests/e2e/global-setup.ts'),
  globalTeardown: require.resolve('./tests/e2e/global-teardown.ts'),
  
  // Test execution settings
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  
  // Test timeout configuration
  timeout: 30 * 1000, // 30 seconds per test
  expect: {
    timeout: 5 * 1000, // 5 seconds for assertions
  },
  
  // Reporter configuration
  reporter: [
    // HTML reporter for local development
    ['html', { 
      open: process.env.CI ? 'never' : 'on-failure',
      outputFolder: 'test-results/html-report'
    }],
    // JSON reporter for CI/CD integration
    ['json', { 
      outputFile: 'test-results/test-results.json'
    }],
    // JUnit reporter for test management tools
    ['junit', { 
      outputFile: 'test-results/junit.xml'
    }],
    // Line reporter for console output
    ['line'],
    // Allure reporter for advanced reporting
    ['allure-playwright', {
      detail: true,
      outputFolder: 'test-results/allure-results',
      suiteTitle: false,
    }]
  ],
  
  // Global test options
  use: {
    // Base URL for the application
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    // Browser settings
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    
    // Network settings
    ignoreHTTPSErrors: true,
    
    // Screenshots and videos
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
    
    // Performance monitoring
    actionTimeout: 10 * 1000, // 10 seconds for actions
    navigationTimeout: 30 * 1000, // 30 seconds for navigation
    
    // Accessibility testing
    colorScheme: 'light',
    
    // Test data and state
    storageState: 'tests/e2e/.auth/user.json',
    
    // Custom test context
    contextOptions: {
      recordVideo: {
        mode: 'retain-on-failure',
        size: { width: 1280, height: 720 }
      },
      recordHar: {
        mode: 'retain-on-failure',
        path: 'test-results/network-logs.har'
      }
    }
  },

  // Browser projects for cross-browser testing
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
      teardown: 'cleanup',
    },
    {
      name: 'cleanup',
      testMatch: /.*\.teardown\.ts/,
    },

    // Desktop browsers
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        channel: 'chrome',
        launchOptions: {
          args: [
            '--disable-web-security',
            '--disable-features=VizDisplayCompositor'
          ]
        }
      },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { 
        ...devices['Desktop Firefox']
      },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { 
        ...devices['Desktop Safari']
      },
      dependencies: ['setup'],
    },
    {
      name: 'edge',
      use: { 
        ...devices['Desktop Edge'],
        channel: 'msedge'
      },
      dependencies: ['setup'],
    },

    // Mobile browsers
    {
      name: 'Mobile Chrome',
      use: { 
        ...devices['Pixel 5']
      },
      dependencies: ['setup'],
    },
    {
      name: 'Mobile Safari',
      use: { 
        ...devices['iPhone 12']
      },
      dependencies: ['setup'],
    },

    // Tablet browsers
    {
      name: 'iPad',
      use: { 
        ...devices['iPad Pro']
      },
      dependencies: ['setup'],
    },

    // Accessibility testing project
    {
      name: 'accessibility',
      testMatch: '**/*.accessibility.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        colorScheme: 'light'
      },
      dependencies: ['setup'],
    },

    // Performance testing project
    {
      name: 'performance',
      testMatch: '**/*.performance.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-precise-memory-info']
        }
      },
      dependencies: ['setup'],
    },

    // Visual regression testing
    {
      name: 'visual',
      testMatch: '**/*.visual.spec.ts',
      use: { 
        ...devices['Desktop Chrome'],
        // Disable animations for consistent screenshots
        reducedMotion: 'reduce'
      },
      dependencies: ['setup'],
    },

    // API testing project
    {
      name: 'api',
      testMatch: '**/*.api.spec.ts',
      use: {
        baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
      },
      dependencies: ['setup'],
    }
  ],

  // Development server configuration
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: 'file:./test.db',
      NEXTAUTH_SECRET: 'test-secret',
      NEXTAUTH_URL: 'http://localhost:3000'
    }
  },

  // Output directory for test artifacts
  outputDir: 'test-results/playwright-output',

  // Metadata for test reporting
  metadata: {
    testType: 'e2e',
    framework: 'Playwright',
    application: 'College Management System',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'test',
    buildId: process.env.BUILD_ID || 'local',
    commitHash: process.env.COMMIT_HASH || 'unknown'
  }
})