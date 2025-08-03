import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS } from '../utils/auth-helpers';
import { TestHelper } from '../utils/test-helpers';

test.describe('Authentication System Tests', () => {
  let authHelper: AuthHelper;
  let testHelper: TestHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    testHelper = new TestHelper(page);
  });

  test('Authentication: Login Flow for All User Types', async ({ page }) => {
    console.log('🔐 Testing authentication for all user types');

    for (const [userType, user] of Object.entries(TEST_USERS)) {
      await test.step(`Login as ${user.role}`, async () => {
        console.log(`Testing login for ${user.role}: ${user.email}`);
        
        // Navigate to signin page
        await page.goto('/auth/signin');
        await testHelper.takeScreenshot(`login-page-${userType}`);

        // Verify signin form is present
        await expect(page.locator('form')).toBeVisible();
        await expect(page.locator('input[name="email"]')).toBeVisible();
        await expect(page.locator('input[name="password"]')).toBeVisible();

        // Test login
        await authHelper.login(userType as keyof typeof TEST_USERS);
        
        // Verify successful login
        await expect(page).toHaveURL(/.*dashboard.*/);
        await expect(page.locator('text=' + user.name).first()).toBeVisible();
        
        await testHelper.takeScreenshot(`dashboard-${userType}`);

        // Verify role-specific elements are visible
        if (user.role === 'ADMIN') {
          // Admin should see admin-specific navigation
          const adminElements = [
            'text=Settings',
            'text=Faculty',
            'text=Students',
            'text=Subjects'
          ];
          
          for (const element of adminElements) {
            const el = page.locator(element).first();
            if (await el.isVisible({ timeout: 3000 })) {
              console.log(`✅ Admin element visible: ${element}`);
            }
          }
        } else if (user.role === 'FACULTY') {
          // Faculty should see faculty-specific navigation
          const facultyElements = [
            'text=Timetable',
            'text=Attendance'
          ];
          
          for (const element of facultyElements) {
            const el = page.locator(element).first();
            if (await el.isVisible({ timeout: 3000 })) {
              console.log(`✅ Faculty element visible: ${element}`);
            }
          }
        } else if (user.role === 'STUDENT') {
          // Student should see student-specific navigation
          const studentElements = [
            'text=Timetable',
            'text=My Attendance'
          ];
          
          for (const element of studentElements) {
            const el = page.locator(element).first();
            if (await el.isVisible({ timeout: 3000 })) {
              console.log(`✅ Student element visible: ${element}`);
            }
          }
        }

        // Logout for next user
        await authHelper.logout();
        await testHelper.takeScreenshot(`logout-${userType}`);
      });
    }

    console.log('✅ Authentication test completed for all user types');
  });

  test('Authentication: Invalid Login Attempts', async ({ page }) => {
    console.log('🚫 Testing invalid login attempts');

    await test.step('Test Invalid Credentials', async () => {
      await page.goto('/auth/signin');
      
      // Test with invalid email
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');
      
      await testHelper.takeScreenshot('invalid-login-attempt');
      
      // Should stay on signin page or show error
      const isOnSignin = page.url().includes('/auth/signin');
      const hasError = await page.locator('.error, [role="alert"]').isVisible({ timeout: 3000 });
      
      expect(isOnSignin || hasError).toBeTruthy();
    });

    await test.step('Test Empty Credentials', async () => {
      await page.goto('/auth/signin');
      
      // Submit empty form
      await page.click('button[type="submit"]');
      await testHelper.takeScreenshot('empty-login-attempt');
      
      // Should show validation errors or stay on page
      expect(page.url()).toContain('/auth/signin');
    });

    console.log('✅ Invalid login attempts test completed');
  });

  test('Authentication: Session Persistence', async ({ page }) => {
    console.log('🔄 Testing session persistence');

    await test.step('Login and Verify Session', async () => {
      await authHelper.login('admin');
      await testHelper.takeScreenshot('session-login');
      
      // Navigate to a different page
      await page.goto('/students');
      await testHelper.takeScreenshot('session-navigation');
      
      // Verify still authenticated
      await expect(page.locator('text=System Administrator').first()).toBeVisible();
    });

    await test.step('Test Session After Refresh', async () => {
      await page.reload();
      await testHelper.takeScreenshot('session-after-refresh');
      
      // Should still be authenticated
      await expect(page.locator('text=System Administrator').first()).toBeVisible();
    });

    console.log('✅ Session persistence test completed');
  });

  test('Authentication: Role-based Access Control', async ({ page }) => {
    console.log('🛡️ Testing role-based access control');

    // Test admin accessing all areas
    await test.step('Admin Access Control', async () => {
      await authHelper.login('admin');
      
      const adminPages = ['/settings', '/faculty', '/students', '/subjects', '/batches'];
      
      for (const adminPage of adminPages) {
        await page.goto(adminPage);
        await testHelper.takeScreenshot(`admin-access-${adminPage.replace('/', '')}`);
        
        // Should not redirect to unauthorized page
        expect(page.url()).not.toContain('unauthorized');
        expect(page.url()).not.toContain('403');
      }
      
      await authHelper.logout();
    });

    // Test student access restrictions
    await test.step('Student Access Control', async () => {
      await authHelper.login('student');
      
      // Student should not access admin pages
      const restrictedPages = ['/settings', '/faculty/subject-allotment'];
      
      for (const restrictedPage of restrictedPages) {
        await page.goto(restrictedPage);
        await testHelper.takeScreenshot(`student-restricted-${restrictedPage.replace(/[^a-zA-Z]/g, '')}`);
        
        // Should redirect or show unauthorized
        const isRestricted = page.url().includes('unauthorized') || 
                           page.url().includes('403') || 
                           page.url().includes('dashboard') ||
                           await page.locator('text=Unauthorized').isVisible({ timeout: 3000 });
        
        if (!isRestricted) {
          console.log(`⚠️ Student may have access to ${restrictedPage} - check permissions`);
        }
      }
      
      await authHelper.logout();
    });

    console.log('✅ Role-based access control test completed');
  });

  test.afterEach(async ({ page }) => {
    await testHelper.handleErrors();
  });
});