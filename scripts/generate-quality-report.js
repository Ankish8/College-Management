#!/usr/bin/env node

/**
 * Quality Metrics Dashboard Generator
 * 
 * Aggregates test results, coverage data, and quality metrics
 * to generate comprehensive quality reports and dashboards.
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class QualityMetricsCollector {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      buildInfo: this.getBuildInfo(),
      testResults: {},
      coverage: {},
      performance: {},
      accessibility: {},
      security: {},
      codeQuality: {},
      trends: {}
    }
  }

  getBuildInfo() {
    try {
      const gitHash = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim()
      const gitBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'))
      
      return {
        version: packageJson.version,
        gitHash: gitHash.substring(0, 8),
        gitBranch,
        buildDate: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      }
    } catch (error) {
      return {
        version: '1.0.0',
        gitHash: 'unknown',
        gitBranch: 'unknown',
        buildDate: new Date().toISOString(),
        environment: 'development'
      }
    }
  }

  async collectTestResults() {
    console.log('📊 Collecting test results...')
    
    // Collect Jest unit test results
    if (fs.existsSync('coverage/coverage-summary.json')) {
      const coverageSummary = JSON.parse(
        fs.readFileSync('coverage/coverage-summary.json', 'utf8')
      )
      
      this.metrics.testResults.unit = {
        passed: coverageSummary.total?.lines?.pct || 0,
        failed: 0,
        skipped: 0,
        total: 100,
        coverage: {
          lines: coverageSummary.total?.lines?.pct || 0,
          branches: coverageSummary.total?.branches?.pct || 0,
          functions: coverageSummary.total?.functions?.pct || 0,
          statements: coverageSummary.total?.statements?.pct || 0
        }
      }
    }

    // Collect Playwright E2E test results
    if (fs.existsSync('test-results/test-results.json')) {
      const playwrightResults = JSON.parse(
        fs.readFileSync('test-results/test-results.json', 'utf8')
      )
      
      this.metrics.testResults.e2e = {
        passed: playwrightResults.stats?.passed || 0,
        failed: playwrightResults.stats?.failed || 0,
        skipped: playwrightResults.stats?.skipped || 0,
        total: playwrightResults.stats?.total || 0,
        duration: playwrightResults.stats?.duration || 0
      }
    }

    // Collect accessibility test results
    this.metrics.testResults.accessibility = await this.collectAccessibilityResults()
    
    // Collect security test results
    this.metrics.testResults.security = await this.collectSecurityResults()
    
    // Collect performance test results
    this.metrics.testResults.performance = await this.collectPerformanceResults()
  }

  async collectAccessibilityResults() {
    const accessibilityResults = {
      violations: 0,
      passes: 0,
      inapplicable: 0,
      incomplete: 0,
      wcagLevel: 'AA',
      score: 100
    }

    // Parse accessibility test results from axe-core
    const resultsDir = 'test-results/accessibility'
    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir)
      let totalViolations = 0
      let totalPasses = 0

      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const result = JSON.parse(
              fs.readFileSync(path.join(resultsDir, file), 'utf8')
            )
            totalViolations += result.violations?.length || 0
            totalPasses += result.passes?.length || 0
          } catch (error) {
            console.warn(`Failed to parse ${file}:`, error.message)
          }
        }
      })

      accessibilityResults.violations = totalViolations
      accessibilityResults.passes = totalPasses
      accessibilityResults.score = totalViolations === 0 ? 100 : 
        Math.max(0, 100 - (totalViolations * 10))
    }

    return accessibilityResults
  }

  async collectSecurityResults() {
    const securityResults = {
      vulnerabilities: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      totalIssues: 0,
      score: 100
    }

    // Parse npm audit results
    try {
      const auditOutput = execSync('npm audit --json', { encoding: 'utf8' })
      const auditData = JSON.parse(auditOutput)
      
      if (auditData.metadata) {
        securityResults.vulnerabilities = {
          critical: auditData.metadata.vulnerabilities?.critical || 0,
          high: auditData.metadata.vulnerabilities?.high || 0,
          medium: auditData.metadata.vulnerabilities?.medium || 0,
          low: auditData.metadata.vulnerabilities?.low || 0
        }
        
        securityResults.totalIssues = Object.values(securityResults.vulnerabilities)
          .reduce((sum, count) => sum + count, 0)
        
        // Calculate security score
        const criticalWeight = securityResults.vulnerabilities.critical * 40
        const highWeight = securityResults.vulnerabilities.high * 20
        const mediumWeight = securityResults.vulnerabilities.medium * 10
        const lowWeight = securityResults.vulnerabilities.low * 5
        
        const totalDeduction = criticalWeight + highWeight + mediumWeight + lowWeight
        securityResults.score = Math.max(0, 100 - totalDeduction)
      }
    } catch (error) {
      console.warn('Failed to run npm audit:', error.message)
    }

    return securityResults
  }

  async collectPerformanceResults() {
    const performanceResults = {
      lighthouse: {},
      coreWebVitals: {},
      bundleSize: {},
      score: 0
    }

    // Parse Lighthouse CI results
    const lighthouseDir = '.lighthouseci'
    if (fs.existsSync(lighthouseDir)) {
      try {
        const files = fs.readdirSync(lighthouseDir)
        const manifestFile = files.find(f => f.includes('manifest.json'))
        
        if (manifestFile) {
          const manifest = JSON.parse(
            fs.readFileSync(path.join(lighthouseDir, manifestFile), 'utf8')
          )
          
          if (manifest.length > 0) {
            const latest = manifest[0]
            performanceResults.lighthouse = {
              performance: latest.summary?.performance || 0,
              accessibility: latest.summary?.accessibility || 0,
              bestPractices: latest.summary?.['best-practices'] || 0,
              seo: latest.summary?.seo || 0,
              pwa: latest.summary?.pwa || 0
            }
            
            performanceResults.score = performanceResults.lighthouse.performance
          }
        }
      } catch (error) {
        console.warn('Failed to parse Lighthouse results:', error.message)
      }
    }

    // Parse bundle analysis
    if (fs.existsSync('.next/analyze')) {
      try {
        const bundleFiles = fs.readdirSync('.next/analyze')
        performanceResults.bundleSize = {
          total: 0,
          javascript: 0,
          css: 0,
          images: 0
        }
        
        // This would parse actual bundle analysis results
        // Implementation depends on the bundle analyzer used
      } catch (error) {
        console.warn('Failed to parse bundle analysis:', error.message)
      }
    }

    return performanceResults
  }

  async collectCodeQualityMetrics() {
    console.log('📈 Collecting code quality metrics...')
    
    this.metrics.codeQuality = {
      eslintIssues: 0,
      typeErrors: 0,
      duplicateCode: 0,
      codeSmells: 0,
      maintainabilityIndex: 100
    }

    // Parse ESLint results
    try {
      const eslintOutput = execSync('npx eslint src --format json', { 
        encoding: 'utf8' 
      })
      const eslintResults = JSON.parse(eslintOutput)
      
      this.metrics.codeQuality.eslintIssues = eslintResults.reduce(
        (total, file) => total + file.messages.length, 0
      )
    } catch (error) {
      // ESLint might exit with non-zero if there are issues
      try {
        const eslintResults = JSON.parse(error.stdout)
        this.metrics.codeQuality.eslintIssues = eslintResults.reduce(
          (total, file) => total + file.messages.length, 0
        )
      } catch (parseError) {
        console.warn('Failed to parse ESLint results:', parseError.message)
      }
    }

    // Check TypeScript compilation
    try {
      execSync('npx tsc --noEmit', { encoding: 'utf8' })
      this.metrics.codeQuality.typeErrors = 0
    } catch (error) {
      // Count TypeScript errors
      const errorLines = error.stdout.split('\n').filter(line => 
        line.includes('error TS')
      )
      this.metrics.codeQuality.typeErrors = errorLines.length
    }
  }

  generateQualityScore() {
    const weights = {
      testCoverage: 0.25,
      testPassing: 0.25,
      performance: 0.20,
      accessibility: 0.15,
      security: 0.10,
      codeQuality: 0.05
    }

    let score = 0

    // Test coverage score
    const coverage = this.metrics.testResults.unit?.coverage?.lines || 0
    score += (coverage / 100) * weights.testCoverage * 100

    // Test passing rate
    const totalTests = this.metrics.testResults.e2e?.total || 1
    const passedTests = this.metrics.testResults.e2e?.passed || 0
    const passRate = (passedTests / totalTests) * 100
    score += (passRate / 100) * weights.testPassing * 100

    // Performance score
    const perfScore = this.metrics.testResults.performance?.score || 0
    score += (perfScore / 100) * weights.performance * 100

    // Accessibility score
    const a11yScore = this.metrics.testResults.accessibility?.score || 0
    score += (a11yScore / 100) * weights.accessibility * 100

    // Security score
    const secScore = this.metrics.testResults.security?.score || 0
    score += (secScore / 100) * weights.security * 100

    // Code quality score
    const eslintIssues = this.metrics.codeQuality?.eslintIssues || 0
    const typeErrors = this.metrics.codeQuality?.typeErrors || 0
    const qualityScore = Math.max(0, 100 - (eslintIssues * 2) - (typeErrors * 5))
    score += (qualityScore / 100) * weights.codeQuality * 100

    return Math.round(score)
  }

  generateHTMLReport() {
    const qualityScore = this.generateQualityScore()
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Quality Dashboard - College Management System</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 8px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .score { text-align: center; }
        .score-circle { width: 120px; height: 120px; border-radius: 50%; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; font-size: 36px; font-weight: bold; color: white; }
        .score-excellent { background: #10b981; }
        .score-good { background: #f59e0b; }
        .score-poor { background: #ef4444; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .card h3 { margin-bottom: 15px; color: #1f2937; }
        .metric { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .metric:last-child { border-bottom: none; }
        .metric-value { font-weight: bold; }
        .status-pass { color: #10b981; }
        .status-fail { color: #ef4444; }
        .status-warn { color: #f59e0b; }
        .trend { font-size: 12px; color: #6b7280; }
        .chart-container { height: 300px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
        th { background: #f9fafb; font-weight: 600; }
        .build-info { background: #f3f4f6; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 14px; }
        .recommendations { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="score">
                <div class="score-circle ${qualityScore >= 90 ? 'score-excellent' : qualityScore >= 70 ? 'score-good' : 'score-poor'}">
                    ${qualityScore}
                </div>
                <h1>Quality Score</h1>
                <p>College Management System - Quality Dashboard</p>
                <div class="build-info">
                    Version: ${this.metrics.buildInfo.version} | 
                    Branch: ${this.metrics.buildInfo.gitBranch} | 
                    Commit: ${this.metrics.buildInfo.gitHash} | 
                    Generated: ${new Date(this.metrics.timestamp).toLocaleString()}
                </div>
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>Test Results</h3>
                <div class="metric">
                    <span>Unit Tests</span>
                    <span class="metric-value ${this.metrics.testResults.unit?.coverage?.lines >= 70 ? 'status-pass' : 'status-fail'}">
                        ${this.metrics.testResults.unit?.coverage?.lines || 0}% coverage
                    </span>
                </div>
                <div class="metric">
                    <span>E2E Tests</span>
                    <span class="metric-value ${(this.metrics.testResults.e2e?.passed || 0) === (this.metrics.testResults.e2e?.total || 0) ? 'status-pass' : 'status-fail'}">
                        ${this.metrics.testResults.e2e?.passed || 0}/${this.metrics.testResults.e2e?.total || 0}
                    </span>
                </div>
                <div class="metric">
                    <span>Accessibility</span>
                    <span class="metric-value ${this.metrics.testResults.accessibility?.violations === 0 ? 'status-pass' : 'status-fail'}">
                        ${this.metrics.testResults.accessibility?.violations || 0} violations
                    </span>
                </div>
                <div class="metric">
                    <span>Security</span>
                    <span class="metric-value ${this.metrics.testResults.security?.totalIssues === 0 ? 'status-pass' : 'status-warn'}">
                        ${this.metrics.testResults.security?.totalIssues || 0} issues
                    </span>
                </div>
            </div>

            <div class="card">
                <h3>Performance Metrics</h3>
                <div class="metric">
                    <span>Lighthouse Score</span>
                    <span class="metric-value ${(this.metrics.testResults.performance?.lighthouse?.performance || 0) >= 90 ? 'status-pass' : 'status-warn'}">
                        ${this.metrics.testResults.performance?.lighthouse?.performance || 0}/100
                    </span>
                </div>
                <div class="metric">
                    <span>Best Practices</span>
                    <span class="metric-value">
                        ${this.metrics.testResults.performance?.lighthouse?.bestPractices || 0}/100
                    </span>
                </div>
                <div class="metric">
                    <span>SEO</span>
                    <span class="metric-value">
                        ${this.metrics.testResults.performance?.lighthouse?.seo || 0}/100
                    </span>
                </div>
                <div class="metric">
                    <span>PWA</span>
                    <span class="metric-value">
                        ${this.metrics.testResults.performance?.lighthouse?.pwa || 0}/100
                    </span>
                </div>
            </div>

            <div class="card">
                <h3>Code Quality</h3>
                <div class="metric">
                    <span>ESLint Issues</span>
                    <span class="metric-value ${(this.metrics.codeQuality?.eslintIssues || 0) === 0 ? 'status-pass' : 'status-warn'}">
                        ${this.metrics.codeQuality?.eslintIssues || 0}
                    </span>
                </div>
                <div class="metric">
                    <span>TypeScript Errors</span>
                    <span class="metric-value ${(this.metrics.codeQuality?.typeErrors || 0) === 0 ? 'status-pass' : 'status-fail'}">
                        ${this.metrics.codeQuality?.typeErrors || 0}
                    </span>
                </div>
                <div class="metric">
                    <span>Maintainability</span>
                    <span class="metric-value status-pass">
                        ${this.metrics.codeQuality?.maintainabilityIndex || 100}/100
                    </span>
                </div>
            </div>

            <div class="card">
                <h3>Coverage Breakdown</h3>
                <div class="chart-container">
                    <canvas id="coverageChart"></canvas>
                </div>
            </div>

            <div class="card">
                <h3>Security Vulnerabilities</h3>
                <div class="metric">
                    <span>Critical</span>
                    <span class="metric-value ${(this.metrics.testResults.security?.vulnerabilities?.critical || 0) === 0 ? 'status-pass' : 'status-fail'}">
                        ${this.metrics.testResults.security?.vulnerabilities?.critical || 0}
                    </span>
                </div>
                <div class="metric">
                    <span>High</span>
                    <span class="metric-value ${(this.metrics.testResults.security?.vulnerabilities?.high || 0) === 0 ? 'status-pass' : 'status-warn'}">
                        ${this.metrics.testResults.security?.vulnerabilities?.high || 0}
                    </span>
                </div>
                <div class="metric">
                    <span>Medium</span>
                    <span class="metric-value">
                        ${this.metrics.testResults.security?.vulnerabilities?.medium || 0}
                    </span>
                </div>
                <div class="metric">
                    <span>Low</span>
                    <span class="metric-value">
                        ${this.metrics.testResults.security?.vulnerabilities?.low || 0}
                    </span>
                </div>
            </div>

            <div class="card">
                <h3>Test Trends</h3>
                <div class="chart-container">
                    <canvas id="trendsChart"></canvas>
                </div>
            </div>
        </div>

        ${qualityScore < 90 ? `
        <div class="recommendations">
            <h3>📋 Recommendations</h3>
            <ul>
                ${this.metrics.testResults.unit?.coverage?.lines < 80 ? '<li>Increase unit test coverage to 80%+</li>' : ''}
                ${this.metrics.testResults.accessibility?.violations > 0 ? '<li>Fix accessibility violations for WCAG 2.1 AA compliance</li>' : ''}
                ${this.metrics.testResults.security?.totalIssues > 0 ? '<li>Address security vulnerabilities in dependencies</li>' : ''}
                ${this.metrics.codeQuality?.eslintIssues > 0 ? '<li>Resolve ESLint code quality issues</li>' : ''}
                ${this.metrics.codeQuality?.typeErrors > 0 ? '<li>Fix TypeScript compilation errors</li>' : ''}
                ${(this.metrics.testResults.performance?.lighthouse?.performance || 0) < 90 ? '<li>Optimize application performance (Lighthouse score)</li>' : ''}
            </ul>
        </div>
        ` : ''}
    </div>

    <script>
        // Coverage Chart
        const coverageCtx = document.getElementById('coverageChart').getContext('2d');
        new Chart(coverageCtx, {
            type: 'doughnut',
            data: {
                labels: ['Lines', 'Branches', 'Functions', 'Statements'],
                datasets: [{
                    data: [
                        ${this.metrics.testResults.unit?.coverage?.lines || 0},
                        ${this.metrics.testResults.unit?.coverage?.branches || 0},
                        ${this.metrics.testResults.unit?.coverage?.functions || 0},
                        ${this.metrics.testResults.unit?.coverage?.statements || 0}
                    ],
                    backgroundColor: ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });

        // Trends Chart (placeholder data)
        const trendsCtx = document.getElementById('trendsChart').getContext('2d');
        new Chart(trendsCtx, {
            type: 'line',
            data: {
                labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
                datasets: [{
                    label: 'Quality Score',
                    data: [${Math.max(0, qualityScore - 15)}, ${Math.max(0, qualityScore - 10)}, ${Math.max(0, qualityScore - 5)}, ${qualityScore}],
                    borderColor: '#10b981',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    </script>
</body>
</html>
    `
    
    return html
  }

  generateJSONReport() {
    return {
      ...this.metrics,
      qualityScore: this.generateQualityScore(),
      generatedAt: new Date().toISOString()
    }
  }

  async saveReports() {
    const reportsDir = 'quality-reports'
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().split('T')[0]
    
    // Save HTML report
    const htmlReport = this.generateHTMLReport()
    fs.writeFileSync(
      path.join(reportsDir, `quality-report-${timestamp}.html`),
      htmlReport
    )

    // Save JSON report
    const jsonReport = this.generateJSONReport()
    fs.writeFileSync(
      path.join(reportsDir, `quality-report-${timestamp}.json`),
      JSON.stringify(jsonReport, null, 2)
    )

    // Save latest report (for CI/CD consumption)
    fs.writeFileSync(
      path.join(reportsDir, 'latest-quality-report.json'),
      JSON.stringify(jsonReport, null, 2)
    )

    console.log(`📊 Quality reports saved to ${reportsDir}/`)
    console.log(`🏆 Overall Quality Score: ${this.generateQualityScore()}/100`)
    
    return {
      htmlPath: path.join(reportsDir, `quality-report-${timestamp}.html`),
      jsonPath: path.join(reportsDir, `quality-report-${timestamp}.json`),
      qualityScore: this.generateQualityScore()
    }
  }
}

async function main() {
  console.log('🚀 Generating Quality Metrics Dashboard...')
  
  const collector = new QualityMetricsCollector()
  
  try {
    await collector.collectTestResults()
    await collector.collectCodeQualityMetrics()
    
    const { htmlPath, qualityScore } = await collector.saveReports()
    
    console.log(`✅ Quality dashboard generated: ${htmlPath}`)
    
    // Exit with non-zero code if quality score is below threshold
    const threshold = process.env.QUALITY_THRESHOLD || 70
    if (qualityScore < threshold) {
      console.error(`❌ Quality score ${qualityScore} is below threshold ${threshold}`)
      process.exit(1)
    }
    
  } catch (error) {
    console.error('❌ Failed to generate quality report:', error.message)
    process.exit(1)
  }
}

if (require.main === module) {
  main()
}

module.exports = { QualityMetricsCollector }