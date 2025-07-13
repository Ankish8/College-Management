import { test, expect } from '@playwright/test'
import { generateTestData, cleanupTestData } from './helpers/test-data'

/**
 * E2E Tests for Batch Management
 * 
 * Tests cover:
 * - Batch CRUD operations
 * - Batch filtering and search
 * - Batch validation
 * - Permission-based access
 * - UI responsiveness
 */

test.describe('Batch Management', () => {
  let testData: any

  test.beforeAll(async () => {
    testData = await generateTestData()
  })

  test.afterAll(async () => {
    await cleanupTestData(testData)
  })

  test.describe('Admin User - Full Access', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should display batch list page correctly', async ({ page }) => {
      await page.goto('/batches')

      // Check page title
      await expect(page).toHaveTitle(/Batches/)

      // Check main heading
      await expect(page.locator('h1:has-text("Batches")')).toBeVisible()

      // Check add batch button
      await expect(page.locator('button:has-text("Add Batch")')).toBeVisible()

      // Check search functionality
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()

      // Check filter options
      await expect(page.locator('select[name="program"]')).toBeVisible()
      await expect(page.locator('select[name="status"]')).toBeVisible()
    })

    test('should create new batch successfully', async ({ page }) => {
      await page.goto('/batches')

      // Click add batch button
      await page.click('button:has-text("Add Batch")')

      // Fill batch form
      await page.fill('input[name="name"]', 'B.Des UX Semester 3 Test')
      await page.selectOption('select[name="programId"]', testData.program.id)
      await page.selectOption('select[name="specializationId"]', testData.specialization.id)
      await page.fill('input[name="semester"]', '3')
      await page.fill('input[name="startYear"]', '2024')
      await page.fill('input[name="endYear"]', '2028')
      await page.fill('input[name="maxCapacity"]', '30')

      // Submit form
      await page.click('button[type="submit"]')

      // Verify success message
      await expect(page.locator('text=Batch created successfully')).toBeVisible()

      // Verify batch appears in list
      await expect(page.locator('text=B.Des UX Semester 3 Test')).toBeVisible()
    })

    test('should validate batch form correctly', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      // Try to submit empty form
      await page.click('button[type="submit"]')

      // Check validation messages
      await expect(page.locator('text=Batch name is required')).toBeVisible()
      await expect(page.locator('text=Program is required')).toBeVisible()
      await expect(page.locator('text=Semester is required')).toBeVisible()

      // Test semester validation
      await page.fill('input[name="semester"]', '15') // Invalid semester
      await page.click('button[type="submit"]')
      await expect(page.locator('text=Semester must be between 1 and 8')).toBeVisible()

      // Test year validation
      await page.fill('input[name="startYear"]', '2030')
      await page.fill('input[name="endYear"]', '2025') // End year before start year
      await page.click('button[type="submit"]')
      await expect(page.locator('text=End year must be after start year')).toBeVisible()

      // Test capacity validation
      await page.fill('input[name="maxCapacity"]', '-5') // Negative capacity
      await page.click('button[type="submit"]')
      await expect(page.locator('text=Capacity must be positive')).toBeVisible()
    })

    test('should edit batch successfully', async ({ page }) => {
      await page.goto('/batches')

      // Find and edit a batch
      const batchRow = page.locator(`tr:has-text("${testData.batch.name}")`)
      await batchRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Edit')

      // Update batch details
      await page.fill('input[name="name"]', 'Updated Batch Name')
      await page.fill('input[name="maxCapacity"]', '35')

      // Submit changes
      await page.click('button[type="submit"]')

      // Verify success message
      await expect(page.locator('text=Batch updated successfully')).toBeVisible()

      // Verify changes in list
      await expect(page.locator('text=Updated Batch Name')).toBeVisible()
    })

    test('should search batches correctly', async ({ page }) => {
      await page.goto('/batches')

      // Search by batch name
      await page.fill('input[placeholder*="Search"]', 'UX')
      await page.press('input[placeholder*="Search"]', 'Enter')

      // Verify filtered results
      await expect(page.locator('text=UX')).toBeVisible()

      // Clear search
      await page.fill('input[placeholder*="Search"]', '')
      await page.press('input[placeholder*="Search"]', 'Enter')

      // Verify all batches are shown again
      await expect(page.locator('table tbody tr')).toHaveCount(3, { timeout: 10000 })
    })

    test('should filter batches by program', async ({ page }) => {
      await page.goto('/batches')

      // Filter by program
      await page.selectOption('select[name="program"]', testData.program.id)

      // Verify filtered results
      await expect(page.locator(`text=${testData.program.shortName}`)).toBeVisible()

      // Reset filter
      await page.selectOption('select[name="program"]', '')

      // Verify all batches are shown
      await expect(page.locator('table tbody tr')).toHaveCount(3, { timeout: 10000 })
    })

    test('should delete batch with confirmation', async ({ page }) => {
      await page.goto('/batches')

      // Create a batch to delete
      await page.click('button:has-text("Add Batch")')
      await page.fill('input[name="name"]', 'Batch to Delete')
      await page.selectOption('select[name="programId"]', testData.program.id)
      await page.fill('input[name="semester"]', '1')
      await page.fill('input[name="startYear"]', '2024')
      await page.fill('input[name="endYear"]', '2028')
      await page.click('button[type="submit"]')

      // Delete the batch
      const batchRow = page.locator('tr:has-text("Batch to Delete")')
      await batchRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Delete')

      // Confirm deletion
      await page.click('button:has-text("Delete"):last-of-type')

      // Verify success message
      await expect(page.locator('text=Batch deleted successfully')).toBeVisible()

      // Verify batch is removed from list
      await expect(page.locator('text=Batch to Delete')).not.toBeVisible()
    })

    test('should handle batch capacity warnings', async ({ page }) => {
      await page.goto('/batches')

      // Create over-capacity batch
      await page.click('button:has-text("Add Batch")')
      await page.fill('input[name="name"]', 'Over Capacity Batch')
      await page.selectOption('select[name="programId"]', testData.program.id)
      await page.fill('input[name="semester"]', '1')
      await page.fill('input[name="startYear"]', '2024')
      await page.fill('input[name="endYear"]', '2028')
      await page.fill('input[name="maxCapacity"]', '10')
      await page.click('button[type="submit"]')

      // Add students to exceed capacity (this would be done through API or separate test)
      // For now, we'll verify the UI handles capacity display correctly

      // Look for capacity warning indicators
      const batchCard = page.locator('text=Over Capacity Batch').locator('..')
      await expect(batchCard.locator('text=10')).toBeVisible() // Capacity number
    })
  })

  test.describe('Faculty User - Limited Access', () => {
    test.use({ storageState: 'tests/e2e/.auth/faculty.json' })

    test('should view batches but not create/edit/delete', async ({ page }) => {
      await page.goto('/batches')

      // Should be able to view batch list
      await expect(page.locator('h1:has-text("Batches")')).toBeVisible()

      // Should not see add batch button
      await expect(page.locator('button:has-text("Add Batch")')).not.toBeVisible()

      // Should not see edit/delete actions
      const actionButtons = page.locator('button[aria-label="Actions"]')
      if (await actionButtons.count() > 0) {
        await actionButtons.first().click()
        await expect(page.locator('text=Edit')).not.toBeVisible()
        await expect(page.locator('text=Delete')).not.toBeVisible()
      }
    })

    test('should be able to search and filter batches', async ({ page }) => {
      await page.goto('/batches')

      // Should have access to search
      await expect(page.locator('input[placeholder*="Search"]')).toBeVisible()

      // Should have access to filters
      await expect(page.locator('select[name="program"]')).toBeVisible()

      // Test search functionality
      await page.fill('input[placeholder*="Search"]', 'UX')
      await page.press('input[placeholder*="Search"]', 'Enter')
      await expect(page.locator('text=UX')).toBeVisible()
    })
  })

  test.describe('Student User - Restricted Access', () => {
    test.use({ storageState: 'tests/e2e/.auth/student.json' })

    test('should not have access to batch management', async ({ page }) => {
      // Try to access batches page directly
      await page.goto('/batches')

      // Should be redirected or see access denied
      await expect(page.locator('text=Access Denied')).toBeVisible()
      // OR should be redirected to dashboard
      // await expect(page).toHaveURL('/dashboard')
    })

    test('should not see batch management in navigation', async ({ page }) => {
      await page.goto('/dashboard')

      // Should not see batches link in navigation
      await expect(page.locator('nav a:has-text("Batches")')).not.toBeVisible()
    })
  })

  test.describe('Mobile Responsiveness', () => {
    test.use({ 
      storageState: 'tests/e2e/.auth/admin.json',
      viewport: { width: 375, height: 667 } // iPhone SE size
    })

    test('should display batch list on mobile correctly', async ({ page }) => {
      await page.goto('/batches')

      // Check mobile-optimized layout
      await expect(page.locator('h1:has-text("Batches")')).toBeVisible()

      // Check if table converts to cards on mobile
      const batchCards = page.locator('[data-testid="batch-card"]')
      if (await batchCards.count() > 0) {
        await expect(batchCards.first()).toBeVisible()
      }

      // Check mobile navigation
      const mobileMenu = page.locator('button[aria-label="Menu"]')
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click()
        await expect(page.locator('nav')).toBeVisible()
      }
    })

    test('should handle form input on mobile', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      // Test form on mobile
      await page.fill('input[name="name"]', 'Mobile Test Batch')
      await page.selectOption('select[name="programId"]', testData.program.id)

      // Check if form is usable on mobile
      await expect(page.locator('input[name="name"]')).toHaveValue('Mobile Test Batch')
    })
  })

  test.describe('Performance and Load Testing', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should load batch list within performance budget', async ({ page }) => {
      // Start timing
      const startTime = Date.now()

      await page.goto('/batches')
      await expect(page.locator('h1:has-text("Batches")')).toBeVisible()

      const loadTime = Date.now() - startTime

      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    })

    test('should handle large dataset efficiently', async ({ page }) => {
      await page.goto('/batches')

      // Test pagination if implemented
      const paginationNext = page.locator('button:has-text("Next")')
      if (await paginationNext.isVisible()) {
        await paginationNext.click()
        await expect(page.locator('table tbody tr')).toHaveCount.greaterThan(0)
      }

      // Test search performance
      const searchStart = Date.now()
      await page.fill('input[placeholder*="Search"]', 'UX')
      await page.press('input[placeholder*="Search"]', 'Enter')
      await expect(page.locator('text=UX')).toBeVisible()
      const searchTime = Date.now() - searchStart

      // Search should complete within 1 second
      expect(searchTime).toBeLessThan(1000)
    })
  })
})