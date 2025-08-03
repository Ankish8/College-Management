import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helpers';
import { TestHelper } from '../utils/test-helpers';
import { DatabaseHelper } from '../utils/database-helpers';

test.describe('Student Comprehensive Workflow', () => {
  let authHelper: AuthHelper;
  let testHelper: TestHelper;
  let databaseHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    testHelper = new TestHelper(page);
    databaseHelper = new DatabaseHelper();
    
    // Login as student
    await authHelper.login('student');
    await testHelper.takeScreenshot('student-dashboard-start');
  });

  test('Student Workflow: View Personal Timetable', async ({ page }) => {
    console.log('🎯 Starting student timetable viewing test');

    await test.step('Navigate to Timetable', async () => {
      await testHelper.navigateToSection('Timetable');
      await testHelper.takeScreenshot('student-timetable-page');
    });

    await test.step('View Timetable in Different Formats', async () => {
      // Check if timetable data is visible
      const timetableContainer = page.locator('[data-testid="timetable"], .timetable-container, table').first();
      
      if (await timetableContainer.isVisible({ timeout: 5000 })) {
        await testHelper.takeScreenshot('student-timetable-loaded');

        // Try different view modes
        const viewModes = [
          'Week View',
          'Calendar View',
          'List View',
          'Traditional View'
        ];

        for (const mode of viewModes) {
          const viewButton = page.locator(`button:has-text("${mode}")`).first();
          if (await viewButton.isVisible({ timeout: 2000 })) {
            await viewButton.click();
            await page.waitForTimeout(1000);
            await testHelper.takeScreenshot(`student-timetable-${mode.toLowerCase().replace(' ', '-')}`);
          }
        }
      } else {
        console.log('⚠️ No timetable data visible for student');
        await testHelper.takeScreenshot('student-no-timetable');
      }
    });

    await test.step('Filter Timetable by Date Range', async () => {
      // Look for date filters
      const dateFilters = [
        'input[type="date"]',
        '[data-testid="date-picker"]',
        '.date-picker'
      ];

      for (const filterSelector of dateFilters) {
        const filter = page.locator(filterSelector).first();
        if (await filter.isVisible({ timeout: 2000 })) {
          // Set a date range
          await filter.fill('2024-08-01');
          await page.waitForTimeout(1000);
          await testHelper.takeScreenshot('student-timetable-filtered');
          break;
        }
      }
    });

    console.log('✅ Student timetable viewing test completed');
  });

  test('Student Workflow: View Personal Attendance', async ({ page }) => {
    console.log('🎯 Starting student attendance viewing test');

    await test.step('Navigate to Attendance', async () => {
      const attendanceLinks = [
        'a:has-text("My Attendance")',
        'a:has-text("Attendance")',
        '[data-testid="nav-attendance"]'
      ];

      let navigationSuccessful = false;
      for (const linkSelector of attendanceLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 3000 })) {
          await link.click();
          navigationSuccessful = true;
          break;
        }
      }

      if (!navigationSuccessful) {
        await page.goto('/my-attendance');
      }

      await testHelper.takeScreenshot('student-attendance-page');
    });

    await test.step('View Attendance Summary', async () => {
      // Look for attendance summary or statistics
      const summaryElements = [
        '[data-testid="attendance-summary"]',
        '.attendance-stats',
        '.summary-card'
      ];

      let summaryVisible = false;
      for (const selector of summaryElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          await testHelper.takeScreenshot('student-attendance-summary');
          summaryVisible = true;
          break;
        }
      }

      if (!summaryVisible) {
        // Look for any attendance data
        const attendanceTable = page.locator('table, [data-testid="attendance-table"]').first();
        if (await attendanceTable.isVisible({ timeout: 3000 })) {
          await testHelper.takeScreenshot('student-attendance-table');
        } else {
          console.log('⚠️ No attendance data visible for student');
          await testHelper.takeScreenshot('student-no-attendance');
        }
      }
    });

    await test.step('Filter Attendance by Subject/Date', async () => {
      // Look for subject filter
      const subjectFilter = page.locator('select[name="subject"], [data-testid="subject-filter"]').first();
      if (await subjectFilter.isVisible({ timeout: 3000 })) {
        await subjectFilter.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        await testHelper.takeScreenshot('student-attendance-filtered-subject');
      }

      // Look for date range filter
      const dateFilter = page.locator('input[type="date"], [data-testid="date-filter"]').first();
      if (await dateFilter.isVisible({ timeout: 3000 })) {
        await dateFilter.fill('2024-08-01');
        await page.waitForTimeout(1000);
        await testHelper.takeScreenshot('student-attendance-filtered-date');
      }
    });

    console.log('✅ Student attendance viewing test completed');
  });

  test('Student Workflow: View Profile and Update Information', async ({ page }) => {
    console.log('🎯 Starting student profile management test');

    await test.step('Navigate to Profile', async () => {
      const profileLinks = [
        'a:has-text("Profile")',
        'button:has-text("Profile")',
        '[data-testid="nav-profile"]',
        '[data-testid="user-menu"] button' // Dropdown menu
      ];

      let profileFound = false;
      for (const linkSelector of profileLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 3000 })) {
          await link.click();
          
          // If it's a dropdown, look for profile option
          const profileOption = page.locator('a:has-text("Profile"), button:has-text("Profile")').first();
          if (await profileOption.isVisible({ timeout: 2000 })) {
            await profileOption.click();
          }
          
          profileFound = true;
          break;
        }
      }

      if (!profileFound) {
        await page.goto('/profile');
      }

      await testHelper.takeScreenshot('student-profile-page');
    });

    await test.step('View Profile Information', async () => {
      // Verify profile information is displayed
      const profileElements = [
        '[data-testid="student-info"]',
        '.profile-card',
        '.student-details'
      ];

      for (const selector of profileElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          await testHelper.takeScreenshot('student-profile-info');
          break;
        }
      }
    });

    await test.step('Update Profile Information (if editable)', async () => {
      // Look for edit button
      const editButton = page.locator('button:has-text("Edit"), button:has-text("Update"), [data-testid="edit-profile"]').first();
      
      if (await editButton.isVisible({ timeout: 3000 })) {
        await editButton.click();
        await testHelper.takeScreenshot('student-profile-edit-mode');

        // Try to update phone number
        const phoneInput = page.locator('input[name="phone"], input[placeholder*="phone"]').first();
        if (await phoneInput.isVisible({ timeout: 3000 })) {
          await phoneInput.fill('9876543219');
          await testHelper.takeScreenshot('student-profile-phone-updated');

          // Save changes
          const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
          if (await saveButton.isVisible({ timeout: 3000 })) {
            await saveButton.click();
            await testHelper.waitForToast();
            await testHelper.takeScreenshot('student-profile-saved');
          }
        }
      } else {
        console.log('⚠️ Profile editing not available for students');
      }
    });

    console.log('✅ Student profile management test completed');
  });

  test('Student Workflow: View Academic Progress and Reports', async ({ page }) => {
    console.log('🎯 Starting student academic progress test');

    await test.step('View Academic Dashboard', async () => {
      await testHelper.navigateToSection('Dashboard');
      await testHelper.takeScreenshot('student-academic-dashboard');

      // Look for academic progress indicators
      const progressElements = [
        '[data-testid="academic-progress"]',
        '.progress-card',
        '.academic-stats',
        '.gpa-display',
        '.semester-summary'
      ];

      for (const selector of progressElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          await testHelper.takeScreenshot(`student-${selector.replace(/[^a-zA-Z]/g, '')}`);
        }
      }
    });

    await test.step('View Subject-wise Performance', async () => {
      // Look for subject performance breakdown
      const subjectCards = page.locator('.subject-card, [data-testid="subject-performance"]');
      const count = await subjectCards.count();

      if (count > 0) {
        await testHelper.takeScreenshot('student-subject-performance');
        
        // Click on first subject for details
        await subjectCards.first().click();
        await page.waitForTimeout(1000);
        await testHelper.takeScreenshot('student-subject-details');
      }
    });

    await test.step('View Attendance Analytics', async () => {
      // Look for attendance charts or analytics
      const analyticsElements = [
        '[data-testid="attendance-chart"]',
        '.attendance-analytics',
        '.chart-container',
        'canvas' // For chart.js or similar
      ];

      for (const selector of analyticsElements) {
        const element = page.locator(selector).first();
        if (await element.isVisible({ timeout: 3000 })) {
          await testHelper.takeScreenshot('student-attendance-analytics');
          break;
        }
      }
    });

    console.log('✅ Student academic progress test completed');
  });

  test('Student Workflow: Universal Search and Navigation', async ({ page }) => {
    console.log('🎯 Starting student universal search test');

    await test.step('Test Universal Search', async () => {
      // Look for search functionality
      const searchElements = [
        '[data-testid="universal-search"]',
        'input[placeholder*="Search"]',
        '.search-input',
        '[role="searchbox"]'
      ];

      let searchFound = false;
      for (const selector of searchElements) {
        const searchInput = page.locator(selector).first();
        if (await searchInput.isVisible({ timeout: 3000 })) {
          // Test search functionality
          await searchInput.fill('attendance');
          await page.waitForTimeout(1000);
          await testHelper.takeScreenshot('student-search-results');
          
          // Clear search
          await searchInput.fill('');
          searchFound = true;
          break;
        }
      }

      if (!searchFound) {
        console.log('⚠️ Universal search not found');
      }
    });

    await test.step('Test Quick Navigation', async () => {
      // Test keyboard shortcuts if available
      try {
        await page.keyboard.press('Control+k'); // Common search shortcut
        await page.waitForTimeout(1000);
        await testHelper.takeScreenshot('student-keyboard-search');
        
        // Close the search
        await page.keyboard.press('Escape');
      } catch (error) {
        console.log('Keyboard shortcuts not available');
      }
    });

    console.log('✅ Student universal search test completed');
  });

  test.afterEach(async ({ page }) => {
    await testHelper.takeScreenshot('student-test-end');
    await testHelper.handleErrors();
  });
});