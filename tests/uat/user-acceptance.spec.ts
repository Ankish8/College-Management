import { test, expect } from '@playwright/test'

/**
 * User Acceptance Testing (UAT) Suite
 * 
 * Tests real-world scenarios from different user perspectives:
 * - Admin workflows
 * - Faculty workflows  
 * - Student workflows
 * - Cross-role interactions
 * - Business process validation
 */

test.describe('User Acceptance Testing', () => {

  test.describe('Admin User Acceptance Tests', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Admin can set up a new academic semester', async ({ page }) => {
      // Scenario: Admin needs to set up a new semester with batches, subjects, and faculty assignments
      
      await page.goto('/dashboard')
      await expect(page.locator('h1:has-text("Admin Dashboard")')).toBeVisible()

      // Step 1: Create new academic calendar
      await page.click('nav a:has-text("Settings")')
      await page.click('text=Academic Calendar')
      
      await page.click('button:has-text("Add Semester")')
      await page.fill('input[name="semesterName"]', 'Spring 2025')
      await page.fill('input[name="academicYear"]', '2024-25')
      await page.fill('input[name="semesterStart"]', '2025-01-15')
      await page.fill('input[name="semesterEnd"]', '2025-05-30')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Semester added successfully')).toBeVisible()

      // Step 2: Create new batch for the semester
      await page.goto('/batches')
      await page.click('button:has-text("Add Batch")')
      
      await page.fill('input[name="name"]', 'B.Des UX Semester 6 Spring 2025')
      await page.selectOption('select[name="programId"]', { index: 1 })
      await page.selectOption('select[name="specializationId"]', { index: 1 })
      await page.fill('input[name="semester"]', '6')
      await page.fill('input[name="startYear"]', '2025')
      await page.fill('input[name="endYear"]', '2027')
      await page.fill('input[name="maxCapacity"]', '30')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Batch created successfully')).toBeVisible()

      // Step 3: Add subjects to the batch
      await page.goto('/subjects')
      await page.click('button:has-text("Add Subject")')
      
      await page.fill('input[name="name"]', 'Advanced UX Research')
      await page.fill('input[name="code"]', 'UXR301')
      await page.fill('input[name="credits"]', '4')
      await page.selectOption('select[name="batchId"]', { label: /B\.Des UX Semester 6/ })
      await page.selectOption('select[name="primaryFacultyId"]', { index: 1 })
      await page.selectOption('select[name="examType"]', 'THEORY')
      await page.selectOption('select[name="subjectType"]', 'CORE')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Subject created successfully')).toBeVisible()

      // Step 4: Verify semester setup is complete
      await page.goto('/dashboard')
      
      // Should see new batch in recent activity or dashboard cards
      await expect(page.locator('text=B.Des UX Semester 6')).toBeVisible()
    })

    test('Admin can manage faculty workload and preferences', async ({ page }) => {
      // Scenario: Admin needs to balance faculty workload across subjects
      
      await page.goto('/faculty')
      
      // View faculty list
      await expect(page.locator('h1:has-text("Faculty")')).toBeVisible()
      
      // Click on a faculty member to view workload
      const facultyRow = page.locator('table tbody tr').first()
      await facultyRow.click()
      
      // Should navigate to faculty detail page
      await expect(page.locator('h1')).toContainText('Faculty Details')
      
      // View current workload
      await page.click('tab:has-text("Workload")')
      
      // Check subjects assigned
      const subjectCards = page.locator('[data-testid="subject-card"]')
      const subjectCount = await subjectCards.count()
      
      // Verify workload calculation
      if (subjectCount > 0) {
        await expect(page.locator('text=Total Credits:')).toBeVisible()
        await expect(page.locator('text=Total Hours:')).toBeVisible()
      }
      
      // Set faculty preferences
      await page.click('tab:has-text("Preferences")')
      await page.click('button:has-text("Edit Preferences")')
      
      // Set preferred time slots
      await page.check('input[value="morning"]')
      await page.check('input[value="afternoon"]')
      
      // Set maximum hours
      await page.fill('input[name="maxDailyHours"]', '6')
      await page.fill('input[name="maxWeeklyHours"]', '30')
      
      await page.click('button:has-text("Save Preferences")')
      await expect(page.locator('text=Preferences updated')).toBeVisible()
    })

    test('Admin can generate and analyze reports', async ({ page }) => {
      // Scenario: Admin needs monthly attendance and performance reports
      
      await page.goto('/dashboard')
      
      // Access reports section
      await page.click('nav a:has-text("Reports")') // Assuming reports feature exists
      
      // Generate attendance report
      await page.click('button:has-text("Generate Attendance Report")')
      
      // Select report parameters
      await page.selectOption('select[name="reportType"]', 'monthly')
      await page.selectOption('select[name="batch"]', { index: 1 })
      await page.fill('input[name="fromDate"]', '2024-01-01')
      await page.fill('input[name="toDate"]', '2024-01-31')
      
      await page.click('button:has-text("Generate Report")')
      
      // Verify report generation
      await expect(page.locator('text=Report generated successfully')).toBeVisible()
      
      // Download report
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Download Report")')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toContain('attendance-report')
    })
  })

  test.describe('Faculty User Acceptance Tests', () => {
    test.use({ storageState: 'tests/e2e/.auth/faculty.json' })

    test('Faculty can mark daily attendance efficiently', async ({ page }) => {
      // Scenario: Faculty member needs to mark attendance for multiple classes
      
      await page.goto('/dashboard')
      await expect(page.locator('h1:has-text("Faculty Dashboard")')).toBeVisible()

      // Access attendance marking
      await page.click('nav a:has-text("Attendance")')
      
      // Select today's classes
      await expect(page.locator('h1:has-text("Mark Attendance")')).toBeVisible()
      
      // Should see today's scheduled classes
      const todayClasses = page.locator('[data-testid="class-session"]')
      const classCount = await todayClasses.count()
      
      if (classCount > 0) {
        // Mark attendance for first class
        await todayClasses.first().click()
        
        // Should see student list
        await expect(page.locator('table')).toBeVisible()
        
        // Mark students as present/absent
        const studentRows = page.locator('table tbody tr')
        const studentCount = await studentRows.count()
        
        for (let i = 0; i < Math.min(studentCount, 5); i++) {
          const row = studentRows.nth(i)
          const presentButton = row.locator('button:has-text("Present")')
          await presentButton.click()
        }
        
        // Save attendance
        await page.click('button:has-text("Save Attendance")')
        await expect(page.locator('text=Attendance saved successfully')).toBeVisible()
        
        // Mark as session complete
        await page.click('button:has-text("Complete Session")')
        await expect(page.locator('text=Session completed')).toBeVisible()
      }
    })

    test('Faculty can view and analyze student performance', async ({ page }) => {
      // Scenario: Faculty wants to track student progress in their subjects
      
      await page.goto('/subjects')
      
      // Select a subject they teach
      const subjectCard = page.locator('[data-testid="subject-card"]').first()
      await subjectCard.click()
      
      // Navigate to student performance
      await page.click('tab:has-text("Students")')
      
      // View attendance statistics
      await expect(page.locator('text=Attendance Rate')).toBeVisible()
      
      // Sort students by attendance
      await page.click('th:has-text("Attendance")')
      
      // Identify at-risk students
      const lowAttendanceStudents = page.locator('[data-attendance-rate^="0."], [data-attendance-rate^="1."], [data-attendance-rate^="2."]')
      const atRiskCount = await lowAttendanceStudents.count()
      
      if (atRiskCount > 0) {
        // Click on at-risk student
        await lowAttendanceStudents.first().click()
        
        // View detailed attendance record
        await expect(page.locator('text=Attendance Details')).toBeVisible()
        
        // Add note about student performance
        await page.click('button:has-text("Add Note")')
        await page.fill('textarea[name="note"]', 'Low attendance - requires intervention')
        await page.click('button:has-text("Save Note")')
        
        await expect(page.locator('text=Note added successfully')).toBeVisible()
      }
    })

    test('Faculty can manage their schedule and preferences', async ({ page }) => {
      // Scenario: Faculty member needs to update their availability
      
      await page.goto('/dashboard')
      
      // Access schedule/timetable
      await page.click('nav a:has-text("My Schedule")')
      
      // View current timetable
      await expect(page.locator('h1:has-text("My Timetable")')).toBeVisible()
      
      // Switch to preferences
      await page.click('button:has-text("Preferences")')
      
      // Set blackout periods
      await page.click('button:has-text("Add Blackout Period")')
      await page.fill('input[name="startDate"]', '2024-12-20')
      await page.fill('input[name="endDate"]', '2024-12-30')
      await page.fill('input[name="reason"]', 'Winter vacation')
      await page.click('button:has-text("Save Blackout")')
      
      await expect(page.locator('text=Blackout period added')).toBeVisible()
      
      // Update preferred time slots
      await page.click('button:has-text("Update Time Preferences")')
      
      // Uncheck early morning slots
      await page.uncheck('input[value="08:00-09:00"]')
      
      // Prefer afternoon slots
      await page.check('input[value="14:00-15:00"]')
      await page.check('input[value="15:00-16:00"]')
      
      await page.click('button:has-text("Save Preferences")')
      await expect(page.locator('text=Preferences updated')).toBeVisible()
    })
  })

  test.describe('Student User Acceptance Tests', () => {
    test.use({ storageState: 'tests/e2e/.auth/student.json' })

    test('Student can view their academic progress', async ({ page }) => {
      // Scenario: Student wants to track their attendance and academic progress
      
      await page.goto('/dashboard')
      await expect(page.locator('h1:has-text("Student Dashboard")')).toBeVisible()

      // View overall attendance summary
      await expect(page.locator('text=Overall Attendance')).toBeVisible()
      
      // Navigate to detailed attendance
      await page.click('nav a:has-text("My Attendance")')
      
      // View subject-wise attendance
      await expect(page.locator('h1:has-text("My Attendance")')).toBeVisible()
      
      const subjectCards = page.locator('[data-testid="subject-attendance-card"]')
      const subjectCount = await subjectCards.count()
      
      if (subjectCount > 0) {
        // Click on a subject to see detailed view
        await subjectCards.first().click()
        
        // View attendance calendar/timeline
        await expect(page.locator('text=Attendance Timeline')).toBeVisible()
        
        // Check for attendance warnings
        const warningAlert = page.locator('[role="alert"]:has-text("attendance")')
        if (await warningAlert.isVisible()) {
          // Student sees attendance warning
          await expect(warningAlert).toContainText('below')
        }
      }
    })

    test('Student can view their timetable and upcoming classes', async ({ page }) => {
      // Scenario: Student checks their schedule for the week
      
      await page.goto('/dashboard')
      
      // Navigate to timetable
      await page.click('nav a:has-text("My Timetable")')
      
      // View current week
      await expect(page.locator('h1:has-text("My Timetable")')).toBeVisible()
      
      // Should see weekly view by default
      const weekView = page.locator('[data-testid="week-view"]')
      await expect(weekView).toBeVisible()
      
      // Check today's classes
      const todayColumn = page.locator('[data-day="today"]')
      const todayClasses = todayColumn.locator('[data-testid="class-slot"]')
      const classCount = await todayClasses.count()
      
      if (classCount > 0) {
        // Click on a class to see details
        await todayClasses.first().click()
        
        // Should see class details popup
        await expect(page.locator('[role="dialog"]')).toBeVisible()
        await expect(page.locator('text=Subject:')).toBeVisible()
        await expect(page.locator('text=Faculty:')).toBeVisible()
        await expect(page.locator('text=Time:')).toBeVisible()
        
        // Close popup
        await page.keyboard.press('Escape')
      }
      
      // Switch to monthly view
      await page.click('button:has-text("Month")')
      
      // Should see calendar view
      const monthView = page.locator('[data-testid="month-view"]')
      await expect(monthView).toBeVisible()
    })

    test('Student can raise attendance disputes', async ({ page }) => {
      // Scenario: Student was marked absent but was actually present
      
      await page.goto('/attendance')
      
      // Find a session marked as absent
      const absentSession = page.locator('[data-status="ABSENT"]').first()
      
      if (await absentSession.isVisible()) {
        await absentSession.click()
        
        // Raise dispute
        await page.click('button:has-text("Dispute")')
        
        // Fill dispute form
        await page.selectOption('select[name="requestedStatus"]', 'PRESENT')
        await page.fill('textarea[name="reason"]', 'I was present in class but may have been missed during attendance marking')
        
        // Submit dispute
        await page.click('button:has-text("Submit Dispute")')
        
        await expect(page.locator('text=Dispute submitted successfully')).toBeVisible()
        
        // Check dispute status
        await page.click('nav a:has-text("My Disputes")')
        
        // Should see pending dispute
        await expect(page.locator('text=Pending')).toBeVisible()
        await expect(page.locator('text=I was present in class')).toBeVisible()
      }
    })

    test('Student can view academic calendar and holidays', async ({ page }) => {
      // Scenario: Student wants to see exam dates and holidays
      
      await page.goto('/dashboard')
      
      // Navigate to academic calendar
      await page.click('nav a:has-text("Calendar")')
      
      // View semester calendar
      await expect(page.locator('h1:has-text("Academic Calendar")')).toBeVisible()
      
      // Should see current semester info
      await expect(page.locator('text=Current Semester')).toBeVisible()
      
      // View holidays
      const holidays = page.locator('[data-testid="holiday-item"]')
      const holidayCount = await holidays.count()
      
      if (holidayCount > 0) {
        await expect(holidays.first()).toBeVisible()
      }
      
      // View exam periods
      const examPeriods = page.locator('[data-testid="exam-period"]')
      const examCount = await examPeriods.count()
      
      if (examCount > 0) {
        await expect(examPeriods.first()).toBeVisible()
        
        // Check exam period details
        await examPeriods.first().click()
        await expect(page.locator('text=Exam Period Details')).toBeVisible()
      }
    })
  })

  test.describe('Cross-Role Workflow Tests', () => {
    test('Complete academic workflow: Admin setup → Faculty teaching → Student learning', async ({ browser }) => {
      // Multi-user scenario: Complete academic workflow
      
      // Admin creates new batch and subject
      const adminContext = await browser.newContext({ 
        storageState: 'tests/e2e/.auth/admin.json' 
      })
      const adminPage = await adminContext.newPage()
      
      await adminPage.goto('/batches')
      await adminPage.click('button:has-text("Add Batch")')
      await adminPage.fill('input[name="name"]', 'UAT Test Batch')
      await adminPage.selectOption('select[name="programId"]', { index: 1 })
      await adminPage.fill('input[name="semester"]', '1')
      await adminPage.fill('input[name="startYear"]', '2024')
      await adminPage.fill('input[name="endYear"]', '2028')
      await adminPage.click('button[type="submit"]')
      
      await expect(adminPage.locator('text=Batch created successfully')).toBeVisible()
      
      // Faculty marks attendance for the batch
      const facultyContext = await browser.newContext({ 
        storageState: 'tests/e2e/.auth/faculty.json' 
      })
      const facultyPage = await facultyContext.newPage()
      
      await facultyPage.goto('/attendance')
      
      // Check if there are classes to mark attendance for
      const classesToday = facultyPage.locator('[data-testid="class-session"]')
      const classCount = await classesToday.count()
      
      if (classCount > 0) {
        await classesToday.first().click()
        
        // Mark some students present
        const presentButtons = facultyPage.locator('button:has-text("Present")')
        const buttonCount = await presentButtons.count()
        
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
          await presentButtons.nth(i).click()
        }
        
        await facultyPage.click('button:has-text("Save Attendance")')
        await expect(facultyPage.locator('text=Attendance saved')).toBeVisible()
      }
      
      // Student views their attendance
      const studentContext = await browser.newContext({ 
        storageState: 'tests/e2e/.auth/student.json' 
      })
      const studentPage = await studentContext.newPage()
      
      await studentPage.goto('/attendance')
      
      // Should see attendance records
      await expect(studentPage.locator('h1:has-text("My Attendance")')).toBeVisible()
      
      // Cleanup
      await adminContext.close()
      await facultyContext.close()
      await studentContext.close()
    })

    test('Attendance dispute resolution workflow', async ({ browser }) => {
      // Student raises dispute → Faculty/Admin resolves it
      
      // Student creates dispute
      const studentContext = await browser.newContext({ 
        storageState: 'tests/e2e/.auth/student.json' 
      })
      const studentPage = await studentContext.newPage()
      
      await studentPage.goto('/attendance')
      
      const absentRecord = studentPage.locator('[data-status="ABSENT"]').first()
      if (await absentRecord.isVisible()) {
        await absentRecord.click()
        await studentPage.click('button:has-text("Dispute")')
        await studentPage.fill('textarea[name="reason"]', 'UAT Test Dispute - I was present')
        await studentPage.click('button:has-text("Submit Dispute")')
        
        await expect(studentPage.locator('text=Dispute submitted')).toBeVisible()
      }
      
      // Admin resolves dispute
      const adminContext = await browser.newContext({ 
        storageState: 'tests/e2e/.auth/admin.json' 
      })
      const adminPage = await adminContext.newPage()
      
      await adminPage.goto('/attendance/disputes')
      
      const pendingDisputes = adminPage.locator('[data-status="PENDING"]')
      const disputeCount = await pendingDisputes.count()
      
      if (disputeCount > 0) {
        await pendingDisputes.first().click()
        await adminPage.click('button:has-text("Approve")')
        await adminPage.fill('textarea[name="resolution"]', 'Approved after verification')
        await adminPage.click('button:has-text("Confirm")')
        
        await expect(adminPage.locator('text=Dispute resolved')).toBeVisible()
      }
      
      // Cleanup
      await studentContext.close()
      await adminContext.close()
    })
  })

  test.describe('Business Process Validation', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('Academic year rollover process', async ({ page }) => {
      // Scenario: End of academic year, promote students to next semester
      
      await page.goto('/settings')
      await page.click('text=Academic Operations')
      
      // Initiate year-end process
      await page.click('button:has-text("Year-End Operations")')
      
      // Select current academic year
      await page.selectOption('select[name="currentYear"]', '2023-24')
      
      // Preview promotion changes
      await page.click('button:has-text("Preview Promotions")')
      
      // Should show students to be promoted
      await expect(page.locator('text=Students to be promoted')).toBeVisible()
      
      // Confirm promotions
      await page.click('button:has-text("Confirm Promotions")')
      await page.fill('input[name="confirmationText"]', 'CONFIRM PROMOTIONS')
      await page.click('button:has-text("Execute")')
      
      await expect(page.locator('text=Year-end operations completed')).toBeVisible()
    })

    test('Examination schedule management', async ({ page }) => {
      // Scenario: Create and manage examination schedules
      
      await page.goto('/settings')
      await page.click('text=Examinations')
      
      // Create exam period
      await page.click('button:has-text("Add Exam Period")')
      await page.fill('input[name="name"]', 'Mid Semester Examination')
      await page.fill('input[name="startDate"]', '2024-03-15')
      await page.fill('input[name="endDate"]', '2024-03-25')
      await page.selectOption('select[name="examType"]', 'INTERNAL')
      await page.check('input[name="blockRegularClasses"]')
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Exam period created')).toBeVisible()
      
      // Schedule individual exams
      await page.click('button:has-text("Schedule Exams")')
      
      // Add exam for a subject
      await page.click('button:has-text("Add Exam")')
      await page.selectOption('select[name="subjectId"]', { index: 1 })
      await page.fill('input[name="examDate"]', '2024-03-16')
      await page.fill('input[name="startTime"]', '09:00')
      await page.fill('input[name="duration"]', '180') // 3 hours
      await page.click('button[type="submit"]')
      
      await expect(page.locator('text=Exam scheduled')).toBeVisible()
    })

    test('Faculty workload optimization', async ({ page }) => {
      // Scenario: Optimize faculty workload distribution
      
      await page.goto('/faculty')
      
      // Access workload analysis
      await page.click('button:has-text("Workload Analysis")')
      
      // View department-wide workload
      await expect(page.locator('text=Workload Distribution')).toBeVisible()
      
      // Identify overloaded faculty
      const overloadedFaculty = page.locator('[data-workload-status="overloaded"]')
      const overloadedCount = await overloadedFaculty.count()
      
      if (overloadedCount > 0) {
        // View suggestions for redistribution
        await page.click('button:has-text("Optimization Suggestions")')
        
        await expect(page.locator('text=Redistribution Suggestions')).toBeVisible()
        
        // Apply suggested changes
        const suggestions = page.locator('[data-testid="suggestion-item"]')
        const suggestionCount = await suggestions.count()
        
        if (suggestionCount > 0) {
          await suggestions.first().locator('button:has-text("Apply")').click()
          await expect(page.locator('text=Workload updated')).toBeVisible()
        }
      }
      
      // Generate workload report
      await page.click('button:has-text("Generate Report")')
      
      const downloadPromise = page.waitForEvent('download')
      await page.click('button:has-text("Download Report")')
      const download = await downloadPromise
      
      expect(download.suggestedFilename()).toContain('workload-report')
    })
  })

  test.describe('Mobile User Experience', () => {
    test.use({ 
      storageState: 'tests/e2e/.auth/faculty.json',
      viewport: { width: 375, height: 667 } // iPhone SE
    })

    test('Faculty can mark attendance on mobile device', async ({ page }) => {
      // Scenario: Faculty marking attendance using mobile phone
      
      await page.goto('/attendance')
      
      // Mobile-optimized attendance interface
      await expect(page.locator('h1:has-text("Mark Attendance")')).toBeVisible()
      
      // Should see mobile-friendly class list
      const classList = page.locator('[data-testid="mobile-class-list"]')
      if (await classList.isVisible()) {
        const classCards = classList.locator('[data-testid="class-card"]')
        const cardCount = await classCards.count()
        
        if (cardCount > 0) {
          // Tap on first class
          await classCards.first().tap()
          
          // Should see student list optimized for mobile
          const studentList = page.locator('[data-testid="mobile-student-list"]')
          await expect(studentList).toBeVisible()
          
          // Quick attendance marking with swipe gestures or large buttons
          const quickMarkButtons = page.locator('[data-testid="quick-mark-button"]')
          const buttonCount = await quickMarkButtons.count()
          
          for (let i = 0; i < Math.min(buttonCount, 3); i++) {
            await quickMarkButtons.nth(i).tap()
          }
          
          // Save attendance
          await page.tap('button:has-text("Save")')
          await expect(page.locator('text=Saved')).toBeVisible()
        }
      }
    })
  })

  test.describe('Accessibility User Experience', () => {
    test.use({ storageState: 'tests/e2e/.auth/student.json' })

    test('Visually impaired student can navigate and use the system', async ({ page }) => {
      // Scenario: Student using screen reader to check attendance
      
      await page.goto('/attendance')
      
      // Test keyboard navigation
      await page.keyboard.press('Tab') // Focus first interactive element
      
      // Navigate through attendance records using keyboard
      let currentFocus = page.locator(':focus')
      await expect(currentFocus).toBeVisible()
      
      // Use arrow keys to navigate table
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      
      // Enter to select/view details
      await page.keyboard.press('Enter')
      
      // Should work with screen reader announcements
      // (This would be tested with actual screen reader in manual testing)
      
      // Check for proper ARIA labels and announcements
      const attendanceTable = page.locator('table[role="table"]')
      await expect(attendanceTable).toBeVisible()
      
      const tableCaption = attendanceTable.locator('caption')
      if (await tableCaption.isVisible()) {
        await expect(tableCaption).toHaveText(/attendance/i)
      }
    })
  })

  test.describe('Performance Under Load', () => {
    test.use({ storageState: 'tests/e2e/.auth/admin.json' })

    test('System performs well with large datasets', async ({ page }) => {
      // Scenario: Admin managing large university with thousands of students
      
      // Mock large dataset for testing
      await page.route('/api/students*', async (route) => {
        const url = new URL(route.request().url())
        const page = parseInt(url.searchParams.get('page') || '1')
        const limit = parseInt(url.searchParams.get('limit') || '50')
        
        // Simulate large dataset with pagination
        const totalStudents = 5000
        const students = Array.from({ length: limit }, (_, i) => ({
          id: `student-${(page - 1) * limit + i}`,
          studentId: `JLU2024${((page - 1) * limit + i).toString().padStart(4, '0')}`,
          user: {
            name: `Student ${(page - 1) * limit + i}`,
            email: `student${(page - 1) * limit + i}@jlu.edu.in`
          },
          batch: { name: 'Large Batch' }
        }))
        
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            students,
            totalCount: totalStudents,
            totalPages: Math.ceil(totalStudents / limit),
            currentPage: page
          })
        })
      })
      
      const startTime = Date.now()
      await page.goto('/students')
      
      // Page should load within reasonable time
      await expect(page.locator('h1:has-text("Students")')).toBeVisible()
      const loadTime = Date.now() - startTime
      expect(loadTime).toBeLessThan(3000) // 3 seconds
      
      // Test pagination performance
      await page.click('button:has-text("Next")')
      await expect(page.locator('table tbody tr')).toHaveCount(50)
      
      // Test search performance with large dataset
      const searchStart = Date.now()
      await page.fill('input[placeholder*="Search"]', 'Student 100')
      await page.press('input[placeholder*="Search"]', 'Enter')
      
      await expect(page.locator('text=Student 100')).toBeVisible()
      const searchTime = Date.now() - searchStart
      expect(searchTime).toBeLessThan(1000) // 1 second
    })
  })
})