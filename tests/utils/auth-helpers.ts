import { Page, expect } from '@playwright/test';

export interface UserCredentials {
  email: string;
  password: string;
  role: 'ADMIN' | 'FACULTY' | 'STUDENT';
  name: string;
}

export const TEST_USERS: Record<string, UserCredentials> = {
  admin: {
    email: 'admin@jlu.edu.in',
    password: 'admin123',
    role: 'ADMIN',
    name: 'System Administrator'
  },
  faculty: {
    email: 'ankish.khatri@jlu.edu.in',
    password: 'password123',
    role: 'FACULTY',
    name: 'Ankish Khatri'
  },
  student: {
    email: 'virat@student.jlu.edu.in',
    password: 'password123',
    role: 'STUDENT',
    name: 'Virat Kohli'
  }
};

export class AuthHelper {
  constructor(private page: Page) {}

  async login(userType: keyof typeof TEST_USERS) {
    const user = TEST_USERS[userType];
    console.log(`🔐 Logging in as ${user.role}: ${user.email}`);

    // Navigate to sign in page
    await this.page.goto('/auth/signin');
    
    // Wait for the form to load
    await this.page.waitForSelector('form');
    
    // Fill in credentials
    await this.page.fill('input[name="email"]', user.email);
    await this.page.fill('input[name="password"]', user.password);
    
    // Take screenshot before login
    await this.page.screenshot({ 
      path: `test-results/screenshots/login-${userType}-before.png`,
      fullPage: true 
    });
    
    // Submit the form
    await this.page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify successful login by checking for user-specific elements
    await expect(this.page.locator('text=' + user.name).first()).toBeVisible({ timeout: 10000 });
    
    // Take screenshot after successful login
    await this.page.screenshot({ 
      path: `test-results/screenshots/login-${userType}-success.png`,
      fullPage: true 
    });
    
    console.log(`✅ Successfully logged in as ${user.role}`);
  }

  async logout() {
    console.log('🔓 Logging out...');
    
    // Look for logout button (may be in a dropdown or direct button)
    const logoutSelector = 'button:has-text("Sign out"), button:has-text("Logout"), [data-testid="logout"]';
    
    try {
      await this.page.click(logoutSelector);
      await this.page.waitForURL('**/auth/signin', { timeout: 5000 });
      console.log('✅ Successfully logged out');
    } catch (error) {
      console.log('⚠️ Logout button not found, navigating to signin directly');
      await this.page.goto('/auth/signin');
    }
  }

  async ensureAuthenticated(userType: keyof typeof TEST_USERS) {
    try {
      // Check if already on dashboard
      await this.page.waitForURL('**/dashboard', { timeout: 2000 });
      const user = TEST_USERS[userType];
      await expect(this.page.locator('text=' + user.name).first()).toBeVisible({ timeout: 5000 });
      console.log(`✅ Already authenticated as ${userType}`);
    } catch {
      // Not authenticated, need to login
      await this.login(userType);
    }
  }
}