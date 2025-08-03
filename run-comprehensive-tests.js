#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Comprehensive College Management System Test Runner
 * 
 * This script runs a complete end-to-end test suite that:
 * 1. Sets up the database with fresh data
 * 2. Tests authentication for all user roles
 * 3. Tests admin workflows (creating batches, students, faculty, subjects)
 * 4. Tests faculty workflows (timetable creation, attendance marking)
 * 5. Tests student workflows (viewing timetable, attendance)
 * 6. Takes screenshots at every step
 * 7. Handles errors gracefully with detailed logging
 */

class ComprehensiveTestRunner {
  constructor() {
    this.startTime = new Date();
    this.testResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };
    
    this.setupDirectories();
  }

  setupDirectories() {
    const dirs = [
      'test-results',
      'test-results/screenshots',
      'test-results/videos',
      'test-results/traces'
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
      }
    });
  }

  async runCommand(command, description) {
    console.log(`\n🚀 ${description}`);
    console.log(`💻 Running: ${command}`);
    
    try {
      const output = execSync(command, { 
        stdio: 'inherit', 
        cwd: process.cwd(),
        timeout: 300000 // 5 minutes timeout
      });
      console.log(`✅ ${description} completed successfully`);
      return true;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      this.testResults.errors.push(`${description}: ${error.message}`);
      return false;
    }
  }

  async runPlaywrightTest(testFile, description) {
    console.log(`\n🎭 ${description}`);
    console.log(`📝 Running test file: ${testFile}`);
    
    try {
      const command = `npx playwright test ${testFile} --reporter=line`;
      execSync(command, { 
        stdio: 'inherit', 
        cwd: process.cwd(),
        timeout: 600000 // 10 minutes timeout for comprehensive tests
      });
      
      console.log(`✅ ${description} completed successfully`);
      this.testResults.passed++;
      return true;
    } catch (error) {
      console.error(`❌ ${description} failed:`, error.message);
      this.testResults.failed++;
      this.testResults.errors.push(`${description}: ${error.message}`);
      return false;
    }
  }

  async checkPrerequisites() {
    console.log('\n🔍 Checking prerequisites...');
    
    // Check if Node.js and npm are available
    try {
      execSync('node --version', { stdio: 'pipe' });
      execSync('npm --version', { stdio: 'pipe' });
      console.log('✅ Node.js and npm are available');
    } catch (error) {
      throw new Error('Node.js or npm not found. Please install Node.js first.');
    }

    // Check if database exists
    if (!fs.existsSync('prisma/dev.db')) {
      console.log('⚠️ Database not found, will be created during setup');
    } else {
      console.log('✅ Database file exists');
    }

    // Check if Playwright is installed
    try {
      execSync('npx playwright --version', { stdio: 'pipe' });
      console.log('✅ Playwright is available');
    } catch (error) {
      console.log('📦 Installing Playwright...');
      await this.runCommand('npm install playwright', 'Installing Playwright');
      await this.runCommand('npx playwright install', 'Installing Playwright browsers');
    }
  }

  async setupEnvironment() {
    console.log('\n🔧 Setting up test environment...');
    
    // Install dependencies
    await this.runCommand('npm install', 'Installing dependencies');
    
    // Setup database
    await this.runCommand('npm run db:reset', 'Resetting database and seeding with test data');
    
    // Verify database setup
    console.log('🔍 Verifying database setup...');
    try {
      execSync('npx prisma db pull --print', { stdio: 'pipe', timeout: 10000 });
      console.log('✅ Database is accessible and properly configured');
    } catch (error) {
      console.warn('⚠️ Database verification warning:', error.message);
    }
  }

  async runTestSuite() {
    console.log('\n🧪 Running comprehensive test suite...');
    
    const testSuites = [
      {
        file: 'tests/auth/authentication.spec.ts',
        description: 'Authentication and Role-based Access Tests'
      },
      {
        file: 'tests/admin/admin-workflow.spec.ts',
        description: 'Admin Workflow Tests (Batches, Students, Faculty, Subjects)'
      },
      {
        file: 'tests/faculty/faculty-workflow.spec.ts',
        description: 'Faculty Workflow Tests (Timetable, Attendance)'
      },
      {
        file: 'tests/student/student-workflow.spec.ts',
        description: 'Student Workflow Tests (View Timetable, Attendance)'
      },
      {
        file: 'tests/comprehensive-e2e.spec.ts',
        description: 'Comprehensive End-to-End Real-world Scenario Test'
      }
    ];

    console.log(`📋 Will run ${testSuites.length} test suites`);

    for (const suite of testSuites) {
      await this.runPlaywrightTest(suite.file, suite.description);
      
      // Small delay between test suites
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  generateReport() {
    const duration = new Date() - this.startTime;
    const durationMin = Math.floor(duration / 60000);
    const durationSec = Math.floor((duration % 60000) / 1000);

    const report = {
      timestamp: new Date().toISOString(),
      duration: `${durationMin}m ${durationSec}s`,
      results: this.testResults,
      screenshots: this.getScreenshotList(),
      summary: {
        total: this.testResults.passed + this.testResults.failed,
        success_rate: this.testResults.passed + this.testResults.failed > 0 
          ? Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100) 
          : 0
      }
    };

    // Save detailed report
    fs.writeFileSync('test-results/test-report.json', JSON.stringify(report, null, 2));
    
    // Generate HTML report
    this.generateHTMLReport(report);
    
    return report;
  }

  getScreenshotList() {
    const screenshotDir = 'test-results/screenshots';
    if (!fs.existsSync(screenshotDir)) return [];
    
    return fs.readdirSync(screenshotDir)
      .filter(file => file.endsWith('.png'))
      .map(file => path.join(screenshotDir, file));
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>College Management System - Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #4CAF50; color: white; padding: 20px; border-radius: 5px; }
        .summary { display: flex; gap: 20px; margin: 20px 0; }
        .card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; flex: 1; }
        .passed { border-left: 5px solid #4CAF50; }
        .failed { border-left: 5px solid #f44336; }
        .error { background: #ffebee; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .screenshots { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 20px 0; }
        .screenshot { border: 1px solid #ddd; padding: 10px; border-radius: 5px; }
        .screenshot img { max-width: 100%; height: auto; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎓 College Management System - Comprehensive Test Report</h1>
        <p>Generated: ${report.timestamp}</p>
        <p>Duration: ${report.duration}</p>
    </div>
    
    <div class="summary">
        <div class="card passed">
            <h3>✅ Passed Tests</h3>
            <h2>${report.results.passed}</h2>
        </div>
        <div class="card failed">
            <h3>❌ Failed Tests</h3>
            <h2>${report.results.failed}</h2>
        </div>
        <div class="card">
            <h3>📊 Success Rate</h3>
            <h2>${report.summary.success_rate}%</h2>
        </div>
    </div>

    ${report.results.errors.length > 0 ? `
    <div class="card">
        <h3>❌ Errors Encountered</h3>
        ${report.results.errors.map(error => `<div class="error">${error}</div>`).join('')}
    </div>
    ` : ''}

    <div class="card">
        <h3>📸 Screenshots Captured</h3>
        <p>${report.screenshots.length} screenshots taken during testing</p>
        <div class="screenshots">
            ${report.screenshots.slice(0, 12).map(screenshot => `
                <div class="screenshot">
                    <img src="${screenshot}" alt="Test Screenshot">
                    <p>${path.basename(screenshot)}</p>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>
    `;

    fs.writeFileSync('test-results/test-report.html', html);
  }

  printSummary(report) {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 COMPREHENSIVE TEST SUMMARY');
    console.log('='.repeat(60));
    console.log(`⏱️  Duration: ${report.duration}`);
    console.log(`✅ Passed: ${report.results.passed}`);
    console.log(`❌ Failed: ${report.results.failed}`);
    console.log(`📊 Success Rate: ${report.summary.success_rate}%`);
    console.log(`📸 Screenshots: ${report.screenshots.length}`);
    console.log(`📁 Results saved to: test-results/`);
    console.log(`📋 HTML Report: test-results/test-report.html`);
    
    if (report.results.errors.length > 0) {
      console.log('\n⚠️  ERRORS ENCOUNTERED:');
      report.results.errors.forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (report.results.failed === 0) {
      console.log('🎉 ALL TESTS PASSED! The College Management System is working correctly.');
    } else {
      console.log('⚠️  Some tests failed. Please check the detailed report and screenshots.');
    }
  }

  async run() {
    try {
      console.log('🚀 Starting Comprehensive College Management System Test');
      console.log('='.repeat(60));
      
      await this.checkPrerequisites();
      await this.setupEnvironment();
      await this.runTestSuite();
      
      const report = this.generateReport();
      this.printSummary(report);
      
      // Exit with appropriate code
      process.exit(report.results.failed === 0 ? 0 : 1);
      
    } catch (error) {
      console.error('\n💥 Critical error during test execution:', error.message);
      console.error('Stack trace:', error.stack);
      process.exit(1);
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted by user');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the comprehensive test suite
const testRunner = new ComprehensiveTestRunner();
testRunner.run();