import { test as setup, expect } from '@playwright/test'
import path from 'path'

/**
 * Authentication Setup for E2E Tests
 * 
 * This setup script handles authentication for different user roles
 * and stores the authentication state for reuse in tests.
 */

const authFile = path.join(__dirname, '.auth/user.json')
const adminAuthFile = path.join(__dirname, '.auth/admin.json')
const facultyAuthFile = path.join(__dirname, '.auth/faculty.json')
const studentAuthFile = path.join(__dirname, '.auth/student.json')

// Admin authentication setup
setup('authenticate admin', async ({ page }) => {
  console.log('Setting up admin authentication...')
  
  await page.goto('/auth/signin')
  
  // Fill login form
  await page.fill('input[name="email"]', 'admin@jlu.edu.in')
  await page.fill('input[name="password"]', 'admin123')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
  
  // Verify admin access
  await expect(page.locator('text=Admin Dashboard')).toBeVisible()
  
  // Verify admin navigation items are present
  await expect(page.locator('nav a:has-text("Settings")')).toBeVisible()
  await expect(page.locator('nav a:has-text("Batches")')).toBeVisible()
  await expect(page.locator('nav a:has-text("Faculty")')).toBeVisible()
  await expect(page.locator('nav a:has-text("Students")')).toBeVisible()
  
  // Save authentication state
  await page.context().storageState({ path: adminAuthFile })
  console.log('Admin authentication state saved')
})

// Faculty authentication setup
setup('authenticate faculty', async ({ page }) => {
  console.log('Setting up faculty authentication...')
  
  await page.goto('/auth/signin')
  
  // Fill login form
  await page.fill('input[name="email"]', 'ankish.khatri@jlu.edu.in')
  await page.fill('input[name="password"]', 'password123')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
  
  // Verify faculty access
  await expect(page.locator('text=Faculty Dashboard')).toBeVisible()
  
  // Verify faculty navigation items
  await expect(page.locator('nav a:has-text("Attendance")')).toBeVisible()
  await expect(page.locator('nav a:has-text("Timetable")')).toBeVisible()
  await expect(page.locator('nav a:has-text("Subjects")')).toBeVisible()
  
  // Verify restricted access (should not see Settings)
  await expect(page.locator('nav a:has-text("Settings")')).not.toBeVisible()
  
  // Save authentication state
  await page.context().storageState({ path: facultyAuthFile })
  console.log('Faculty authentication state saved')
})

// Student authentication setup
setup('authenticate student', async ({ page }) => {
  console.log('Setting up student authentication...')
  
  await page.goto('/auth/signin')
  
  // Fill login form with a test student account
  await page.fill('input[name="email"]', 'student.test@jlu.edu.in')
  await page.fill('input[name="password"]', 'student123')
  
  // Submit form
  await page.click('button[type="submit"]')
  
  // Wait for redirect to dashboard
  await expect(page).toHaveURL('/dashboard')
  
  // Verify student access
  await expect(page.locator('text=Student Dashboard')).toBeVisible()
  
  // Verify student navigation items
  await expect(page.locator('nav a:has-text("My Attendance")')).toBeVisible()
  await expect(page.locator('nav a:has-text("My Timetable")')).toBeVisible()
  await expect(page.locator('nav a:has-text("My Subjects")')).toBeVisible()
  
  // Verify restricted access
  await expect(page.locator('nav a:has-text("Settings")')).not.toBeVisible()
  await expect(page.locator('nav a:has-text("Faculty")')).not.toBeVisible()
  await expect(page.locator('nav a:has-text("All Students")')).not.toBeVisible()
  
  // Save authentication state
  await page.context().storageState({ path: studentAuthFile })
  console.log('Student authentication state saved')
})

// Default authentication (admin for most tests)
setup('authenticate default', async ({ page }) => {
  console.log('Setting up default authentication (admin)...')
  
  await page.goto('/auth/signin')
  
  // Use admin credentials as default
  await page.fill('input[name="email"]', 'admin@jlu.edu.in')
  await page.fill('input[name="password"]', 'admin123')
  
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
  
  // Save as default auth file
  await page.context().storageState({ path: authFile })
  console.log('Default authentication state saved')
})

// Setup test for form validation
setup('test login validation', async ({ page }) => {
  console.log('Testing login form validation...')
  
  await page.goto('/auth/signin')
  
  // Test empty form submission
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Email is required')).toBeVisible()
  await expect(page.locator('text=Password is required')).toBeVisible()
  
  // Test invalid email format
  await page.fill('input[name="email"]', 'invalid-email')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Please enter a valid email')).toBeVisible()
  
  // Test invalid credentials
  await page.fill('input[name="email"]', 'nonexistent@jlu.edu.in')
  await page.fill('input[name="password"]', 'wrongpassword')
  await page.click('button[type="submit"]')
  await expect(page.locator('text=Invalid credentials')).toBeVisible()
  
  console.log('Login validation tests completed')
})

// Setup test for session persistence
setup('test session persistence', async ({ page }) => {
  console.log('Testing session persistence...')
  
  // Login as admin
  await page.goto('/auth/signin')
  await page.fill('input[name="email"]', 'admin@jlu.edu.in')
  await page.fill('input[name="password"]', 'admin123')
  await page.click('button[type="submit"]')
  await expect(page).toHaveURL('/dashboard')
  
  // Navigate to a protected page
  await page.goto('/settings')
  await expect(page).toHaveURL('/settings')
  
  // Refresh page to test session persistence
  await page.reload()
  await expect(page).toHaveURL('/settings')
  
  // Navigate directly to dashboard
  await page.goto('/dashboard')
  await expect(page.locator('text=Admin Dashboard')).toBeVisible()
  
  console.log('Session persistence tests completed')
})

// Cleanup function for authentication
setup('cleanup auth', async ({ page }) => {
  console.log('Cleaning up authentication state...')
  
  // Try to logout if authenticated
  try {
    await page.goto('/dashboard')
    const signOutButton = page.locator('button:has-text("Sign Out")')
    if (await signOutButton.isVisible()) {
      await signOutButton.click()
      await expect(page).toHaveURL('/auth/signin')
    }
  } catch (error) {
    console.log('Already logged out or on sign-in page')
  }
  
  // Clear storage
  await page.context().clearCookies()
  await page.context().clearPermissions()
  
  console.log('Authentication cleanup completed')
})