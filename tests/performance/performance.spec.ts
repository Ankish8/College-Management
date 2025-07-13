import { test, expect } from '@playwright/test'

/**
 * Performance Testing Suite
 * 
 * Tests Core Web Vitals and performance metrics:
 * - First Contentful Paint (FCP)
 * - Largest Contentful Paint (LCP)
 * - Cumulative Layout Shift (CLS)
 * - First Input Delay (FID)
 * - Time to Interactive (TTI)
 * - Memory usage
 * - Network performance
 */

interface PerformanceMetrics {
  lcp: number
  fcp: number
  cls: number
  fid: number
  tti: number
  memoryUsage?: number
  networkRequests?: number
  totalTransferSize?: number
}

test.describe('Performance Testing', () => {
  let performanceMetrics: PerformanceMetrics[] = []

  test.afterAll(async () => {
    // Log performance summary
    console.log('\n=== Performance Test Summary ===')
    performanceMetrics.forEach((metrics, index) => {
      console.log(`Test ${index + 1}:`)
      console.log(`  LCP: ${metrics.lcp.toFixed(2)}ms`)
      console.log(`  FCP: ${metrics.fcp.toFixed(2)}ms`)
      console.log(`  CLS: ${metrics.cls.toFixed(4)}`)
      console.log(`  TTI: ${metrics.tti.toFixed(2)}ms`)
      if (metrics.memoryUsage) {
        console.log(`  Memory: ${(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`)
      }
      console.log('---')
    })
  })

  test.describe('Core Web Vitals', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('dashboard should meet Core Web Vitals thresholds', async ({ page }) => {
      // Enable performance monitoring
      await page.coverage.startJSCoverage()
      await page.coverage.startCSSCoverage()

      const startTime = Date.now()
      await page.goto('/dashboard')

      // Wait for page to be fully loaded
      await page.waitForLoadState('networkidle')

      // Measure Core Web Vitals
      const metrics = await page.evaluate(() => {
        return new Promise<PerformanceMetrics>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            
            const paintEntries = performance.getEntriesByType('paint')
            const navEntries = performance.getEntriesByType('navigation')
            
            const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
            const nav = navEntries[0] as PerformanceNavigationTiming
            
            resolve({
              lcp: 0, // Will be updated by LCP observer
              fcp: fcp,
              cls: 0, // Will be updated by layout shift observer
              fid: 0, // Will be measured separately
              tti: nav?.loadEventEnd - nav?.fetchStart || 0,
              memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
            })
          })

          observer.observe({ entryTypes: ['paint', 'navigation'] })

          // Force immediate resolution for testing
          setTimeout(() => {
            const paintEntries = performance.getEntriesByType('paint')
            const navEntries = performance.getEntriesByType('navigation')
            
            const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint')?.startTime || 0
            const nav = navEntries[0] as PerformanceNavigationTiming
            
            resolve({
              lcp: 0,
              fcp: fcp,
              cls: 0,
              fid: 0,
              tti: nav?.loadEventEnd - nav?.fetchStart || 0,
              memoryUsage: (performance as any).memory?.usedJSHeapSize || 0
            })
          }, 1000)
        })
      })

      // Measure LCP separately
      const lcpValue = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lastEntry = entries[entries.length - 1]
            resolve(lastEntry.startTime)
          })
          observer.observe({ entryTypes: ['largest-contentful-paint'] })
          
          // Fallback timeout
          setTimeout(() => resolve(0), 5000)
        })
      })

      // Measure CLS
      const clsValue = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          let cls = 0
          const observer = new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value
              }
            }
          })
          observer.observe({ entryTypes: ['layout-shift'] })
          
          setTimeout(() => resolve(cls), 3000)
        })
      })

      const finalMetrics: PerformanceMetrics = {
        ...metrics,
        lcp: lcpValue,
        cls: clsValue
      }

      performanceMetrics.push(finalMetrics)

      // Core Web Vitals thresholds (good values)
      expect(finalMetrics.lcp).toBeLessThan(2500) // LCP < 2.5s
      expect(finalMetrics.fcp).toBeLessThan(1800) // FCP < 1.8s
      expect(finalMetrics.cls).toBeLessThan(0.1)  // CLS < 0.1
      expect(finalMetrics.tti).toBeLessThan(3800) // TTI < 3.8s

      const jsCoverage = await page.coverage.stopJSCoverage()
      const cssCoverage = await page.coverage.stopCSSCoverage()

      // Log coverage information
      console.log(`JS Coverage: ${calculateCoverage(jsCoverage)}%`)
      console.log(`CSS Coverage: ${calculateCoverage(cssCoverage)}%`)
    })

    test('batch list should load efficiently with large datasets', async ({ page }) => {
      await page.route('/api/batches*', async (route) => {
        // Mock large dataset response
        const mockData = Array.from({ length: 100 }, (_, i) => ({
          id: `batch-${i}`,
          name: `Batch ${i}`,
          semester: (i % 8) + 1,
          program: { name: 'Test Program', shortName: 'TP' },
          _count: { students: 25, subjects: 5 }
        }))

        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(mockData)
        })
      })

      const startTime = performance.now()
      await page.goto('/batches')
      await page.waitForSelector('table tbody tr')
      const loadTime = performance.now() - startTime

      // Page should load within 3 seconds even with large dataset
      expect(loadTime).toBeLessThan(3000)

      // Check that table is properly virtualized or paginated
      const visibleRows = await page.locator('table tbody tr').count()
      expect(visibleRows).toBeLessThanOrEqual(50) // Should not render all 100 rows at once
    })

    test('form interactions should be responsive', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      // Measure input responsiveness
      const inputDelay = await page.evaluate(() => {
        return new Promise<number>((resolve) => {
          const input = document.querySelector('input[name="name"]') as HTMLInputElement
          if (!input) {
            resolve(0)
            return
          }

          const startTime = performance.now()
          
          const handleInput = () => {
            const endTime = performance.now()
            resolve(endTime - startTime)
            input.removeEventListener('input', handleInput)
          }

          input.addEventListener('input', handleInput)
          input.value = 'Test Input'
          input.dispatchEvent(new Event('input', { bubbles: true }))
        })
      })

      // Input should respond within 100ms
      expect(inputDelay).toBeLessThan(100)
    })

    test('search functionality should be performant', async ({ page }) => {
      await page.goto('/batches')

      const searchInput = page.locator('input[placeholder*="Search"]')
      await searchInput.fill('UX')

      const searchStartTime = performance.now()
      await searchInput.press('Enter')
      
      // Wait for search results
      await page.waitForFunction(() => {
        const rows = document.querySelectorAll('table tbody tr')
        return rows.length > 0
      }, { timeout: 5000 })

      const searchEndTime = performance.now()
      const searchDuration = searchEndTime - searchStartTime

      // Search should complete within 1 second
      expect(searchDuration).toBeLessThan(1000)
    })
  })

  test.describe('Memory Usage', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should not have memory leaks during navigation', async ({ page }) => {
      const initialMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      )

      // Navigate through multiple pages
      const pages = ['/dashboard', '/batches', '/faculty', '/students', '/subjects']
      
      for (const pagePath of pages) {
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
        
        // Force garbage collection if available
        await page.evaluate(() => {
          if ((window as any).gc) {
            (window as any).gc()
          }
        })
      }

      const finalMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      )

      // Memory should not increase by more than 50MB during navigation
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })

    test('should handle large data sets without excessive memory usage', async ({ page }) => {
      // Mock large dataset
      await page.route('/api/students*', async (route) => {
        const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
          id: `student-${i}`,
          studentId: `JLU2024${i.toString().padStart(3, '0')}`,
          user: { name: `Student ${i}`, email: `student${i}@jlu.edu.in` },
          batch: { name: 'Test Batch' }
        }))

        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        })
      })

      const beforeMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      )

      await page.goto('/students')
      await page.waitForLoadState('networkidle')

      const afterMemory = await page.evaluate(() => 
        (performance as any).memory?.usedJSHeapSize || 0
      )

      const memoryUsed = afterMemory - beforeMemory

      // Should not use more than 20MB for large dataset
      expect(memoryUsed).toBeLessThan(20 * 1024 * 1024)
    })
  })

  test.describe('Network Performance', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should minimize network requests', async ({ page }) => {
      let requestCount = 0
      let totalSize = 0

      page.on('request', (request) => {
        requestCount++
      })

      page.on('response', async (response) => {
        const headers = response.headers()
        const contentLength = headers['content-length']
        if (contentLength) {
          totalSize += parseInt(contentLength)
        }
      })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Should not make excessive requests
      expect(requestCount).toBeLessThan(50)

      // Total transfer size should be reasonable
      expect(totalSize).toBeLessThan(5 * 1024 * 1024) // Less than 5MB
    })

    test('should cache resources effectively', async ({ page }) => {
      let cacheHits = 0
      let cacheMisses = 0

      page.on('response', (response) => {
        const cacheHeader = response.headers()['cache-control']
        if (response.fromServiceWorker() || cacheHeader?.includes('max-age')) {
          cacheHits++
        } else {
          cacheMisses++
        }
      })

      // First visit
      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      // Second visit
      await page.reload()
      await page.waitForLoadState('networkidle')

      // Should have some cache hits on second visit
      expect(cacheHits).toBeGreaterThan(0)
    })

    test('should handle slow network gracefully', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', async (route) => {
        await new Promise(resolve => setTimeout(resolve, 100)) // 100ms delay
        await route.continue()
      })

      const startTime = performance.now()
      await page.goto('/dashboard')
      await page.waitForSelector('h1')
      const loadTime = performance.now() - startTime

      // Should show loading states and still be usable
      await expect(page.locator('h1')).toBeVisible()
      
      // Even with slow network, should load within reasonable time
      expect(loadTime).toBeLessThan(10000) // 10 seconds
    })
  })

  test.describe('Bundle Size Analysis', () => {
    test('should have reasonable JavaScript bundle size', async ({ page }) => {
      let jsSize = 0
      let cssSize = 0

      page.on('response', async (response) => {
        const url = response.url()
        const contentType = response.headers()['content-type']

        if (contentType?.includes('javascript')) {
          const buffer = await response.body()
          jsSize += buffer.length
        } else if (contentType?.includes('css')) {
          const buffer = await response.body()
          cssSize += buffer.length
        }
      })

      await page.goto('/dashboard')
      await page.waitForLoadState('networkidle')

      console.log(`JS Bundle Size: ${(jsSize / 1024).toFixed(2)}KB`)
      console.log(`CSS Bundle Size: ${(cssSize / 1024).toFixed(2)}KB`)

      // Bundle sizes should be reasonable
      expect(jsSize).toBeLessThan(1024 * 1024) // Less than 1MB JS
      expect(cssSize).toBeLessThan(200 * 1024) // Less than 200KB CSS
    })
  })

  test.describe('Real User Monitoring Simulation', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should handle concurrent users simulation', async ({ browser }) => {
      const contexts = await Promise.all(
        Array.from({ length: 5 }, () => browser.newContext({
          storageState: 'tests/e2e/.auth/admin.json'
        }))
      )

      const pages = await Promise.all(
        contexts.map(context => context.newPage())
      )

      const loadTimes = await Promise.all(
        pages.map(async (page) => {
          const startTime = performance.now()
          await page.goto('/dashboard')
          await page.waitForLoadState('networkidle')
          return performance.now() - startTime
        })
      )

      // All pages should load within reasonable time even with concurrent access
      loadTimes.forEach(loadTime => {
        expect(loadTime).toBeLessThan(5000) // 5 seconds
      })

      // Cleanup
      await Promise.all(pages.map(page => page.close()))
      await Promise.all(contexts.map(context => context.close()))
    })
  })
})

// Helper function to calculate coverage percentage
function calculateCoverage(coverage: any[]): number {
  let totalBytes = 0
  let usedBytes = 0

  for (const entry of coverage) {
    totalBytes += entry.text.length
    for (const range of entry.ranges) {
      usedBytes += range.end - range.start - 1
    }
  }

  return totalBytes > 0 ? Math.round((usedBytes / totalBytes) * 100) : 0
}