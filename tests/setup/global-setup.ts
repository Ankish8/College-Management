import { chromium, FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  // Reset and seed the database for testing
  console.log('📊 Setting up test database...');
  try {
    // Reset the database
    execSync('npm run db:reset', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
      timeout: 60000
    });
    
    console.log('✅ Database setup completed');
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    throw error;
  }

  // Wait for the dev server to be ready
  console.log('⏳ Waiting for development server...');
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  let retries = 0;
  const maxRetries = 30;
  
  while (retries < maxRetries) {
    try {
      await page.goto('http://localhost:3000', { timeout: 5000 });
      const title = await page.title();
      if (title) {
        console.log('✅ Development server is ready');
        break;
      }
    } catch (error) {
      retries++;
      console.log(`⏳ Waiting for server... (${retries}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (retries === maxRetries) {
    throw new Error('Development server failed to start');
  }
  
  await browser.close();
  console.log('🎉 Global setup completed successfully');
}

export default globalSetup;