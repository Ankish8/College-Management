import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  // Any cleanup operations can go here
  // For now, we'll keep the database state for inspection
  
  console.log('✅ Global teardown completed');
}

export default globalTeardown;