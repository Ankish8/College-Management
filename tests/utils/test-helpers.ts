import { Page, expect } from '@playwright/test';

export class TestHelper {
  constructor(private page: Page) {}

  async takeScreenshot(name: string, fullPage: boolean = true) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({ 
      path: `test-results/screenshots/${name}-${timestamp}.png`,
      fullPage 
    });
  }

  async waitForLoadingToComplete() {
    // Wait for any loading spinners to disappear
    await this.page.waitForFunction(() => {
      const spinners = document.querySelectorAll('[data-testid="loading"], .loading, .spinner');
      return spinners.length === 0;
    }, { timeout: 10000 });
  }

  async fillFormField(selector: string, value: string) {
    await this.page.waitForSelector(selector);
    await this.page.fill(selector, value);
  }

  async selectOption(selector: string, value: string) {
    await this.page.waitForSelector(selector);
    await this.page.selectOption(selector, value);
  }

  async clickButton(text: string) {
    const button = this.page.locator(`button:has-text("${text}"), input[type="submit"][value="${text}"]`);
    await button.waitFor();
    await button.click();
  }

  async waitForToast(message?: string) {
    if (message) {
      await expect(this.page.locator('.toast', { hasText: message })).toBeVisible({ timeout: 5000 });
    } else {
      await expect(this.page.locator('.toast')).toBeVisible({ timeout: 5000 });
    }
  }

  async navigateToSection(sectionName: string) {
    console.log(`🧭 Navigating to ${sectionName}`);
    
    // Try clicking the navigation link
    const navSelectors = [
      `nav a:has-text("${sectionName}")`,
      `[data-testid="nav-${sectionName.toLowerCase()}"]`,
      `a[href*="${sectionName.toLowerCase()}"]`,
      `button:has-text("${sectionName}")`
    ];

    let found = false;
    for (const selector of navSelectors) {
      try {
        const element = this.page.locator(selector).first();
        if (await element.isVisible({ timeout: 2000 })) {
          await element.click();
          found = true;
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (!found) {
      // Try direct navigation
      const url = `/${sectionName.toLowerCase()}`;
      await this.page.goto(url);
    }

    await this.waitForLoadingToComplete();
    await this.takeScreenshot(`navigate-to-${sectionName.toLowerCase()}`);
  }

  async verifyTableHasData(tableSelector: string = 'table') {
    await this.page.waitForSelector(tableSelector);
    const rows = await this.page.locator(`${tableSelector} tbody tr`).count();
    expect(rows).toBeGreaterThan(0);
    console.log(`✅ Table has ${rows} rows of data`);
  }

  async createEntity(entityType: string, data: Record<string, string>) {
    console.log(`➕ Creating new ${entityType}`);
    
    // Look for "Add" or "Create" button
    const addButtonSelectors = [
      `button:has-text("Add ${entityType}")`,
      `button:has-text("Create ${entityType}")`,
      `button:has-text("New ${entityType}")`,
      `[data-testid="add-${entityType.toLowerCase()}"]`,
      'button:has-text("Add")',
      'button:has-text("Create")',
      'button:has-text("New")'
    ];

    let addButton;
    for (const selector of addButtonSelectors) {
      try {
        addButton = this.page.locator(selector).first();
        if (await addButton.isVisible({ timeout: 2000 })) {
          break;
        }
      } catch (error) {
        continue;
      }
    }

    if (addButton) {
      await addButton.click();
    }

    // Wait for modal or form to appear
    await this.page.waitForSelector('form, [role="dialog"]', { timeout: 5000 });
    await this.takeScreenshot(`create-${entityType.toLowerCase()}-form`);

    // Fill form fields
    for (const [field, value] of Object.entries(data)) {
      const fieldSelectors = [
        `input[name="${field}"]`,
        `select[name="${field}"]`,
        `textarea[name="${field}"]`,
        `input[placeholder*="${field}"]`,
        `#${field}`
      ];

      for (const selector of fieldSelectors) {
        try {
          const element = this.page.locator(selector);
          if (await element.isVisible({ timeout: 1000 })) {
            if (await element.getAttribute('type') === 'select') {
              await this.selectOption(selector, value);
            } else {
              await this.fillFormField(selector, value);
            }
            break;
          }
        } catch (error) {
          continue;
        }
      }
    }

    await this.takeScreenshot(`create-${entityType.toLowerCase()}-filled`);

    // Submit the form
    await this.clickButton('Save');
    await this.waitForToast();
    await this.takeScreenshot(`create-${entityType.toLowerCase()}-success`);
    
    console.log(`✅ Successfully created ${entityType}`);
  }

  async handleErrors() {
    // Check for any error messages on the page
    const errorSelectors = [
      '.error',
      '.alert-error',
      '[role="alert"]',
      '.toast-error',
      '.text-red-500',
      '.text-red-600'
    ];

    for (const selector of errorSelectors) {
      const errorElement = this.page.locator(selector);
      if (await errorElement.isVisible({ timeout: 1000 })) {
        const errorText = await errorElement.textContent();
        console.warn(`⚠️ Error detected: ${errorText}`);
        await this.takeScreenshot('error-state');
      }
    }
  }
}