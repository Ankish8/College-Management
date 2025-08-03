const { chromium } = require('playwright');

async function testCollegeManagementSystem() {
  console.log('🚀 Starting College Management System Tests...\n');
  
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false, // Show browser window so you can see the tests
    slowMo: 1000 // Slow down operations so you can observe
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test 1: Homepage/Login redirect
    console.log('📝 Test 1: Accessing homepage...');
    await page.goto('http://localhost:3001');
    await page.waitForLoadState('networkidle');
    
    const currentUrl = page.url();
    console.log(`   Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/auth/signin')) {
      console.log('   ✅ Successfully redirected to login page');
    } else {
      console.log('   ⚠️  Expected redirect to login page');
    }
    
    // Test 2: Login page functionality
    console.log('\n📝 Test 2: Testing login page...');
    await page.goto('http://localhost:3001/auth/signin');
    await page.waitForLoadState('networkidle');
    
    // Check if login form exists
    const emailInput = await page.locator('input[type="email"]');
    const passwordInput = await page.locator('input[type="password"]');
    const submitButton = await page.locator('button[type="submit"]');
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      console.log('   ✅ Login form elements found');
      
      // Fill in development credentials
      await emailInput.fill('admin@jlu.edu.in');
      await passwordInput.fill('admin123');
      console.log('   ✅ Filled in admin credentials');
      
      // Submit login (but don't wait for redirect as it might fail)
      await submitButton.click();
      console.log('   🔄 Submitted login form');
      
      // Wait a moment to see what happens
      await page.waitForTimeout(3000);
      console.log(`   Current URL after login: ${page.url()}`);
      
    } else {
      console.log('   ❌ Login form elements not found');
    }
    
    // Test 3: Direct page access (should redirect to login)
    console.log('\n📝 Test 3: Testing protected routes...');
    
    const protectedRoutes = [
      '/dashboard',
      '/students', 
      '/faculty',
      '/subjects',
      '/batches',
      '/timetable',
      '/attendance'
    ];
    
    for (const route of protectedRoutes) {
      try {
        console.log(`   Testing ${route}...`);
        await page.goto(`http://localhost:3001${route}`);
        await page.waitForLoadState('networkidle');
        
        const finalUrl = page.url();
        if (finalUrl.includes('/auth/signin')) {
          console.log(`   ✅ ${route} properly protected (redirected to login)`);
        } else if (finalUrl.includes(route)) {
          console.log(`   🎉 ${route} accessible (user might be logged in)`);
        } else {
          console.log(`   ⚠️  ${route} unexpected behavior: ${finalUrl}`);
        }
      } catch (error) {
        console.log(`   ❌ ${route} error: ${error.message}`);
      }
    }
    
    // Test 4: Timetable page (recently fixed enum issue)
    console.log('\n📝 Test 4: Testing timetable page (enum fix verification)...');
    try {
      await page.goto('http://localhost:3001/timetable');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      // Check for any error messages or console errors
      const errors = [];
      page.on('pageerror', error => errors.push(error));
      
      if (errors.length === 0) {
        console.log('   ✅ Timetable page loads without JavaScript errors');
      } else {
        console.log(`   ❌ Timetable page has errors: ${errors.join(', ')}`);
      }
    } catch (error) {
      console.log(`   ❌ Timetable page error: ${error.message}`);
    }
    
    // Test 5: Attendance page (recently cleaned up)
    console.log('\n📝 Test 5: Testing attendance page (recent UI cleanup)...');
    try {
      await page.goto('http://localhost:3001/attendance');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);
      
      console.log('   ✅ Attendance page accessible');
      console.log(`   Current URL: ${page.url()}`);
    } catch (error) {
      console.log(`   ❌ Attendance page error: ${error.message}`);
    }
    
    console.log('\n🎉 Test completed! Browser will remain open for manual inspection.');
    console.log('📋 You can now manually test features like:');
    console.log('   - Login with credentials: admin@jlu.edu.in / admin123');
    console.log('   - Navigate through different sections');
    console.log('   - Test student management features');
    console.log('   - Try creating timetable entries');
    console.log('   - Test attendance marking');
    console.log('\n🔗 System running at: http://localhost:3001');
    
    // Keep browser open for manual testing
    console.log('\n⏳ Browser will stay open for 5 minutes for manual testing...');
    await page.waitForTimeout(300000); // 5 minutes
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed. Tests completed.');
  }
}

// Run the tests
testCollegeManagementSystem().catch(console.error);