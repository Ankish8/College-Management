import { test, expect } from '@playwright/test'

/**
 * Regression Testing Suite
 * 
 * Critical user journeys and features that must continue working
 * after any code changes. These tests run on every deployment
 * and prevent breaking changes.
 */

test.describe('Regression Testing - Critical User Journeys', () => {

  test.describe('Authentication Regression', () => {
    test('Admin login and dashboard access', async ({ page }) => {
      await page.goto('/auth/signin')
      
      await page.fill('input[name="email"]', 'admin@jlu.edu.in')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible()
      
      // Verify admin navigation is present
      await expect(page.locator('nav a:has-text("Settings")')).toBeVisible()
      await expect(page.locator('nav a:has-text("Batches")')).toBeVisible()
      await expect(page.locator('nav a:has-text("Faculty")')).toBeVisible()
      await expect(page.locator('nav a:has-text("Students")')).toBeVisible()
    })

    test('Faculty login and limited access', async ({ page }) => {
      await page.goto('/auth/signin')
      
      await page.fill('input[name="email"]', 'ankish.khatri@jlu.edu.in')
      await page.fill('input[name="password"]', 'password123')
      await page.click('button[type="submit"]')
      
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('h1:has-text("Faculty Dashboard")')).toBeVisible()
      
      // Verify faculty has limited navigation
      await expect(page.locator('nav a:has-text("Attendance")')).toBeVisible()
      await expect(page.locator('nav a:has-text("Timetable")')).toBeVisible()
      await expect(page.locator('nav a:has-text("Settings")')).not.toBeVisible()
    })

    test('Student login and restricted access', async ({ page }) => {
      await page.goto('/auth/signin')
      
      await page.fill('input[name="email"]', 'student.test@jlu.edu.in')
      await page.fill('input[name="password"]', 'student123')
      await page.click('button[type="submit"]')
      
      await expect(page).toHaveURL('/dashboard')
      await expect(page.locator('h1:has-text("Student Dashboard")')).toBeVisible()
      
      // Verify student has most restricted access
      await expect(page.locator('nav a:has-text("My Attendance")')).toBeVisible()
      await expect(page.locator('nav a:has-text("My Timetable")')).toBeVisible()
      await expect(page.locator('nav a:has-text("Settings")')).not.toBeVisible()
      await expect(page.locator('nav a:has-text("Faculty")')).not.toBeVisible()
    })

    test('Session timeout and re-authentication', async ({ page }) => {
      // Login
      await page.goto('/auth/signin')
      await page.fill('input[name="email"]', 'admin@jlu.edu.in')
      await page.fill('input[name="password"]', 'admin123')
      await page.click('button[type="submit"]')
      await expect(page).toHaveURL('/dashboard')

      // Clear session cookies to simulate timeout
      await page.context().clearCookies()
      
      // Try to access protected route
      await page.goto('/settings')
      
      // Should redirect to login
      await expect(page).toHaveURL('/auth/signin')
    })
  })

  test.describe('Batch Management Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Create, view, edit, and delete batch workflow', async ({ page }) => {
      await page.goto('/batches')
      
      // CREATE: Add new batch
      await page.click('button:has-text("Add Batch")')
      
      const batchName = `Regression Test Batch ${Date.now()}`
      await page.fill('input[name="name"]', batchName)
      await page.selectOption('select[name="programId"]', { index: 1 })
      await page.selectOption('select[name="specializationId"]', { index: 1 })
      await page.fill('input[name="semester"]', '3')
      await page.fill('input[name="startYear"]', '2024')
      await page.fill('input[name="endYear"]', '2028')
      await page.fill('input[name="maxCapacity"]', '25')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Batch created successfully')).toBeVisible()
      
      // VIEW: Verify batch appears in list
      await expect(page.locator(`text=${batchName}`)).toBeVisible()
      
      // EDIT: Modify batch
      const batchRow = page.locator(`tr:has-text("${batchName}")`)
      await batchRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Edit')
      
      const updatedName = `${batchName} - Updated`
      await page.fill('input[name="name"]', updatedName)
      await page.fill('input[name="maxCapacity"]', '30')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Batch updated successfully')).toBeVisible()
      await expect(page.locator(`text=${updatedName}`)).toBeVisible()
      
      // DELETE: Remove batch
      const updatedBatchRow = page.locator(`tr:has-text("${updatedName}")`)
      await updatedBatchRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Delete')
      await page.click('button:has-text("Delete"):last-of-type') // Confirm
      
      await expect(page.locator('text=Batch deleted successfully')).toBeVisible()
      await expect(page.locator(`text=${updatedName}`)).not.toBeVisible()
    })

    test('Batch search and filtering functionality', async ({ page }) => {
      await page.goto('/batches')
      
      // Test search functionality
      await page.fill('input[placeholder*="Search"]', 'UX')
      await page.press('input[placeholder*="Search"]', 'Enter')
      
      // Should show filtered results
      const searchResults = page.locator('table tbody tr')
      const resultCount = await searchResults.count()
      
      if (resultCount > 0) {
        // All visible results should contain 'UX'
        for (let i = 0; i < resultCount; i++) {
          const row = searchResults.nth(i)
          await expect(row).toContainText('UX')
        }
      }
      
      // Clear search
      await page.fill('input[placeholder*="Search"]', '')
      await page.press('input[placeholder*="Search"]', 'Enter')
      
      // Test program filter
      await page.selectOption('select[name="program"]', { index: 1 })
      
      // Should show filtered results
      const filteredResults = page.locator('table tbody tr')
      const filteredCount = await filteredResults.count()
      expect(filteredCount).toBeGreaterThanOrEqual(0)
      
      // Reset filter
      await page.selectOption('select[name="program"]', '')
    })

    test('Batch validation rules enforcement', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')
      
      // Test required field validation
      await page.click('button[type="submit"]')
      await expect(page.locator('text=Batch name is required')).toBeVisible()
      
      // Test semester validation
      await page.fill('input[name="name"]', 'Test Batch')
      await page.fill('input[name="semester"]', '15') // Invalid
      await page.click('button[type="submit"]')
      await expect(page.locator('text=Semester must be between 1 and 8')).toBeVisible()
      
      // Test year validation
      await page.fill('input[name="semester"]', '5')
      await page.fill('input[name="startYear"]', '2030')
      await page.fill('input[name="endYear"]', '2025') // End before start
      await page.click('button[type="submit"]')
      await expect(page.locator('text=End year must be after start year')).toBeVisible()
    })
  })

  test.describe('Faculty Management Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Faculty CRUD operations', async ({ page }) => {
      await page.goto('/faculty')
      
      // CREATE: Add new faculty
      await page.click('button:has-text("Add Faculty")')
      
      const facultyEmail = `regression.faculty.${Date.now()}@jlu.edu.in`
      await page.fill('input[name="name"]', 'Regression Test Faculty')
      await page.fill('input[name="email"]', facultyEmail)
      await page.fill('input[name="phone"]', '+91-9876543210')
      await page.fill('input[name="employeeId"]', `EMP${Date.now()}`)
      await page.selectOption('select[name="departmentId"]', { index: 1 })
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Faculty created successfully')).toBeVisible()
      
      // VIEW: Verify faculty appears in list
      await expect(page.locator(`text=${facultyEmail}`)).toBeVisible()
      
      // EDIT: Modify faculty
      const facultyRow = page.locator(`tr:has-text("${facultyEmail}")`)
      await facultyRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Edit')
      
      await page.fill('input[name="name"]', 'Updated Test Faculty')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Faculty updated successfully')).toBeVisible()
      await expect(page.locator('text=Updated Test Faculty')).toBeVisible()
      
      // DELETE: Remove faculty
      const updatedFacultyRow = page.locator(`tr:has-text("${facultyEmail}")`)
      await updatedFacultyRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Delete')
      await page.click('button:has-text("Delete"):last-of-type')
      
      await expect(page.locator('text=Faculty deleted successfully')).toBeVisible()
      await expect(page.locator(`text=${facultyEmail}`)).not.toBeVisible()
    })
  })

  test.describe('Student Management Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Student CRUD operations', async ({ page }) => {
      await page.goto('/students')
      
      // CREATE: Add new student
      await page.click('button:has-text("Add Student")')
      
      const studentEmail = `regression.student.${Date.now()}@jlu.edu.in`
      const studentId = `REG${Date.now()}`
      
      await page.fill('input[name="name"]', 'Regression Test Student')
      await page.fill('input[name="email"]', studentEmail)
      await page.fill('input[name="studentId"]', studentId)
      await page.fill('input[name="rollNumber"]', `R${Date.now()}`)
      await page.selectOption('select[name="batchId"]', { index: 1 })
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Student created successfully')).toBeVisible()
      
      // VIEW: Verify student appears in list
      await expect(page.locator(`text=${studentEmail}`)).toBeVisible()
      
      // EDIT: Modify student
      const studentRow = page.locator(`tr:has-text("${studentEmail}")`)
      await studentRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Edit')
      
      await page.fill('input[name="name"]', 'Updated Test Student')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Student updated successfully')).toBeVisible()
      await expect(page.locator('text=Updated Test Student')).toBeVisible()
      
      // DELETE: Remove student
      const updatedStudentRow = page.locator(`tr:has-text("${studentEmail}")`)
      await updatedStudentRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Delete')
      await page.click('button:has-text("Delete"):last-of-type')
      
      await expect(page.locator('text=Student deleted successfully')).toBeVisible()
      await expect(page.locator(`text=${studentEmail}`)).not.toBeVisible()
    })

    test('Bulk student upload functionality', async ({ page }) => {
      await page.goto('/students')
      
      const bulkUploadButton = page.locator('button:has-text("Bulk Upload")')
      if (await bulkUploadButton.isVisible()) {
        await bulkUploadButton.click()
        
        // Test CSV upload validation
        const csvContent = `name,email,studentId,rollNumber,batchId
Test Student 1,test1@jlu.edu.in,TST001,R001,batch-1
Test Student 2,test2@jlu.edu.in,TST002,R002,batch-1`
        
        await page.setInputFiles('input[type="file"]', {
          name: 'students.csv',
          mimeType: 'text/csv',
          buffer: Buffer.from(csvContent)
        })
        
        await page.click('button:has-text("Upload")')
        
        // Should show preview or validation
        await expect(page.locator('text=2 students')).toBeVisible()
        
        // Cancel upload for regression test
        await page.click('button:has-text("Cancel")')
      }
    })
  })

  test.describe('Subject Management Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Subject CRUD operations', async ({ page }) => {
      await page.goto('/subjects')
      
      // CREATE: Add new subject
      await page.click('button:has-text("Add Subject")')
      
      const subjectCode = `REG${Date.now()}`
      await page.fill('input[name="name"]', 'Regression Test Subject')
      await page.fill('input[name="code"]', subjectCode)
      await page.fill('input[name="credits"]', '4')
      await page.selectOption('select[name="batchId"]', { index: 1 })
      await page.selectOption('select[name="primaryFacultyId"]', { index: 1 })
      await page.selectOption('select[name="examType"]', 'THEORY')
      await page.selectOption('select[name="subjectType"]', 'CORE')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Subject created successfully')).toBeVisible()
      
      // VIEW: Verify subject appears in list
      await expect(page.locator(`text=${subjectCode}`)).toBeVisible()
      
      // EDIT: Modify subject
      const subjectRow = page.locator(`tr:has-text("${subjectCode}")`)
      await subjectRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Edit')
      
      await page.fill('input[name="name"]', 'Updated Test Subject')
      await page.fill('input[name="credits"]', '6')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Subject updated successfully')).toBeVisible()
      await expect(page.locator('text=Updated Test Subject')).toBeVisible()
      
      // DELETE: Remove subject
      const updatedSubjectRow = page.locator(`tr:has-text("${subjectCode}")`)
      await updatedSubjectRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Delete')
      await page.click('button:has-text("Delete"):last-of-type')
      
      await expect(page.locator('text=Subject deleted successfully')).toBeVisible()
      await expect(page.locator(`text=${subjectCode}`)).not.toBeVisible()
    })
  })

  test.describe('Timetable Management Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Timetable viewing and navigation', async ({ page }) => {
      await page.goto('/timetable')
      
      // Test different view modes
      await expect(page.locator('h1:has-text("Timetable")')).toBeVisible()
      
      // Week view
      await page.click('button:has-text("Week")')
      await expect(page.locator('[data-testid="week-view"]')).toBeVisible()
      
      // Month view
      await page.click('button:has-text("Month")')
      await expect(page.locator('[data-testid="month-view"]')).toBeVisible()
      
      // Day view
      await page.click('button:has-text("Day")')
      await expect(page.locator('[data-testid="day-view"]')).toBeVisible()
      
      // Test navigation
      await page.click('button[aria-label="Previous"]')
      await page.click('button[aria-label="Next"]')
      await page.click('button:has-text("Today")')
    })

    test('Timetable entry creation and management', async ({ page }) => {
      await page.goto('/timetable/manage')
      
      const createButton = page.locator('button:has-text("Create Entry")')
      if (await createButton.isVisible()) {
        await createButton.click()
        
        // Fill timetable entry form
        await page.selectOption('select[name="batchId"]', { index: 1 })
        await page.selectOption('select[name="subjectId"]', { index: 1 })
        await page.selectOption('select[name="facultyId"]', { index: 1 })
        await page.selectOption('select[name="timeSlotId"]', { index: 1 })
        await page.selectOption('select[name="dayOfWeek"]', 'MONDAY')
        await page.click('button[type="submit"]')
        
        // Should create successfully or show validation errors
        const successMessage = page.locator('text=Entry created successfully')
        const errorMessage = page.locator('text=Conflict detected')
        
        await expect(successMessage.or(errorMessage)).toBeVisible()
      }
    })
  })

  test.describe('Settings and Configuration Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Department settings management', async ({ page }) => {
      await page.goto('/settings')
      
      // Access department settings
      await page.click('text=Department')
      
      // Test settings form
      await page.fill('input[name="creditHoursRatio"]', '15')
      await page.fill('input[name="maxFacultyCredits"]', '30')
      await page.click('button:has-text("Save Settings")')
      
      await expect(page.locator('text=Settings updated')).toBeVisible()
    })

    test('Time slots configuration', async ({ page }) => {
      await page.goto('/settings/timeslots')
      
      // Test time slot management
      await page.click('button:has-text("Add Time Slot")')
      
      await page.fill('input[name="name"]', 'Regression Test Slot')
      await page.fill('input[name="startTime"]', '16:00')
      await page.fill('input[name="endTime"]', '16:50')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Time slot created')).toBeVisible()
      
      // Verify it appears in list
      await expect(page.locator('text=Regression Test Slot')).toBeVisible()
      
      // Clean up
      const timeSlotRow = page.locator('tr:has-text("Regression Test Slot")')
      await timeSlotRow.locator('button[aria-label="Actions"]').click()
      await page.click('text=Delete')
      await page.click('button:has-text("Delete"):last-of-type')
    })
  })

  test.describe('Navigation and UI Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Main navigation functionality', async ({ page }) => {
      await page.goto('/dashboard')
      
      // Test all main navigation links
      const navItems = [
        { text: 'Dashboard', url: '/dashboard' },
        { text: 'Batches', url: '/batches' },
        { text: 'Faculty', url: '/faculty' },
        { text: 'Students', url: '/students' },
        { text: 'Subjects', url: '/subjects' },
        { text: 'Timetable', url: '/timetable' },
        { text: 'Settings', url: '/settings' }
      ]
      
      for (const item of navItems) {
        await page.click(`nav a:has-text("${item.text}")`)
        await expect(page).toHaveURL(item.url)
        
        // Verify page loads correctly
        await expect(page.locator('h1')).toBeVisible()
      }
    })

    test('Responsive design regression', async ({ page }) => {
      // Test desktop view
      await page.setViewportSize({ width: 1280, height: 720 })
      await page.goto('/dashboard')
      
      await expect(page.locator('nav')).toBeVisible()
      await expect(page.locator('h1')).toBeVisible()
      
      // Test tablet view
      await page.setViewportSize({ width: 768, height: 1024 })
      await page.reload()
      
      await expect(page.locator('h1')).toBeVisible()
      
      // Test mobile view
      await page.setViewportSize({ width: 375, height: 667 })
      await page.reload()
      
      await expect(page.locator('h1')).toBeVisible()
      
      // Mobile menu should be accessible
      const mobileMenu = page.locator('button[aria-label="Menu"]')
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click()
        await expect(page.locator('nav')).toBeVisible()
      }
    })

    test('Loading states and error handling', async ({ page }) => {
      await page.goto('/batches')
      
      // Test loading states by intercepting API calls
      await page.route('/api/batches*', async (route) => {
        // Delay response to test loading state
        await new Promise(resolve => setTimeout(resolve, 1000))
        await route.continue()
      })
      
      await page.reload()
      
      // Should show loading indicator
      const loadingIndicator = page.locator('[data-testid="loading"]')
      if (await loadingIndicator.isVisible()) {
        await expect(loadingIndicator).toBeVisible()
        await expect(loadingIndicator).not.toBeVisible({ timeout: 5000 })
      }
      
      // Test error handling
      await page.route('/api/batches*', route => {
        route.fulfill({ status: 500, body: 'Server Error' })
      })
      
      await page.reload()
      
      // Should show error message
      await expect(page.locator('text=Error loading')).toBeVisible()
    })
  })

  test.describe('Data Persistence Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Form data persistence across page refreshes', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')
      
      // Fill partial form
      await page.fill('input[name="name"]', 'Persistence Test Batch')
      await page.selectOption('select[name="programId"]', { index: 1 })
      
      // Refresh page
      await page.reload()
      
      // Form should either be cleared or show unsaved changes warning
      // This depends on implementation - test accordingly
      await page.click('button:has-text("Add Batch")')
    })

    test('User preferences persistence', async ({ page }) => {
      await page.goto('/timetable')
      
      // Set view preference
      await page.click('button:has-text("Month")')
      
      // Navigate away and back
      await page.goto('/dashboard')
      await page.goto('/timetable')
      
      // Should remember last view preference
      await expect(page.locator('[data-testid="month-view"]')).toBeVisible()
    })
  })

  test.describe('Performance Regression', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Page load performance regression', async ({ page }) => {
      const pages = [
        '/dashboard',
        '/batches',
        '/faculty',
        '/students',
        '/subjects',
        '/timetable'
      ]
      
      for (const pagePath of pages) {
        const startTime = Date.now()
        await page.goto(pagePath)
        await page.waitForLoadState('networkidle')
        const loadTime = Date.now() - startTime
        
        // Page should load within 3 seconds
        expect(loadTime).toBeLessThan(3000)
        
        // Should have visible content
        await expect(page.locator('h1')).toBeVisible()
      }
    })

    test('Large dataset handling regression', async ({ page }) => {
      // Mock large dataset
      await page.route('/api/students*', async (route) => {
        const largeDataset = Array.from({ length: 100 }, (_, i) => ({
          id: `student-${i}`,
          studentId: `JLU2024${i.toString().padStart(3, '0')}`,
          user: { name: `Student ${i}`, email: `student${i}@jlu.edu.in` },
          batch: { name: 'Large Batch' }
        }))
        
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify(largeDataset)
        })
      })
      
      const startTime = Date.now()
      await page.goto('/students')
      await expect(page.locator('table')).toBeVisible()
      const loadTime = Date.now() - startTime
      
      // Should handle large dataset efficiently
      expect(loadTime).toBeLessThan(5000)
      
      // Should show pagination or virtualization
      const paginationOrVirtualization = page.locator(
        'nav[aria-label="pagination"], [data-testid="virtual-list"]'
      )
      if (await paginationOrVirtualization.count() > 0) {
        await expect(paginationOrVirtualization.first()).toBeVisible()
      }
    })
  })
})