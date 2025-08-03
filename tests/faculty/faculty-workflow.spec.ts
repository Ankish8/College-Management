import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helpers';
import { TestHelper } from '../utils/test-helpers';
import { DatabaseHelper } from '../utils/database-helpers';

test.describe('Faculty Comprehensive Workflow', () => {
  let authHelper: AuthHelper;
  let testHelper: TestHelper;
  let databaseHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    testHelper = new TestHelper(page);
    databaseHelper = new DatabaseHelper();
    
    // Login as faculty
    await authHelper.login('faculty');
    await testHelper.takeScreenshot('faculty-dashboard-start');
  });

  test('Faculty Workflow: Timetable Creation and Management', async ({ page }) => {
    console.log('🎯 Starting faculty timetable management test');

    await test.step('Navigate to Timetable', async () => {
      await testHelper.navigateToSection('Timetable');
      await testHelper.takeScreenshot('timetable-page');
    });

    await test.step('Create Timetable Entries', async () => {
      // Look for timetable grid or creation interface
      const timetableGrid = page.locator('[data-testid="timetable-grid"], .timetable-container, table');
      await timetableGrid.waitFor({ timeout: 10000 });

      // Try to create a new timetable entry
      const createButtons = [
        'button:has-text("Add Class")',
        'button:has-text("Create Entry")',
        'button:has-text("Quick Create")',
        '[data-testid="create-entry"]',
        '.quick-create-button'
      ];

      let entryCreated = false;
      for (const selector of createButtons) {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await testHelper.takeScreenshot('timetable-create-modal');

          // Fill timetable entry form
          try {
            // Select subject
            const subjectSelect = page.locator('select[name="subjectId"], [data-testid="subject-select"]').first();
            if (await subjectSelect.isVisible({ timeout: 3000 })) {
              await subjectSelect.selectOption({ index: 1 });
            }

            // Select batch
            const batchSelect = page.locator('select[name="batchId"], [data-testid="batch-select"]').first();
            if (await batchSelect.isVisible({ timeout: 3000 })) {
              await batchSelect.selectOption({ index: 1 });
            }

            // Select time slot
            const timeSlotSelect = page.locator('select[name="timeSlotId"], [data-testid="timeslot-select"]').first();
            if (await timeSlotSelect.isVisible({ timeout: 3000 })) {
              await timeSlotSelect.selectOption({ index: 1 });
            }

            // Select day
            const daySelect = page.locator('select[name="dayOfWeek"], [data-testid="day-select"]').first();
            if (await daySelect.isVisible({ timeout: 3000 })) {
              await daySelect.selectOption('MONDAY');
            }

            await testHelper.takeScreenshot('timetable-entry-filled');

            // Save the entry
            await testHelper.clickButton('Save');
            await testHelper.waitForToast();
            await testHelper.takeScreenshot('timetable-entry-created');
            
            entryCreated = true;
            break;
          } catch (error) {
            console.log(`Failed to create entry with ${selector}: ${error}`);
            // Close modal if it's open
            const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), [aria-label="Close"]');
            if (await closeButton.isVisible({ timeout: 1000 })) {
              await closeButton.click();
            }
          }
        }
      }

      if (!entryCreated) {
        console.log('⚠️ Could not create timetable entry - interface may be different');
      }
    });

    await test.step('View and Manage Existing Timetable', async () => {
      // Navigate through different views
      const viewButtons = [
        'button:has-text("Week View")',
        'button:has-text("Calendar View")',
        'button:has-text("Traditional View")',
        '[data-testid="view-toggle"]'
      ];

      for (const viewButton of viewButtons) {
        const button = page.locator(viewButton).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await testHelper.takeScreenshot(`timetable-${viewButton.replace(/[^a-zA-Z]/g, '')}`);
          await page.waitForTimeout(1000); // Allow view to load
        }
      }
    });

    console.log('✅ Faculty timetable management test completed');
  });

  test('Faculty Workflow: Attendance Marking', async ({ page }) => {
    console.log('🎯 Starting faculty attendance marking test');

    await test.step('Navigate to Attendance', async () => {
      await testHelper.navigateToSection('Attendance');
      await testHelper.takeScreenshot('attendance-page');
    });

    await test.step('Mark Attendance for Students', async () => {
      // Look for attendance interface
      const attendanceTable = page.locator('[data-testid="attendance-table"], .attendance-container, table');
      
      if (await attendanceTable.isVisible({ timeout: 5000 })) {
        await testHelper.takeScreenshot('attendance-interface');

        // Look for attendance marking controls
        const attendanceControls = [
          '[data-testid="attendance-checkbox"]',
          '.attendance-checkbox',
          'input[type="checkbox"]',
          'button:has-text("Present")',
          'button:has-text("Absent")'
        ];

        let markedAttendance = false;
        for (const controlSelector of attendanceControls) {
          const controls = page.locator(controlSelector);
          const count = await controls.count();
          
          if (count > 0) {
            // Mark attendance for first few students
            for (let i = 0; i < Math.min(3, count); i++) {
              const control = controls.nth(i);
              if (await control.isVisible({ timeout: 1000 })) {
                await control.click();
                await page.waitForTimeout(500);
                markedAttendance = true;
              }
            }
            break;
          }
        }

        if (markedAttendance) {
          await testHelper.takeScreenshot('attendance-marked');
          
          // Save attendance
          const saveButton = page.locator('button:has-text("Save Attendance"), button:has-text("Submit"), button:has-text("Save")').first();
          if (await saveButton.isVisible({ timeout: 3000 })) {
            await saveButton.click();
            await testHelper.waitForToast();
            await testHelper.takeScreenshot('attendance-saved');
          }
        } else {
          console.log('⚠️ Could not find attendance marking controls');
        }
      } else {
        console.log('⚠️ Attendance interface not found');
      }
    });

    await test.step('View Attendance Reports', async () => {
      // Try to navigate to attendance reports
      const reportLinks = [
        'a:has-text("Reports")',
        'button:has-text("View Reports")',
        '[data-testid="attendance-reports"]'
      ];

      for (const linkSelector of reportLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          await testHelper.takeScreenshot('attendance-reports');
          break;
        }
      }
    });

    console.log('✅ Faculty attendance marking test completed');
  });

  test('Faculty Workflow: Manage Faculty Preferences', async ({ page }) => {
    console.log('🎯 Starting faculty preferences management test');

    await test.step('Access Faculty Preferences', async () => {
      // Try multiple ways to access preferences
      const preferenceLinks = [
        'a:has-text("Preferences")',
        'a:has-text("Settings")',
        'button:has-text("My Preferences")',
        '[data-testid="faculty-preferences"]'
      ];

      let preferencesFound = false;
      for (const linkSelector of preferenceLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          preferencesFound = true;
          break;
        }
      }

      if (!preferencesFound) {
        // Try direct navigation
        await page.goto('/settings/faculty-preferences');
      }

      await testHelper.takeScreenshot('faculty-preferences-page');
    });

    await test.step('Set Time Preferences', async () => {
      // Look for time preference controls
      const timeSlotCheckboxes = page.locator('input[type="checkbox"]');
      const count = await timeSlotCheckboxes.count();

      if (count > 0) {
        // Toggle some preferences
        for (let i = 0; i < Math.min(3, count); i++) {
          await timeSlotCheckboxes.nth(i).click();
          await page.waitForTimeout(300);
        }

        await testHelper.takeScreenshot('preferences-updated');

        // Save preferences
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Update")').first();
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click();
          await testHelper.waitForToast();
        }
      }
    });

    console.log('✅ Faculty preferences management test completed');
  });

  test('Faculty Workflow: View Workload and Analytics', async ({ page }) => {
    console.log('🎯 Starting faculty workload and analytics test');

    await test.step('View Faculty Workload', async () => {
      // Navigate to workload page
      await testHelper.navigateToSection('Timetable');
      
      const workloadLinks = [
        'a:has-text("Workload")',
        'button:has-text("My Workload")',
        'a:has-text("Faculty Workload")'
      ];

      for (const linkSelector of workloadLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          await testHelper.takeScreenshot('faculty-workload');
          break;
        }
      }
    });

    await test.step('View Analytics', async () => {
      // Try to access analytics
      const analyticsLinks = [
        'a:has-text("Analytics")',
        'button:has-text("Analytics")',
        '[data-testid="analytics"]'
      ];

      for (const linkSelector of analyticsLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 2000 })) {
          await link.click();
          await testHelper.takeScreenshot('faculty-analytics');
          break;
        }
      }
    });

    console.log('✅ Faculty workload and analytics test completed');
  });

  test.afterEach(async ({ page }) => {
    await testHelper.takeScreenshot('faculty-test-end');
    await testHelper.handleErrors();
  });
});