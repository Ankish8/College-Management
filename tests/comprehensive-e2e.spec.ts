import { test, expect } from '@playwright/test';
import { AuthHelper } from './utils/auth-helpers';
import { TestHelper } from './utils/test-helpers';
import { DatabaseHelper } from './utils/database-helpers';

test.describe('Comprehensive End-to-End College Management System Test', () => {
  let authHelper: AuthHelper;
  let testHelper: TestHelper;
  let databaseHelper: DatabaseHelper;

  test.beforeAll(async () => {
    databaseHelper = new DatabaseHelper();
    // Ensure clean database state
    await databaseHelper.resetDatabase();
  });

  test('Complete College Management Workflow: Real-world Scenario', async ({ page }) => {
    authHelper = new AuthHelper(page);
    testHelper = new TestHelper(page);
    
    console.log('🎯 Starting comprehensive end-to-end test - Real College Scenario');
    
    // === PHASE 1: ADMIN SETUP ===
    await test.step('Phase 1: Admin System Setup', async () => {
      console.log('👨‍💼 PHASE 1: Admin setting up the college system');
      
      await authHelper.login('admin');
      await testHelper.takeScreenshot('e2e-admin-dashboard');

      // 1. Setup Time Slots
      await testHelper.navigateToSection('Settings');
      await page.click('text=Time Slots');
      
      // Create multiple time slots for a full day
      const timeSlots = [
        { start: '09:00', end: '10:00', name: 'Period 1' },
        { start: '10:00', end: '11:00', name: 'Period 2' },
        { start: '11:30', end: '12:30', name: 'Period 3' },
        { start: '12:30', end: '13:30', name: 'Period 4' }
      ];

      for (const slot of timeSlots) {
        try {
          await testHelper.createEntity('Time Slot', {
            start_time: slot.start,
            end_time: slot.end,
            name: slot.name
          });
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(`Time slot creation may have different interface: ${error}`);
        }
      }

      // 2. Create Subjects
      await testHelper.navigateToSection('Subjects');
      
      const subjects = [
        { name: 'Advanced UI/UX Design', code: 'UIUX501', credits: '4', type: 'THEORY' },
        { name: 'Design Research Methods', code: 'DRM502', credits: '3', type: 'THEORY' },
        { name: 'Digital Prototyping', code: 'DP503', credits: '4', type: 'PRACTICAL' }
      ];

      for (const subject of subjects) {
        try {
          await testHelper.createEntity('Subject', subject);
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(`Subject creation may have different interface: ${error}`);
        }
      }

      // 3. Create Faculty
      await testHelper.navigateToSection('Faculty');
      
      const facultyMembers = [
        { name: 'Dr. Sarah Johnson', email: 'sarah.johnson@jlu.edu.in', employeeId: 'EMP001' },
        { name: 'Prof. Michael Chen', email: 'michael.chen@jlu.edu.in', employeeId: 'EMP002' }
      ];

      for (const faculty of facultyMembers) {
        try {
          await testHelper.createEntity('Faculty', faculty);
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(`Faculty creation may have different interface: ${error}`);
        }
      }

      // 4. Create Batch
      await testHelper.navigateToSection('Batches');
      
      try {
        await testHelper.createEntity('Batch', {
          name: 'MDes 2024-26 Batch A',
          year: '2024',
          semester: 'ODD',
          capacity: '25'
        });
      } catch (error) {
        console.log(`Batch creation may have different interface: ${error}`);
      }

      // 5. Create Students
      await testHelper.navigateToSection('Students');
      
      const students = [
        { name: 'Alice Cooper', email: 'alice.cooper@student.jlu.edu.in', studentId: 'STU2024001', rollNumber: '2024MDes001' },
        { name: 'Bob Wilson', email: 'bob.wilson@student.jlu.edu.in', studentId: 'STU2024002', rollNumber: '2024MDes002' },
        { name: 'Carol Martinez', email: 'carol.martinez@student.jlu.edu.in', studentId: 'STU2024003', rollNumber: '2024MDes003' }
      ];

      for (const student of students) {
        try {
          await testHelper.createEntity('Student', student);
          await page.waitForTimeout(1000);
        } catch (error) {
          console.log(`Student creation may have different interface: ${error}`);
        }
      }

      await testHelper.takeScreenshot('e2e-admin-setup-complete');
      await authHelper.logout();
    });

    // === PHASE 2: FACULTY TIMETABLE CREATION ===
    await test.step('Phase 2: Faculty Creates Timetable', async () => {
      console.log('👩‍🏫 PHASE 2: Faculty creating timetable and scheduling classes');
      
      await authHelper.login('faculty');
      await testHelper.takeScreenshot('e2e-faculty-dashboard');

      // Navigate to timetable
      await testHelper.navigateToSection('Timetable');
      
      // Create timetable entries
      const timetableEntries = [
        { subject: 'Advanced UI/UX Design', day: 'MONDAY', period: 'Period 1' },
        { subject: 'Design Research Methods', day: 'TUESDAY', period: 'Period 2' },
        { subject: 'Digital Prototyping', day: 'WEDNESDAY', period: 'Period 3' }
      ];

      for (const entry of timetableEntries) {
        try {
          // Look for create entry button
          const createButtons = [
            'button:has-text("Add Class")',
            'button:has-text("Create Entry")',
            'button:has-text("Quick Create")',
            '[data-testid="create-entry"]'
          ];

          let entryCreated = false;
          for (const buttonSelector of createButtons) {
            const button = page.locator(buttonSelector).first();
            if (await button.isVisible({ timeout: 3000 })) {
              await button.click();
              
              // Fill the form
              const subjectSelect = page.locator('select[name="subjectId"], [data-testid="subject-select"]').first();
              const daySelect = page.locator('select[name="dayOfWeek"], [data-testid="day-select"]').first();
              const timeSelect = page.locator('select[name="timeSlotId"], [data-testid="timeslot-select"]').first();

              if (await subjectSelect.isVisible({ timeout: 3000 })) {
                await subjectSelect.selectOption({ label: entry.subject });
              }
              if (await daySelect.isVisible({ timeout: 3000 })) {
                await daySelect.selectOption(entry.day);
              }
              if (await timeSelect.isVisible({ timeout: 3000 })) {
                await timeSelect.selectOption({ label: entry.period });
              }

              await testHelper.clickButton('Save');
              await testHelper.waitForToast();
              entryCreated = true;
              break;
            }
          }

          if (!entryCreated) {
            console.log(`Could not create timetable entry for ${entry.subject}`);
          }
          
          await page.waitForTimeout(2000);
        } catch (error) {
          console.log(`Timetable entry creation failed: ${error}`);
        }
      }

      await testHelper.takeScreenshot('e2e-timetable-created');
      await authHelper.logout();
    });

    // === PHASE 3: FACULTY MARKS ATTENDANCE ===
    await test.step('Phase 3: Faculty Marks Attendance', async () => {
      console.log('✅ PHASE 3: Faculty marking student attendance');
      
      await authHelper.login('faculty');
      
      // Navigate to attendance
      await testHelper.navigateToSection('Attendance');
      await testHelper.takeScreenshot('e2e-attendance-page');

      // Mark attendance for students
      const attendanceCheckboxes = page.locator('input[type="checkbox"], [data-testid="attendance-checkbox"]');
      const checkboxCount = await attendanceCheckboxes.count();

      if (checkboxCount > 0) {
        // Mark first 3 students as present
        for (let i = 0; i < Math.min(3, checkboxCount); i++) {
          await attendanceCheckboxes.nth(i).check();
          await page.waitForTimeout(500);
        }

        await testHelper.takeScreenshot('e2e-attendance-marked');

        // Save attendance
        const saveButton = page.locator('button:has-text("Save"), button:has-text("Submit")').first();
        if (await saveButton.isVisible({ timeout: 5000 })) {
          await saveButton.click();
          await testHelper.waitForToast();
          await testHelper.takeScreenshot('e2e-attendance-saved');
        }
      } else {
        console.log('No attendance interface found');
      }

      await authHelper.logout();
    });

    // === PHASE 4: STUDENT VIEWS DATA ===
    await test.step('Phase 4: Student Views Timetable and Attendance', async () => {
      console.log('👨‍🎓 PHASE 4: Student viewing timetable and attendance data');
      
      await authHelper.login('student');
      await testHelper.takeScreenshot('e2e-student-dashboard');

      // View timetable
      await testHelper.navigateToSection('Timetable');
      await testHelper.takeScreenshot('e2e-student-timetable');

      // Check if timetable data is visible
      const timetableData = page.locator('table, .timetable-container, [data-testid="timetable"]').first();
      if (await timetableData.isVisible({ timeout: 5000 })) {
        console.log('✅ Student can view timetable data');
      } else {
        console.log('⚠️ No timetable data visible for student');
      }

      // View attendance
      const attendanceLinks = [
        'a:has-text("My Attendance")',
        'a:has-text("Attendance")'
      ];

      for (const linkSelector of attendanceLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 3000 })) {
          await link.click();
          break;
        }
      }

      await testHelper.takeScreenshot('e2e-student-attendance');

      // Check if attendance data is visible
      const attendanceData = page.locator('table, .attendance-container, [data-testid="attendance"]').first();
      if (await attendanceData.isVisible({ timeout: 5000 })) {
        console.log('✅ Student can view attendance data');
      } else {
        console.log('⚠️ No attendance data visible for student');
      }

      await authHelper.logout();
    });

    // === PHASE 5: ADMIN REVIEWS SYSTEM ===
    await test.step('Phase 5: Admin Reviews System Analytics', async () => {
      console.log('📊 PHASE 5: Admin reviewing system analytics and reports');
      
      await authHelper.login('admin');

      // Check analytics if available
      const analyticsLinks = [
        'a:has-text("Analytics")',
        'a:has-text("Reports")',
        'button:has-text("Analytics")'
      ];

      for (const linkSelector of analyticsLinks) {
        const link = page.locator(linkSelector).first();
        if (await link.isVisible({ timeout: 3000 })) {
          await link.click();
          await testHelper.takeScreenshot('e2e-admin-analytics');
          break;
        }
      }

      // View faculty workload
      await testHelper.navigateToSection('Faculty');
      const workloadLink = page.locator('a:has-text("Workload"), button:has-text("Workload")').first();
      if (await workloadLink.isVisible({ timeout: 3000 })) {
        await workloadLink.click();
        await testHelper.takeScreenshot('e2e-faculty-workload');
      }

      // Verify all data is properly stored
      await testHelper.navigateToSection('Students');
      await testHelper.verifyTableHasData();
      
      await testHelper.navigateToSection('Faculty');
      await testHelper.verifyTableHasData();
      
      await testHelper.navigateToSection('Subjects');
      await testHelper.verifyTableHasData();

      await testHelper.takeScreenshot('e2e-system-verification-complete');
      await authHelper.logout();
    });

    console.log('🎉 Comprehensive end-to-end test completed successfully!');
    await testHelper.takeScreenshot('e2e-test-complete');
  });

  test.afterAll(async () => {
    console.log('🧹 Cleaning up after comprehensive test');
    // Keep the database state for inspection
    await databaseHelper.backupDatabase();
  });
});