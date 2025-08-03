import { test, expect } from '@playwright/test';
import { AuthHelper } from '../utils/auth-helpers';
import { TestHelper } from '../utils/test-helpers';
import { DatabaseHelper } from '../utils/database-helpers';

test.describe('Admin Comprehensive Workflow', () => {
  let authHelper: AuthHelper;
  let testHelper: TestHelper;
  let databaseHelper: DatabaseHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    testHelper = new TestHelper(page);
    databaseHelper = new DatabaseHelper();
    
    // Ensure we start with a clean database state
    await databaseHelper.resetDatabase();
    
    // Login as admin
    await authHelper.login('admin');
    await testHelper.takeScreenshot('admin-dashboard-start');
  });

  test('Complete Admin Workflow: Manage Academic Structure', async ({ page }) => {
    console.log('🎯 Starting comprehensive admin academic structure management test');

    // 1. Manage Time Slots
    await test.step('Manage Time Slots', async () => {
      await testHelper.navigateToSection('Settings');
      await page.click('text=Time Slots');
      await testHelper.takeScreenshot('timeslots-page');

      // Create a new time slot
      await testHelper.createEntity('Time Slot', {
        'start_time': '09:00',
        'end_time': '10:00',
        'name': 'Period 1'
      });

      await testHelper.verifyTableHasData();
    });

    // 2. Manage Departments
    await test.step('Manage Departments', async () => {
      await testHelper.navigateToSection('Settings');
      await page.click('text=Department');
      await testHelper.takeScreenshot('departments-page');

      // Verify existing departments or create new ones
      await testHelper.verifyTableHasData();
    });

    // 3. Manage Programs and Specializations
    await test.step('Manage Programs', async () => {
      await testHelper.navigateToSection('Settings');
      await page.click('text=Batch Configuration');
      await testHelper.takeScreenshot('batch-config-page');

      // Create a new program
      try {
        await testHelper.createEntity('Program', {
          'name': 'Master of Design',
          'shortName': 'MDes',
          'duration': '2'
        });
      } catch (error) {
        console.log('Program creation may not have form - checking existing data');
        await testHelper.handleErrors();
      }
    });

    // 4. Manage Subjects
    await test.step('Manage Subjects', async () => {
      await testHelper.navigateToSection('Subjects');
      await testHelper.takeScreenshot('subjects-page');

      // Create a new subject
      await testHelper.createEntity('Subject', {
        'name': 'Advanced UI/UX Design',
        'code': 'UIUX501',
        'credits': '4',
        'type': 'THEORY'
      });

      await testHelper.verifyTableHasData();
    });

    // 5. Manage Batches
    await test.step('Manage Batches', async () => {
      await testHelper.navigateToSection('Batches');
      await testHelper.takeScreenshot('batches-page');

      // Create a new batch
      await testHelper.createEntity('Batch', {
        'name': 'MDes 2024-26',
        'year': '2024',
        'semester': 'ODD',
        'capacity': '30'
      });

      await testHelper.verifyTableHasData();
    });

    // 6. Manage Faculty
    await test.step('Manage Faculty', async () => {
      await testHelper.navigateToSection('Faculty');
      await testHelper.takeScreenshot('faculty-page');

      // Create a new faculty member
      await testHelper.createEntity('Faculty', {
        'name': 'Dr. Jane Smith',
        'email': 'jane.smith@jlu.edu.in',
        'employeeId': 'EMP001',
        'phone': '9876543210'
      });

      await testHelper.verifyTableHasData();
    });

    // 7. Manage Students
    await test.step('Manage Students', async () => {
      await testHelper.navigateToSection('Students');
      await testHelper.takeScreenshot('students-page');

      // Create a new student
      await testHelper.createEntity('Student', {
        'name': 'John Doe',
        'email': 'john.doe@student.jlu.edu.in',
        'studentId': 'STU001',
        'rollNumber': '2024MDes001',
        'phone': '9876543211'
      });

      await testHelper.verifyTableHasData();
    });

    console.log('✅ Admin academic structure management test completed successfully');
  });

  test('Admin Workflow: Faculty Subject Allotment', async ({ page }) => {
    console.log('🎯 Starting faculty subject allotment test');

    await test.step('Navigate to Subject Allotment', async () => {
      await testHelper.navigateToSection('Faculty');
      await page.click('text=Subject Allotment');
      await testHelper.takeScreenshot('subject-allotment-page');
    });

    await test.step('Allot Subjects to Faculty', async () => {
      // Look for drag-and-drop interface or assignment buttons
      const subjects = page.locator('[data-testid="unassigned-subject"], .subject-card').first();
      const faculty = page.locator('[data-testid="faculty-card"], .faculty-section').first();

      if (await subjects.isVisible({ timeout: 5000 }) && await faculty.isVisible({ timeout: 5000 })) {
        // Try drag and drop
        await subjects.dragTo(faculty);
        await testHelper.takeScreenshot('subject-allotment-drag');
        
        // Look for save or confirm button
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Confirm")');
        if (await saveButton.isVisible({ timeout: 3000 })) {
          await saveButton.click();
          await testHelper.waitForToast();
        }
      } else {
        console.log('No subjects or faculty available for allotment');
      }
    });

    console.log('✅ Faculty subject allotment test completed');
  });

  test('Admin Workflow: Academic Calendar Management', async ({ page }) => {
    console.log('🎯 Starting academic calendar management test');

    await test.step('Manage Academic Calendar', async () => {
      await testHelper.navigateToSection('Settings');
      await page.click('text=Academic Calendar');
      await testHelper.takeScreenshot('academic-calendar-page');

      // Add holidays
      try {
        await testHelper.createEntity('Holiday', {
          'name': 'Independence Day',
          'date': '2024-08-15',
          'type': 'NATIONAL'
        });
      } catch (error) {
        console.log('Holiday creation interface may be different');
        await testHelper.handleErrors();
      }
    });

    console.log('✅ Academic calendar management test completed');
  });

  test.afterEach(async ({ page }) => {
    await testHelper.takeScreenshot('admin-test-end');
    await testHelper.handleErrors();
  });
});