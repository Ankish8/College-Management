#!/usr/bin/env node

/**
 * Timetable Import API Test Script
 * 
 * This script tests the timetable import API endpoints with sample data.
 * 
 * Usage:
 * node test-timetable-import-api.js --help
 * node test-timetable-import-api.js --validate
 * node test-timetable-import-api.js --import
 * node test-timetable-import-api.js --full-test
 */

const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

class TimetableImportAPITester {
  constructor(baseUrl = 'http://localhost:3000', options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, '') // Remove trailing slash
    this.options = {
      timeout: 30000,
      verbose: true,
      ...options
    }
  }

  /**
   * Test validation endpoint
   */
  async testValidation(jsonFile = 'sample-timetable-template.json') {
    console.log('🔍 Testing validation endpoint...')
    
    try {
      // Read sample data
      const sampleData = this.loadSampleData(jsonFile)
      
      // Make validation request
      const response = await fetch(`${this.baseUrl}/api/timetable/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleData),
        timeout: this.options.timeout
      })
      
      const result = await response.json()
      
      console.log(`📊 Validation Response (${response.status}):`)
      console.log(JSON.stringify(result, null, 2))
      
      if (result.success) {
        console.log('✅ Validation passed successfully')
        if (result.warnings && result.warnings.length > 0) {
          console.log(`⚠️  ${result.warnings.length} warnings found:`)
          result.warnings.forEach((warning, i) => {
            console.log(`   ${i + 1}. ${warning}`)
          })
        }
      } else {
        console.log('❌ Validation failed')
        if (result.errors && result.errors.length > 0) {
          console.log('📋 Errors found:')
          result.errors.forEach((error, i) => {
            console.log(`   ${i + 1}. ${error.field}: ${error.message}`)
          })
        }
      }
      
      return result
      
    } catch (error) {
      console.error('❌ Validation test failed:', error.message)
      throw error
    }
  }

  /**
   * Test import endpoint
   */
  async testImport(jsonFile = 'sample-timetable-template.json') {
    console.log('📥 Testing import endpoint...')
    
    try {
      // Read sample data
      const sampleData = this.loadSampleData(jsonFile)
      
      // Update import ID to avoid conflicts
      sampleData.metadata.importId = `test-import-${Date.now()}`
      sampleData.batch.name = `Test Batch ${Date.now()}`
      
      // Make import request
      const response = await fetch(`${this.baseUrl}/api/timetable/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(sampleData),
        timeout: this.options.timeout
      })
      
      const result = await response.json()
      
      console.log(`📊 Import Response (${response.status}):`)
      console.log(JSON.stringify(result, null, 2))
      
      if (result.success) {
        console.log('✅ Import initiated successfully')
        console.log(`📋 Import ID: ${result.importId}`)
        console.log(`📊 Status URL: ${result.statusUrl}`)
        
        // Monitor import progress
        if (result.importId) {
          await this.monitorImportProgress(result.importId)
        }
      } else {
        console.log('❌ Import failed')
      }
      
      return result
      
    } catch (error) {
      console.error('❌ Import test failed:', error.message)
      throw error
    }
  }

  /**
   * Monitor import progress
   */
  async monitorImportProgress(importId, maxWaitTime = 60000) {
    console.log(`👀 Monitoring import progress for: ${importId}`)
    
    const startTime = Date.now()
    let lastProgress = 0
    
    while (Date.now() - startTime < maxWaitTime) {
      try {
        const response = await fetch(`${this.baseUrl}/api/timetable/import/${importId}/status`)
        const status = await response.json()
        
        if (this.options.verbose && status.progress !== lastProgress) {
          console.log(`📊 Progress: ${status.progress}% (${status.status})`)
          
          if (status.estimation && status.estimation.remainingSeconds > 0) {
            console.log(`⏱️  Estimated remaining: ${status.estimation.remainingSeconds}s`)
          }
          
          lastProgress = status.progress
        }
        
        if (status.status === 'COMPLETED') {
          console.log('✅ Import completed successfully!')
          console.log('📋 Results:')
          console.log(JSON.stringify(status.results, null, 2))
          return status
        } else if (status.status === 'FAILED') {
          console.log('❌ Import failed!')
          console.log('📋 Errors:')
          console.log(JSON.stringify(status.errors, null, 2))
          return status
        }
        
        // Wait before next check
        await this.sleep(2000)
        
      } catch (error) {
        console.error('⚠️  Error checking status:', error.message)
        await this.sleep(5000)
      }
    }
    
    console.log('⏰ Import monitoring timed out')
    return null
  }

  /**
   * Test status endpoint
   */
  async testStatusEndpoint(importId) {
    console.log(`📊 Testing status endpoint for: ${importId}`)
    
    try {
      const response = await fetch(`${this.baseUrl}/api/timetable/import/${importId}/status`)
      const result = await response.json()
      
      console.log(`📊 Status Response (${response.status}):`)
      console.log(JSON.stringify(result, null, 2))
      
      return result
      
    } catch (error) {
      console.error('❌ Status test failed:', error.message)
      throw error
    }
  }

  /**
   * Run comprehensive test suite
   */
  async runFullTestSuite() {
    console.log('🚀 Running comprehensive timetable import API test suite...')
    console.log(`🌐 Base URL: ${this.baseUrl}`)
    console.log('=' .repeat(60))
    
    const testResults = {
      validation: null,
      import: null,
      status: null,
      success: false,
      errors: []
    }
    
    try {
      // Test 1: Validation
      console.log('\n📋 Test 1: Validation Endpoint')
      console.log('-'.repeat(40))
      testResults.validation = await this.testValidation()
      
      if (!testResults.validation.success) {
        console.log('⚠️  Validation failed, skipping import test')
        return testResults
      }
      
      // Test 2: Import
      console.log('\n📋 Test 2: Import Endpoint')
      console.log('-'.repeat(40))
      testResults.import = await this.testImport()
      
      if (!testResults.import.success) {
        console.log('⚠️  Import failed, test suite incomplete')
        return testResults
      }
      
      // Test 3: Status monitoring (already done in testImport)
      console.log('\n📋 Test 3: Status Endpoint')
      console.log('-'.repeat(40))
      if (testResults.import.importId) {
        testResults.status = await this.testStatusEndpoint(testResults.import.importId)
      }
      
      testResults.success = true
      console.log('\n✅ All tests completed successfully!')
      
    } catch (error) {
      testResults.errors.push(error.message)
      console.error('\n❌ Test suite failed:', error.message)
    }
    
    return testResults
  }

  /**
   * Create test data variations
   */
  async testDataVariations() {
    console.log('🔄 Testing different data variations...')
    
    const variations = [
      {
        name: 'Minimal Valid Data',
        modifier: (data) => {
          data.entries = data.entries.slice(0, 2) // Only first 2 entries
          data.timeSlots = data.timeSlots.slice(0, 2) // Only first 2 time slots
          return data
        }
      },
      {
        name: 'Only Holidays',
        modifier: (data) => {
          data.entries = data.entries.filter(e => e.type === 'HOLIDAY')
          return data
        }
      },
      {
        name: 'Only Custom Events', 
        modifier: (data) => {
          data.entries = data.entries.filter(e => e.type === 'CUSTOM_EVENT')
          return data
        }
      },
      {
        name: 'Mixed Content',
        modifier: (data) => {
          // Keep all entry types but reduce count
          const subjects = data.entries.filter(e => e.type === 'SUBJECT').slice(0, 2)
          const customs = data.entries.filter(e => e.type === 'CUSTOM_EVENT').slice(0, 1)
          const holidays = data.entries.filter(e => e.type === 'HOLIDAY').slice(0, 1)
          data.entries = [...subjects, ...customs, ...holidays]
          return data
        }
      },
      {
        name: 'Different Batch Info',
        modifier: (data) => {
          data.batch.name = 'Test Engineering Batch 1'
          data.batch.department = 'Computer Science'
          data.batch.specialization = 'Artificial Intelligence'
          data.batch.semester = 'EVEN'
          data.metadata.importId = `engineering-test-${Date.now()}`
          return data
        }
      }
    ]
    
    for (const variation of variations) {
      console.log(`\n🧪 Testing variation: ${variation.name}`)
      console.log('-'.repeat(50))
      
      try {
        // Load and modify sample data
        const sampleData = this.loadSampleData()
        const modifiedData = variation.modifier(JSON.parse(JSON.stringify(sampleData)))
        
        // Test validation
        const response = await fetch(`${this.baseUrl}/api/timetable/validate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(modifiedData)
        })
        
        const result = await response.json()
        
        if (result.success) {
          console.log(`✅ ${variation.name}: Validation passed`)
          console.log(`   Entries: ${modifiedData.entries.length}`)
          console.log(`   Types: ${modifiedData.entries.map(e => e.type).join(', ')}`)
        } else {
          console.log(`❌ ${variation.name}: Validation failed`)
          console.log(`   Errors: ${result.errors.length}`)
        }
        
      } catch (error) {
        console.error(`❌ ${variation.name}: Test failed -`, error.message)
      }
    }
  }

  /**
   * Load sample data from file
   */
  loadSampleData(filename = 'sample-timetable-template.json') {
    const filePath = path.resolve(filename)
    
    if (!fs.existsSync(filePath)) {
      throw new Error(`Sample data file not found: ${filePath}`)
    }
    
    const data = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(data)
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Generate test report
   */
  generateTestReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      baseUrl: this.baseUrl,
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0
      },
      details: results
    }
    
    // Calculate summary
    if (results.validation) report.summary.totalTests++
    if (results.import) report.summary.totalTests++
    if (results.status) report.summary.totalTests++
    
    if (results.validation?.success) report.summary.passed++
    if (results.import?.success) report.summary.passed++
    if (results.status?.success !== false) report.summary.passed++ // Status might not have success field
    
    report.summary.failed = report.summary.totalTests - report.summary.passed
    
    // Write report to file
    const reportFile = `test-report-${Date.now()}.json`
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2))
    
    console.log(`📄 Test report saved: ${reportFile}`)
    return report
  }
}

// CLI Interface
function main() {
  const args = process.argv.slice(2)
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🧪 Timetable Import API Test Script

Usage:
  node test-timetable-import-api.js [options]

Options:
  --validate           Test validation endpoint only
  --import             Test import endpoint only
  --status <importId>  Test status endpoint with specific import ID
  --full-test          Run complete test suite (default)
  --variations         Test with different data variations
  --url <baseUrl>      API base URL (default: http://localhost:3000)
  --timeout <ms>       Request timeout in milliseconds (default: 30000)
  --json <file>        Use custom JSON file (default: sample-timetable-template.json)
  --report             Generate detailed test report
  --help, -h           Show this help

Examples:
  node test-timetable-import-api.js --validate
  node test-timetable-import-api.js --full-test --url http://localhost:3001
  node test-timetable-import-api.js --import --json custom-data.json
  node test-timetable-import-api.js --variations
`)
    process.exit(0)
  }
  
  // Parse options
  const baseUrl = args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3000'
  const timeout = args.includes('--timeout') ? parseInt(args[args.indexOf('--timeout') + 1]) : 30000
  const jsonFile = args.includes('--json') ? args[args.indexOf('--json') + 1] : 'sample-timetable-template.json'
  
  const tester = new TimetableImportAPITester(baseUrl, { timeout, verbose: true })
  
  // Run specific tests based on arguments
  if (args.includes('--validate')) {
    tester.testValidation(jsonFile)
      .then(() => console.log('✅ Validation test completed'))
      .catch(err => {
        console.error('❌ Validation test failed:', err.message)
        process.exit(1)
      })
  } else if (args.includes('--import')) {
    tester.testImport(jsonFile)
      .then(() => console.log('✅ Import test completed'))
      .catch(err => {
        console.error('❌ Import test failed:', err.message)
        process.exit(1)
      })
  } else if (args.includes('--status')) {
    const importId = args[args.indexOf('--status') + 1]
    if (!importId) {
      console.error('❌ --status requires import ID')
      process.exit(1)
    }
    tester.testStatusEndpoint(importId)
      .then(() => console.log('✅ Status test completed'))
      .catch(err => {
        console.error('❌ Status test failed:', err.message)
        process.exit(1)
      })
  } else if (args.includes('--variations')) {
    tester.testDataVariations()
      .then(() => console.log('✅ Variation tests completed'))
      .catch(err => {
        console.error('❌ Variation tests failed:', err.message)
        process.exit(1)
      })
  } else {
    // Run full test suite (default)
    tester.runFullTestSuite()
      .then(results => {
        if (args.includes('--report')) {
          tester.generateTestReport(results)
        }
        
        if (results.success) {
          console.log('🎉 All tests passed!')
          process.exit(0)
        } else {
          console.log('❌ Some tests failed!')
          process.exit(1)
        }
      })
      .catch(err => {
        console.error('❌ Test suite failed:', err.message)
        process.exit(1)
      })
  }
}

// Run if called directly
if (require.main === module) {
  main()
}

module.exports = TimetableImportAPITester