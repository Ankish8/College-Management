#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

console.log('🔍 Validating Playwright Test Setup...\n');

// Check if all test files exist
const testFiles = [
  'playwright.config.ts',
  'tests/auth/authentication.spec.ts',
  'tests/admin/admin-workflow.spec.ts',
  'tests/faculty/faculty-workflow.spec.ts',
  'tests/student/student-workflow.spec.ts',
  'tests/comprehensive-e2e.spec.ts',
  'tests/utils/auth-helpers.ts',
  'tests/utils/test-helpers.ts',
  'tests/utils/database-helpers.ts',
  'tests/setup/global-setup.ts',
  'tests/setup/global-teardown.ts',
  'run-comprehensive-tests.js'
];

let allFilesExist = true;
testFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some test files are missing. Please ensure all files are created.');
  process.exit(1);
}

// Check directories
const testDirs = [
  'tests',
  'tests/auth',
  'tests/admin', 
  'tests/faculty',
  'tests/student',
  'tests/utils',
  'tests/setup',
  'test-results',
  'test-results/screenshots'
];

testDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    console.log(`✅ ${dir}/`);
  } else {
    console.log(`❌ ${dir}/ - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json scripts
console.log('\n📋 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const requiredScripts = [
  'test:comprehensive',
  'test:admin',
  'test:faculty', 
  'test:student',
  'test:auth',
  'test:e2e'
];

requiredScripts.forEach(script => {
  if (packageJson.scripts[script]) {
    console.log(`✅ ${script}: ${packageJson.scripts[script]}`);
  } else {
    console.log(`❌ ${script} - MISSING`);
    allFilesExist = false;
  }
});

// Check database
console.log('\n🗄️ Checking database...');
if (fs.existsSync('prisma/dev.db')) {
  console.log('✅ Database file exists');
} else {
  console.log('⚠️ Database file not found - will be created during test setup');
}

// Check Playwright installation
console.log('\n🎭 Checking Playwright installation...');
try {
  execSync('npx playwright --version', { stdio: 'pipe' });
  console.log('✅ Playwright is installed');
} catch (error) {
  console.log('❌ Playwright not properly installed');
  allFilesExist = false;
}

console.log('\n' + '='.repeat(60));
if (allFilesExist) {
  console.log('🎉 TEST SETUP VALIDATION SUCCESSFUL!');
  console.log('\n🚀 Ready to run comprehensive tests:');
  console.log('   npm run test:comprehensive');
  console.log('\n📖 See TEST-README.md for detailed documentation');
} else {
  console.log('❌ TEST SETUP VALIDATION FAILED!');
  console.log('Please fix the missing components before running tests.');
  process.exit(1);
}
console.log('='.repeat(60));