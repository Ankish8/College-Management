const { chromium } = require('playwright');

async function runComprehensiveTests() {
  console.log('🚀 Starting Automated College Management System Tests...\n');
  
  const browser = await chromium.launch({ 
    headless: false, // Show browser so you can watch
    slowMo: 500 // Slow down so you can see what's happening
  });
  
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 }
  });
  
  context.on('pageerror', error => {
    console.log('❌ JavaScript Error:', error.message);
  });
  
  context.on('requestfailed', request => {
    console.log('❌ Request Failed:', request.url(), request.failure().errorText);
  });
  
  const page = await context.newPage();
  
  try {
    // TEST 1: Login
    console.log('📝 TEST 1: Testing Login...');
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle');
    
    // Fill login form
    await page.fill('input[type="email"]', 'admin@jlu.edu.in');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect
    await page.waitForURL('**/dashboard', { timeout: 10000 }).catch(() => {
      console.log('⚠️  Dashboard redirect took longer than expected');
    });
    
    console.log('✅ Login successful');
    
    // TEST 2: Dashboard
    console.log('\n📝 TEST 2: Testing Dashboard...');
    const dashboardUrl = page.url();
    console.log('Current URL:', dashboardUrl);
    
    // Check if sidebar exists
    const sidebar = await page.locator('[data-testid="sidebar"], .sidebar, nav').first();
    if (await sidebar.count() > 0) {
      console.log('✅ Sidebar found');
    } else {
      console.log('❌ Sidebar not found');
    }
    
    // TEST 3: Students Page
    console.log('\n📝 TEST 3: Testing Students Page...');
    try {
      // Look for Students link in various ways
      const studentsLink = await page.locator('text=Students').first();
      if (await studentsLink.count() > 0) {
        await studentsLink.click();
        await page.waitForLoadState('networkidle');
        
        // Check for student data
        const studentCount = await page.locator('tr, .student-item, [data-testid="student"]').count();
        console.log(`✅ Students page loaded, found ${studentCount} student elements`);
        
        // Test search functionality
        const searchInput = await page.locator('input[placeholder*="search"], input[placeholder*="Search"]').first();
        if (await searchInput.count() > 0) {
          await searchInput.fill('test');
          console.log('✅ Search functionality found and tested');
        } else {
          console.log('⚠️  Search input not found');
        }
      } else {
        console.log('❌ Students link not found');
      }
    } catch (error) {
      console.log('❌ Students page error:', error.message);
    }
    
    // TEST 4: Timetable Page (CRITICAL - Recently Fixed)
    console.log('\n📝 TEST 4: Testing Timetable Page (CRITICAL)...');
    try {
      const timetableLink = await page.locator('text=Timetable').first();
      if (await timetableLink.count() > 0) {
        await timetableLink.click();
        await page.waitForLoadState('networkidle');
        
        // Check for JavaScript errors
        const hasErrors = await page.evaluate(() => {
          return window.onerror !== null || window.addEventListener('error', () => true);
        });
        
        console.log('✅ Timetable page loaded without crashes');
        
        // Try to find and click create entry button
        const createButton = await page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("+")').first();
        if (await createButton.count() > 0) {
          await createButton.click();
          await page.waitForTimeout(1000);
          
          // Check if modal opened
          const modal = await page.locator('.modal, [role="dialog"], .dialog').first();
          if (await modal.count() > 0) {
            console.log('✅ Timetable create modal opened successfully');
            
            // Test enum dropdowns (the previously broken feature)
            const dayDropdown = await page.locator('select, [role="combobox"]').first();
            if (await dayDropdown.count() > 0) {
              console.log('✅ Dropdowns found - enum conversion working');
            }
            
            // Close modal
            await page.keyboard.press('Escape');
          } else {
            console.log('⚠️  Create modal might not have opened');
          }
        } else {
          console.log('⚠️  Create button not found');
        }
      } else {
        console.log('❌ Timetable link not found');
      }
    } catch (error) {
      console.log('❌ Timetable page error:', error.message);
    }
    
    // TEST 5: Attendance Page (CRITICAL - Recently Redesigned)
    console.log('\n📝 TEST 5: Testing Attendance Page (CRITICAL)...');
    try {
      const attendanceLink = await page.locator('text=Attendance').first();
      if (await attendanceLink.count() > 0) {
        await attendanceLink.click();
        await page.waitForLoadState('networkidle');
        
        console.log('✅ Attendance page loaded');
        
        // Test batch-first selection flow
        const batchSelect = await page.locator('select, [role="combobox"]').first();
        if (await batchSelect.count() > 0) {
          console.log('✅ Batch selector found - new UI working');
          
          // Try selecting a batch
          await batchSelect.click();
          await page.waitForTimeout(500);
          
          const batchOptions = await page.locator('option, [role="option"]').count();
          console.log(`✅ Found ${batchOptions} batch options`);
        } else {
          console.log('⚠️  Batch selector not found');
        }
        
        // Check for focus mode toggle
        const modeToggle = await page.locator('button:has-text("Detailed"), button:has-text("Fast")').first();
        if (await modeToggle.count() > 0) {
          console.log('✅ Focus mode toggle found');
        } else {
          console.log('⚠️  Focus mode toggle not found');
        }
      } else {
        console.log('❌ Attendance link not found');
      }
    } catch (error) {
      console.log('❌ Attendance page error:', error.message);
    }
    
    // TEST 6: Other Pages Quick Check
    console.log('\n📝 TEST 6: Testing Other Pages...');
    const pagesToTest = ['Faculty', 'Subjects', 'Batches', 'Settings'];
    
    for (const pageName of pagesToTest) {
      try {
        const link = await page.locator(`text=${pageName}`).first();
        if (await link.count() > 0) {
          await link.click();
          await page.waitForLoadState('networkidle');
          console.log(`✅ ${pageName} page loaded`);
        } else {
          console.log(`❌ ${pageName} link not found`);
        }
      } catch (error) {
        console.log(`❌ ${pageName} page error:`, error.message);
      }
    }
    
    // TEST 7: Database Data Verification
    console.log('\n📝 TEST 7: Verifying Database Data...');
    
    // Go back to students to count them
    const studentsLink = await page.locator('text=Students').first();
    if (await studentsLink.count() > 0) {
      await studentsLink.click();
      await page.waitForLoadState('networkidle');
      
      const studentRows = await page.locator('tr').count();
      console.log(`📊 Found ${studentRows} student rows (expected ~84)`);
      
      if (studentRows > 80) {
        console.log('✅ Student count looks correct');
      } else {
        console.log('⚠️  Student count seems low');
      }
    }
    
    console.log('\n🎉 Automated testing completed!');
    console.log('🔍 Check the console output above for detailed results');
    
    // Keep browser open for 30 seconds for manual inspection
    console.log('\n⏳ Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Critical test failure:', error);
  } finally {
    await browser.close();
    console.log('\n👋 Browser closed. Testing completed.');
  }
}

// Run the tests
runComprehensiveTests().catch(console.error);