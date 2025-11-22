#!/usr/bin/env node

/**
 * Security Check Script
 * 
 * This script runs various security checks and reports the results.
 * Run with: node scripts/security-check.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log('\n' + '='.repeat(60), 'cyan');
  log(title, 'cyan');
  log('='.repeat(60), 'cyan');
}

function checkmark() {
  return '✓';
}

function crossmark() {
  return '✗';
}

// Check 1: Run security tests
function runSecurityTests() {
  section('Running Security Tests');
  
  try {
    log('Running authentication, sanitization, and session tests...', 'blue');
    
    const output = execSync(
      'npm test -- --testPathPatterns="(authValidation|sanitization|sessionManager|sessionTimeout|authenticationValidation)" --watchAll=false',
      { encoding: 'utf-8', stdio: 'pipe' }
    );
    
    // Parse test results
    const passedMatch = output.match(/Tests:\s+(\d+)\s+passed/);
    const totalMatch = output.match(/Test Suites:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
    
    if (passedMatch && totalMatch) {
      const testsPassed = parseInt(passedMatch[1]);
      const suitesPassed = parseInt(totalMatch[1]);
      const suitesTotal = parseInt(totalMatch[2]);
      
      if (suitesPassed === suitesTotal) {
        log(`${checkmark()} All security tests passed (${testsPassed} tests)`, 'green');
        return true;
      } else {
        log(`${crossmark()} Some security tests failed`, 'red');
        return false;
      }
    }
    
    log(`${checkmark()} Security tests completed`, 'green');
    return true;
  } catch (error) {
    log(`${crossmark()} Security tests failed`, 'red');
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
    return false;
  }
}

// Check 2: Run npm audit
function runNpmAudit() {
  section('Running npm audit');
  
  try {
    log('Checking for known vulnerabilities...', 'blue');
    
    const output = execSync('npm audit --json', { encoding: 'utf-8' });
    const audit = JSON.parse(output);
    
    const { vulnerabilities } = audit;
    const total = Object.keys(vulnerabilities || {}).length;
    
    if (total === 0) {
      log(`${checkmark()} No vulnerabilities found`, 'green');
      return true;
    } else {
      // Count by severity
      const severityCounts = {};
      Object.values(vulnerabilities).forEach(vuln => {
        const severity = vuln.severity;
        severityCounts[severity] = (severityCounts[severity] || 0) + 1;
      });
      
      log(`${crossmark()} Found ${total} vulnerabilities:`, 'yellow');
      Object.entries(severityCounts).forEach(([severity, count]) => {
        const color = severity === 'critical' || severity === 'high' ? 'red' : 'yellow';
        log(`  - ${severity}: ${count}`, color);
      });
      
      log('\nRun "npm audit fix" to fix automatically fixable issues', 'blue');
      return false;
    }
  } catch (error) {
    // npm audit returns non-zero exit code when vulnerabilities are found
    if (error.stdout) {
      try {
        const audit = JSON.parse(error.stdout.toString());
        const { vulnerabilities } = audit;
        const total = Object.keys(vulnerabilities || {}).length;
        
        if (total > 0) {
          const severityCounts = {};
          Object.values(vulnerabilities).forEach(vuln => {
            const severity = vuln.severity;
            severityCounts[severity] = (severityCounts[severity] || 0) + 1;
          });
          
          log(`${crossmark()} Found ${total} vulnerabilities:`, 'yellow');
          Object.entries(severityCounts).forEach(([severity, count]) => {
            const color = severity === 'critical' || severity === 'high' ? 'red' : 'yellow';
            log(`  - ${severity}: ${count}`, color);
          });
          
          log('\nRun "npm audit fix" to fix automatically fixable issues', 'blue');
          return false;
        }
      } catch (parseError) {
        log(`${crossmark()} Error parsing npm audit output`, 'red');
        return false;
      }
    }
    
    log(`${crossmark()} npm audit failed`, 'red');
    return false;
  }
}

// Check 3: Verify Firebase security rules exist
function checkFirebaseRules() {
  section('Checking Firebase Security Rules');
  
  try {
    log('Verifying database.rules.json exists...', 'blue');
    
    const rulesPath = path.join(process.cwd(), 'database.rules.json');
    
    if (!fs.existsSync(rulesPath)) {
      log(`${crossmark()} database.rules.json not found`, 'red');
      return false;
    }
    
    const rules = JSON.parse(fs.readFileSync(rulesPath, 'utf-8'));
    
    // Check if rules require authentication
    if (rules.rules && rules.rules['.read'] === 'auth != null' && rules.rules['.write'] === 'auth != null') {
      log(`${checkmark()} Firebase rules require authentication`, 'green');
    } else {
      log(`${crossmark()} Firebase rules may not require authentication`, 'yellow');
    }
    
    // Check for collection-specific rules
    const collections = ['customers', 'transactions', 'fabrics', 'suppliers', 'cashTransactions', 'expenses'];
    let allCollectionsSecured = true;
    
    collections.forEach(collection => {
      if (rules.rules[collection]) {
        log(`${checkmark()} ${collection} collection has security rules`, 'green');
      } else {
        log(`${crossmark()} ${collection} collection missing security rules`, 'yellow');
        allCollectionsSecured = false;
      }
    });
    
    return allCollectionsSecured;
  } catch (error) {
    log(`${crossmark()} Error checking Firebase rules: ${error.message}`, 'red');
    return false;
  }
}

// Check 4: Verify environment variables
function checkEnvironmentVariables() {
  section('Checking Environment Variables');
  
  try {
    log('Verifying .env.local exists...', 'blue');
    
    const envPath = path.join(process.cwd(), '.env.local');
    
    if (!fs.existsSync(envPath)) {
      log(`${crossmark()} .env.local not found`, 'red');
      log('  Create .env.local with Firebase configuration', 'yellow');
      return false;
    }
    
    log(`${checkmark()} .env.local exists`, 'green');
    
    // Check if .env.local is in .gitignore
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      // Check for .env.local or .env* pattern
      if (gitignore.includes('.env.local') || gitignore.includes('.env*')) {
        log(`${checkmark()} .env.local is in .gitignore`, 'green');
      } else {
        log(`${crossmark()} .env.local is NOT in .gitignore`, 'red');
        log('  Add .env.local to .gitignore to prevent committing secrets', 'yellow');
        return false;
      }
    }
    
    return true;
  } catch (error) {
    log(`${crossmark()} Error checking environment variables: ${error.message}`, 'red');
    return false;
  }
}

// Check 5: Verify security modules exist
function checkSecurityModules() {
  section('Checking Security Modules');
  
  const modules = [
    { path: 'src/lib/authValidation.js', name: 'Authentication Validation' },
    { path: 'src/lib/sanitization.js', name: 'Input Sanitization' },
    { path: 'src/lib/sessionManager.js', name: 'Session Management' },
    { path: 'src/lib/errors.js', name: 'Error Handling' },
  ];
  
  let allExist = true;
  
  modules.forEach(module => {
    const modulePath = path.join(process.cwd(), module.path);
    if (fs.existsSync(modulePath)) {
      log(`${checkmark()} ${module.name} module exists`, 'green');
    } else {
      log(`${crossmark()} ${module.name} module missing`, 'red');
      allExist = false;
    }
  });
  
  return allExist;
}

// Check 6: Check for common security issues in code
function checkCodeSecurity() {
  section('Checking Code for Security Issues');
  
  try {
    log('Scanning for potential security issues...', 'blue');
    
    // Check for dangerouslySetInnerHTML
    try {
      const dangerousHTML = execSync(
        'grep -r "dangerouslySetInnerHTML" src/ --include="*.js" --include="*.jsx" || exit 0',
        { encoding: 'utf-8' }
      );
      
      if (dangerousHTML.trim()) {
        log(`${crossmark()} Found dangerouslySetInnerHTML usage`, 'yellow');
        log('  Review these usages for XSS vulnerabilities', 'yellow');
      } else {
        log(`${checkmark()} No dangerouslySetInnerHTML usage found`, 'green');
      }
    } catch (error) {
      // grep returns non-zero if no matches, which is good
      log(`${checkmark()} No dangerouslySetInnerHTML usage found`, 'green');
    }
    
    // Check for eval usage
    try {
      const evalUsage = execSync(
        'grep -r "eval(" src/ --include="*.js" --include="*.jsx" || exit 0',
        { encoding: 'utf-8' }
      );
      
      if (evalUsage.trim()) {
        log(`${crossmark()} Found eval() usage`, 'red');
        log('  eval() is dangerous and should be avoided', 'red');
      } else {
        log(`${checkmark()} No eval() usage found`, 'green');
      }
    } catch (error) {
      log(`${checkmark()} No eval() usage found`, 'green');
    }
    
    return true;
  } catch (error) {
    log(`${crossmark()} Error scanning code: ${error.message}`, 'red');
    return false;
  }
}

// Main function
async function main() {
  log('\n' + '█'.repeat(60), 'cyan');
  log('  SECURITY CHECK REPORT', 'cyan');
  log('█'.repeat(60) + '\n', 'cyan');
  
  const results = {
    securityTests: runSecurityTests(),
    npmAudit: runNpmAudit(),
    firebaseRules: checkFirebaseRules(),
    environmentVariables: checkEnvironmentVariables(),
    securityModules: checkSecurityModules(),
    codeSecurity: checkCodeSecurity(),
  };
  
  // Summary
  section('Summary');
  
  const passed = Object.values(results).filter(r => r).length;
  const total = Object.keys(results).length;
  const percentage = Math.round((passed / total) * 100);
  
  log(`\nPassed: ${passed}/${total} checks (${percentage}%)`, 'blue');
  
  Object.entries(results).forEach(([check, passed]) => {
    const status = passed ? checkmark() : crossmark();
    const color = passed ? 'green' : 'red';
    const name = check.replace(/([A-Z])/g, ' $1').trim();
    log(`  ${status} ${name}`, color);
  });
  
  if (passed === total) {
    log('\n' + '█'.repeat(60), 'green');
    log('  ALL SECURITY CHECKS PASSED ✓', 'green');
    log('█'.repeat(60) + '\n', 'green');
    process.exit(0);
  } else {
    log('\n' + '█'.repeat(60), 'yellow');
    log('  SOME SECURITY CHECKS FAILED', 'yellow');
    log('█'.repeat(60) + '\n', 'yellow');
    log('Please address the issues above before deploying to production.', 'yellow');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  log(`\nFatal error: ${error.message}`, 'red');
  process.exit(1);
});
