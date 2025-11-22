# Scripts Directory

This directory contains utility scripts for deployment, monitoring, and maintenance of the BhaiyaPos application.

## Deployment Scripts

### deploy.sh
**Purpose:** Automated deployment script for staging and production environments

**Usage:**
```bash
# Make executable (first time only)
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

**What it does:**
1. Validates environment and prerequisites
2. Runs test suite
3. Runs security checks
4. Lints code
5. Builds application
6. Creates Firebase backup (production only)
7. Deploys Firebase rules and indexes
8. Deploys application
9. Runs post-deployment verification
10. Creates deployment record

**Requirements:**
- Node.js 18+
- Firebase CLI
- Appropriate environment file (`.env.staging` or `.env.production`)

---

### rollback.sh
**Purpose:** Automated rollback script to revert to a previous stable state

**Usage:**
```bash
# Make executable (first time only)
chmod +x scripts/rollback.sh

# Rollback staging
./scripts/rollback.sh staging

# Rollback production (requires confirmation)
./scripts/rollback.sh production

# Rollback to specific backup
./scripts/rollback.sh production 20241121_143000
```

**What it does:**
1. Lists available backups
2. Verifies backup integrity
3. Creates pre-rollback backup
4. Restores Firebase data
5. Guides application rollback
6. Verifies rollback success
7. Creates rollback record

**Requirements:**
- Firebase CLI
- Backup directory with valid backups
- Production rollback requires typing "ROLLBACK" to confirm

---

### health-check.sh
**Purpose:** Comprehensive health check for application and infrastructure

**Usage:**
```bash
# Make executable (first time only)
chmod +x scripts/health-check.sh

# Check staging
./scripts/health-check.sh staging

# Check production
./scripts/health-check.sh production
```

**What it checks:**
1. Application accessibility (HTTP status)
2. Response time
3. Firebase connectivity
4. SSL certificate validity
5. Application process status
6. Disk space usage
7. Memory usage
8. Recent error logs

**Output:**
- Console output with pass/fail for each check
- Health check report in `health-checks/` directory
- Exit code 0 for pass, 1 for fail

**Automation:**
Can be scheduled with cron for regular monitoring:
```bash
# Check every 5 minutes
*/5 * * * * /path/to/scripts/health-check.sh production >> /var/log/health-check.log 2>&1
```

---

## Analysis Scripts

### analyze-bundle.js
**Purpose:** Analyze Next.js bundle size and composition

**Usage:**
```bash
# Analyze current build
node scripts/analyze-bundle.js

# Or use npm script
npm run analyze:bundle
```

**What it does:**
- Analyzes `.next` build output
- Reports bundle sizes
- Identifies large dependencies
- Suggests optimization opportunities

---

### performance-report.js
**Purpose:** Generate performance test reports

**Usage:**
```bash
# Generate performance report
node scripts/performance-report.js

# Or use npm script
npm run perf:report
```

**What it does:**
- Runs performance tests
- Generates detailed report
- Identifies performance bottlenecks
- Compares against benchmarks

---

### security-check.js
**Purpose:** Run comprehensive security checks

**Usage:**
```bash
# Run security checks
node scripts/security-check.js
```

**What it checks:**
- Dependency vulnerabilities (`npm audit`)
- Security test suite
- Firebase security rules
- Environment variable security
- Code security patterns

**Exit codes:**
- 0: All checks passed
- 1: Security issues found

---

## Script Permissions

### Making Scripts Executable

On Unix-like systems (Linux, macOS), shell scripts need execute permissions:

```bash
# Make all scripts executable
chmod +x scripts/*.sh

# Or individually
chmod +x scripts/deploy.sh
chmod +x scripts/rollback.sh
chmod +x scripts/health-check.sh
```

### Windows Users

On Windows, you can run bash scripts using:
- Git Bash (recommended)
- WSL (Windows Subsystem for Linux)
- Cygwin

Or use the npm scripts which handle cross-platform execution:
```bash
npm run deploy:staging
npm run rollback:production
npm run health-check:production
```

---

## Environment Variables

Scripts that interact with Firebase require environment variables to be set. These are loaded from:
- `.env.staging` for staging environment
- `.env.production` for production environment

Ensure these files exist and contain valid Firebase credentials before running deployment scripts.

---

## Logging

### Deployment Logs
Deployment records are saved in `deployments/` directory:
- Format: `deploy-{environment}-{timestamp}.log`
- Contains: deployment details, git info, status

### Rollback Logs
Rollback records are saved in `deployments/` directory:
- Format: `rollback-{environment}-{timestamp}.log`
- Contains: rollback details, backup info, status

### Health Check Logs
Health check reports are saved in `health-checks/` directory:
- Format: `health-{environment}-{timestamp}.log`
- Contains: check results, metrics, overall status

---

## Troubleshooting

### Script Won't Run

**Problem:** Permission denied
```bash
# Solution: Make executable
chmod +x scripts/script-name.sh
```

**Problem:** Command not found
```bash
# Solution: Run from project root
cd /path/to/project
./scripts/script-name.sh
```

### Firebase Authentication Issues

**Problem:** Firebase CLI not authenticated
```bash
# Solution: Login to Firebase
firebase login
```

**Problem:** Wrong Firebase project
```bash
# Solution: Select correct project
firebase use your-project-id
```

### Environment Issues

**Problem:** Environment file not found
```bash
# Solution: Copy example and configure
cp .env.production.example .env.production
# Edit with your credentials
```

**Problem:** Invalid environment variables
```bash
# Solution: Verify all required variables are set
cat .env.production
```

---

## Best Practices

### Before Running Scripts

1. **Review Changes**: Understand what the script will do
2. **Check Environment**: Ensure correct environment file exists
3. **Backup Data**: Especially before production operations
4. **Test First**: Run in staging before production
5. **Monitor**: Watch output and logs carefully

### During Script Execution

1. **Don't Interrupt**: Let scripts complete fully
2. **Read Prompts**: Pay attention to confirmation prompts
3. **Monitor Output**: Watch for errors or warnings
4. **Take Notes**: Document any issues encountered

### After Script Execution

1. **Verify Success**: Check exit code and output
2. **Review Logs**: Read generated log files
3. **Test Application**: Verify functionality
4. **Document Issues**: Note any problems for future reference

---

## Getting Help

### Documentation
- [DEPLOYMENT.md](../docs/DEPLOYMENT.md) - Full deployment guide
- [ROLLBACK_PLAN.md](../docs/ROLLBACK_PLAN.md) - Rollback procedures
- [DEPLOYMENT_QUICK_START.md](../docs/DEPLOYMENT_QUICK_START.md) - Quick reference

### Support
- Check script output for error messages
- Review log files in respective directories
- Consult documentation for detailed procedures
- Contact development team for assistance

---

## Contributing

When adding new scripts:

1. **Document**: Add description to this README
2. **Test**: Test thoroughly in staging
3. **Error Handling**: Include proper error handling
4. **Logging**: Log important actions and results
5. **Help Text**: Include usage instructions in script
6. **Exit Codes**: Use appropriate exit codes (0=success, 1=error)

---

**Last Updated:** 2024-11-21  
**Maintained By:** Development Team
