import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

/**
 * Accessibility Testing Suite
 * 
 * Tests WCAG 2.1 AA compliance across all major pages and user flows
 * Uses axe-core for automated accessibility testing
 */

test.describe('Accessibility Testing - WCAG 2.1 AA Compliance', () => {
  
  test.describe('Authentication Pages', () => {
    test('login page should be accessible', async ({ page }) => {
      await page.goto('/auth/signin')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('login form should have proper labels and ARIA attributes', async ({ page }) => {
      await page.goto('/auth/signin')

      // Check form labels
      await expect(page.locator('label[for="email"]')).toBeVisible()
      await expect(page.locator('label[for="password"]')).toBeVisible()

      // Check input accessibility
      const emailInput = page.locator('input[name="email"]')
      await expect(emailInput).toHaveAttribute('type', 'email')
      await expect(emailInput).toHaveAttribute('required')
      await expect(emailInput).toHaveAttribute('aria-label')

      const passwordInput = page.locator('input[name="password"]')
      await expect(passwordInput).toHaveAttribute('type', 'password')
      await expect(passwordInput).toHaveAttribute('required')
      await expect(passwordInput).toHaveAttribute('aria-label')

      // Check submit button
      const submitButton = page.locator('button[type="submit"]')
      await expect(submitButton).toHaveAttribute('aria-label')
    })

    test('error messages should be announced to screen readers', async ({ page }) => {
      await page.goto('/auth/signin')

      // Submit empty form to trigger errors
      await page.click('button[type="submit"]')

      // Check error messages have proper ARIA attributes
      const errorMessages = page.locator('[role="alert"]')
      await expect(errorMessages.first()).toBeVisible()

      // Check that errors are associated with inputs
      const emailError = page.locator('input[name="email"] + [role="alert"]')
      const passwordError = page.locator('input[name="password"] + [role="alert"]')

      if (await emailError.count() > 0) {
        await expect(emailError).toBeVisible()
      }
      if (await passwordError.count() > 0) {
        await expect(passwordError).toBeVisible()
      }
    })
  })

  test.describe('Dashboard Accessibility', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('dashboard should be accessible', async ({ page }) => {
      await page.goto('/dashboard')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .exclude('#third-party-widget') // Exclude third-party widgets from testing
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('dashboard navigation should be keyboard accessible', async ({ page }) => {
      await page.goto('/dashboard')

      // Test keyboard navigation
      await page.keyboard.press('Tab')
      
      // Check that focus is visible and logical
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()

      // Navigate through main navigation items
      const navItems = page.locator('nav a')
      const navCount = await navItems.count()

      for (let i = 0; i < navCount; i++) {
        await page.keyboard.press('Tab')
        const currentFocus = page.locator(':focus')
        await expect(currentFocus).toBeVisible()
      }
    })

    test('dashboard should have proper heading hierarchy', async ({ page }) => {
      await page.goto('/dashboard')

      // Check H1 exists and is unique
      const h1Elements = page.locator('h1')
      await expect(h1Elements).toHaveCount(1)
      await expect(h1Elements.first()).toBeVisible()

      // Check heading hierarchy (no skipped levels)
      const headings = await page.locator('h1, h2, h3, h4, h5, h6').all()
      const headingLevels = await Promise.all(
        headings.map(async (heading) => {
          const tagName = await heading.evaluate(el => el.tagName.toLowerCase())
          return parseInt(tagName.charAt(1))
        })
      )

      // Verify no heading levels are skipped
      for (let i = 1; i < headingLevels.length; i++) {
        const difference = headingLevels[i] - headingLevels[i - 1]
        expect(difference).toBeLessThanOrEqual(1)
      }
    })

    test('dashboard cards should have proper ARIA labels', async ({ page }) => {
      await page.goto('/dashboard')

      const cards = page.locator('[data-testid="dashboard-card"]')
      const cardCount = await cards.count()

      for (let i = 0; i < cardCount; i++) {
        const card = cards.nth(i)
        
        // Each card should have an accessible name
        const hasAriaLabel = await card.getAttribute('aria-label')
        const hasAriaLabelledBy = await card.getAttribute('aria-labelledby')
        const hasTitle = await card.locator('h2, h3, h4').first().isVisible()

        expect(hasAriaLabel || hasAriaLabelledBy || hasTitle).toBeTruthy()
      }
    })
  })

  test.describe('Data Tables Accessibility', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('batch table should be accessible', async ({ page }) => {
      await page.goto('/batches')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('data tables should have proper structure', async ({ page }) => {
      await page.goto('/batches')

      const table = page.locator('table')
      await expect(table).toBeVisible()

      // Check table has caption or aria-label
      const hasCaption = await table.locator('caption').isVisible()
      const hasAriaLabel = await table.getAttribute('aria-label')
      expect(hasCaption || hasAriaLabel).toBeTruthy()

      // Check table headers
      const tableHeaders = table.locator('th')
      const headerCount = await tableHeaders.count()
      expect(headerCount).toBeGreaterThan(0)

      // Check each header has proper scope
      for (let i = 0; i < headerCount; i++) {
        const header = tableHeaders.nth(i)
        const hasScope = await header.getAttribute('scope')
        expect(hasScope).toBeTruthy()
      }

      // Check table rows have proper structure
      const tableRows = table.locator('tbody tr')
      const rowCount = await tableRows.count()

      if (rowCount > 0) {
        const firstRow = tableRows.first()
        const cells = firstRow.locator('td')
        const cellCount = await cells.count()
        expect(cellCount).toBeGreaterThan(0)
      }
    })

    test('table sorting should be accessible', async ({ page }) => {
      await page.goto('/batches')

      const sortableHeaders = page.locator('th[role="columnheader"]')
      const sortableCount = await sortableHeaders.count()

      for (let i = 0; i < Math.min(sortableCount, 3); i++) {
        const header = sortableHeaders.nth(i)
        
        // Check aria-sort attribute
        const ariaSortBefore = await header.getAttribute('aria-sort')
        expect(['ascending', 'descending', 'none', null]).toContain(ariaSortBefore)

        // Click to sort
        await header.click()

        // Check aria-sort changed
        const ariaSortAfter = await header.getAttribute('aria-sort')
        expect(['ascending', 'descending']).toContain(ariaSortAfter)
      }
    })
  })

  test.describe('Forms Accessibility', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('add batch form should be accessible', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('form inputs should have proper labels and descriptions', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      const formInputs = page.locator('input, select, textarea')
      const inputCount = await formInputs.count()

      for (let i = 0; i < inputCount; i++) {
        const input = formInputs.nth(i)
        const inputType = await input.getAttribute('type')
        
        if (inputType !== 'hidden') {
          // Check for label association
          const inputId = await input.getAttribute('id')
          const inputName = await input.getAttribute('name')
          
          if (inputId) {
            const associatedLabel = page.locator(`label[for="${inputId}"]`)
            await expect(associatedLabel).toBeVisible()
          } else if (inputName) {
            // Check for aria-label or aria-labelledby
            const ariaLabel = await input.getAttribute('aria-label')
            const ariaLabelledBy = await input.getAttribute('aria-labelledby')
            expect(ariaLabel || ariaLabelledBy).toBeTruthy()
          }

          // Check for required attribute indication
          const isRequired = await input.getAttribute('required')
          if (isRequired !== null) {
            const ariaRequired = await input.getAttribute('aria-required')
            expect(ariaRequired).toBe('true')
          }
        }
      }
    })

    test('form validation errors should be accessible', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      // Submit form with errors
      await page.click('button[type="submit"]')

      // Check error messages are announced
      const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [aria-live="assertive"]')
      const errorCount = await errorMessages.count()
      expect(errorCount).toBeGreaterThan(0)

      // Check errors are associated with inputs
      const invalidInputs = page.locator('input[aria-invalid="true"], select[aria-invalid="true"]')
      const invalidCount = await invalidInputs.count()
      expect(invalidCount).toBeGreaterThan(0)
    })
  })

  test.describe('Modal Dialogs Accessibility', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('modal dialogs should be accessible', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      // Check modal accessibility
      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      // Check modal has proper ARIA attributes
      await expect(modal).toHaveAttribute('aria-modal', 'true')
      
      const ariaLabelledBy = await modal.getAttribute('aria-labelledby')
      const ariaLabel = await modal.getAttribute('aria-label')
      expect(ariaLabelledBy || ariaLabel).toBeTruthy()

      // Check focus management
      const focusedElement = page.locator(':focus')
      const isInsideModal = await focusedElement.evaluate((el, modal) => {
        return modal.contains(el)
      }, await modal.elementHandle())
      expect(isInsideModal).toBe(true)
    })

    test('modal focus trap should work correctly', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      // Get all focusable elements in modal
      const focusableElements = modal.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const focusableCount = await focusableElements.count()

      if (focusableCount > 1) {
        // Test tab cycling
        for (let i = 0; i < focusableCount + 1; i++) {
          await page.keyboard.press('Tab')
          const currentFocus = page.locator(':focus')
          
          // Focus should stay within modal
          const isInsideModal = await currentFocus.evaluate((el, modal) => {
            return modal.contains(el)
          }, await modal.elementHandle())
          expect(isInsideModal).toBe(true)
        }

        // Test reverse tab cycling
        for (let i = 0; i < focusableCount + 1; i++) {
          await page.keyboard.press('Shift+Tab')
          const currentFocus = page.locator(':focus')
          
          // Focus should stay within modal
          const isInsideModal = await currentFocus.evaluate((el, modal) => {
            return modal.contains(el)
          }, await modal.elementHandle())
          expect(isInsideModal).toBe(true)
        }
      }
    })

    test('modal should close with Escape key', async ({ page }) => {
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')

      const modal = page.locator('[role="dialog"]')
      await expect(modal).toBeVisible()

      // Press Escape to close
      await page.keyboard.press('Escape')
      await expect(modal).not.toBeVisible()

      // Focus should return to trigger element
      const addButton = page.locator('button:has-text("Add Batch")')
      await expect(addButton).toBeFocused()
    })
  })

  test.describe('Color Contrast and Visual Accessibility', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should meet color contrast requirements', async ({ page }) => {
      await page.goto('/dashboard')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include('color-contrast')
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('should be usable with high contrast mode', async ({ page }) => {
      // Enable high contrast simulation
      await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
      await page.goto('/dashboard')

      // Check that content is still visible and functional
      await expect(page.locator('h1')).toBeVisible()
      await expect(page.locator('nav')).toBeVisible()

      // Test navigation still works
      await page.click('nav a:first-child')
      await expect(page).toHaveURL(/\//)
    })

    test('should support reduced motion preferences', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' })
      await page.goto('/dashboard')

      // Check that animations are reduced or disabled
      const animatedElements = page.locator('[class*="animate"], [class*="transition"]')
      const animatedCount = await animatedElements.count()

      for (let i = 0; i < Math.min(animatedCount, 5); i++) {
        const element = animatedElements.nth(i)
        const computedStyle = await element.evaluate(el => {
          const style = window.getComputedStyle(el)
          return {
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration
          }
        })

        // Animations should be disabled or very short
        expect(
          computedStyle.animationDuration === '0s' || 
          computedStyle.transitionDuration === '0s' ||
          computedStyle.animationDuration === '0.01s' ||
          computedStyle.transitionDuration === '0.01s'
        ).toBe(true)
      }
    })
  })

  test.describe('Screen Reader Compatibility', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('should have proper landmarks', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for main landmarks
      await expect(page.locator('main, [role="main"]')).toBeVisible()
      await expect(page.locator('nav, [role="navigation"]')).toBeVisible()
      await expect(page.locator('header, [role="banner"]')).toBeVisible()

      // Check for complementary content if present
      const complementary = page.locator('aside, [role="complementary"]')
      if (await complementary.count() > 0) {
        await expect(complementary.first()).toBeVisible()
      }
    })

    test('should announce dynamic content changes', async ({ page }) => {
      await page.goto('/batches')

      // Test search results announcement
      await page.fill('input[placeholder*="Search"]', 'UX')
      await page.press('input[placeholder*="Search"]', 'Enter')

      // Check for live region updates
      const liveRegions = page.locator('[aria-live], [role="status"], [role="alert"]')
      const liveCount = await liveRegions.count()
      
      if (liveCount > 0) {
        // Check that live regions have content
        const hasContent = await liveRegions.first().textContent()
        expect(hasContent).toBeTruthy()
      }
    })

    test('should have proper skip links', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for skip to main content link
      await page.keyboard.press('Tab')
      const skipLink = page.locator('a:has-text("Skip to main content"), a[href="#main-content"]')
      
      if (await skipLink.count() > 0) {
        await expect(skipLink.first()).toBeFocused()
        
        // Test skip link functionality
        await skipLink.first().click()
        const mainContent = page.locator('#main-content, main')
        await expect(mainContent).toBeFocused()
      }
    })
  })

  test.describe('Responsive Accessibility', () => {
    test.use({ 
      storageState: 'tests/e2e/.auth/admin.json',
      viewport: { width: 375, height: 667 } // Mobile viewport
    })

    test('mobile view should be accessible', async ({ page }) => {
      await page.goto('/dashboard')

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()

      expect(accessibilityScanResults.violations).toEqual([])
    })

    test('mobile navigation should be accessible', async ({ page }) => {
      await page.goto('/dashboard')

      // Check for mobile menu button
      const mobileMenuButton = page.locator('button[aria-label*="menu"], button[aria-expanded]')
      if (await mobileMenuButton.count() > 0) {
        // Check button has proper ARIA attributes
        await expect(mobileMenuButton.first()).toHaveAttribute('aria-expanded')
        
        // Test menu toggle
        await mobileMenuButton.first().click()
        const expandedState = await mobileMenuButton.first().getAttribute('aria-expanded')
        expect(expandedState).toBe('true')

        // Check navigation is visible and accessible
        const navigation = page.locator('nav')
        await expect(navigation).toBeVisible()
      }
    })

    test('touch targets should meet minimum size requirements', async ({ page }) => {
      await page.goto('/dashboard')

      // Get all interactive elements
      const interactiveElements = page.locator(
        'button, a, input, select, textarea, [role="button"], [role="link"], [tabindex]:not([tabindex="-1"])'
      )
      const elementCount = await interactiveElements.count()

      for (let i = 0; i < Math.min(elementCount, 10); i++) {
        const element = interactiveElements.nth(i)
        const boundingBox = await element.boundingBox()
        
        if (boundingBox) {
          // WCAG AA requires 44x44 CSS pixels for touch targets
          expect(boundingBox.width).toBeGreaterThanOrEqual(44)
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
        }
      }
    })
  })
})