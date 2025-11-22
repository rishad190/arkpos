# Deployment Guide

This document provides comprehensive instructions for deploying the BhaiyaPos application to staging and production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Process](#deployment-process)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedure](#rollback-procedure)
- [Monitoring and Alerts](#monitoring-and-alerts)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Tools

- Node.js 18+ and npm
- Firebase CLI (`npm install -g firebase-tools`)
- Git
- Access to Firebase project
- Hosting platform credentials (Vercel, Firebase Hosting, or custom server)

### Required Access

- Firebase project admin access
- Hosting platform deployment permissions
- Repository write access
- Environment variable management access

## Environment Configuration

### Environment Files

The application uses different environment configurations for each deployment stage:

- `.env.local` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

### Setting Up Environment Variables

1. **Copy the example file:**
   ```bash
   cp .env.staging.example .env.staging
   # or
   cp .env.production.example .env.production
   ```

2. **Configure Firebase credentials:**
   - Get credentials from Firebase Console > Project Settings
   - Update all `NEXT_PUBLIC_FIREBASE_*` variables

3. **Configure application settings:**
   ```env
   NEXT_PUBLIC_APP_ENV=production
   NEXT_PUBLIC_APP_VERSION=1.0.0
   NEXT_PUBLIC_ENABLE_PERFORMANCE_TRACKING=true
   NEXT_PUBLIC_PERFORMANCE_THRESHOLD_MS=2000
   NEXT_PUBLIC_SESSION_TIMEOUT_MS=1800000
   ```

4. **Configure feature flags:**
   ```env
   NEXT_PUBLIC_ENABLE_OFFLINE_MODE=true
   NEXT_PUBLIC_ENABLE_DEBUG_PANEL=false
   ```

5. **Configure logging:**
   ```env
   NEXT_PUBLIC_LOG_LEVEL=error
   NEXT_PUBLIC_ENABLE_CONSOLE_LOGS=false
   ```

6. **Configure security:**
   ```env
   NEXT_PUBLIC_ENABLE_SANITIZATION=true
   NEXT_PUBLIC_MAX_LOGIN_ATTEMPTS=5
   ```

### Environment-Specific Settings

#### Staging Environment
- Enable debug panel for testing
- More verbose logging (warn level)
- Console logs enabled
- Performance tracking enabled

#### Production Environment
- Debug panel disabled
- Minimal logging (error level only)
- Console logs disabled
- Performance tracking enabled
- Strict security settings

## Pre-Deployment Checklist

Before deploying to any environment, ensure all items are completed:

### Code Quality

- [ ] All tests pass (`npm run test:ci`)
- [ ] Code linting passes (`npm run lint`)
- [ ] Security checks pass (`node scripts/security-check.js`)
- [ ] No console.log statements in production code
- [ ] All TODO comments addressed or documented

### Testing

- [ ] Unit tests pass with >80% coverage
- [ ] Property-based tests pass
- [ ] Integration tests pass
- [ ] Performance tests meet benchmarks
- [ ] Manual testing completed for critical flows

### Documentation

- [ ] CHANGELOG updated with new features/fixes
- [ ] API documentation updated if needed
- [ ] README updated if setup changed
- [ ] Migration guide created if breaking changes

### Configuration

- [ ] Environment variables configured
- [ ] Firebase security rules updated
- [ ] Firebase indexes deployed
- [ ] Feature flags set appropriately
- [ ] Performance thresholds configured

### Security

- [ ] Dependencies updated and audited (`npm audit`)
- [ ] No exposed secrets or credentials
- [ ] Input sanitization enabled
- [ ] Authentication validation in place
- [ ] Session timeout configured

### Database

- [ ] Database backup created
- [ ] Migration scripts tested (if applicable)
- [ ] Rollback plan prepared
- [ ] Data integrity verified

## Deployment Process

### Automated Deployment (Recommended)

Use the deployment script for a streamlined process:

```bash
# Make script executable (first time only)
chmod +x scripts/deploy.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production
./scripts/deploy.sh production
```

The script performs the following steps:
1. Pre-deployment checks (Node version, Firebase CLI)
2. Runs test suite
3. Runs security checks
4. Lints code
5. Builds application
6. Creates Firebase backup (production only)
7. Deploys Firebase rules and indexes
8. Deploys application
9. Post-deployment verification
10. Creates deployment record

### Manual Deployment

If you need to deploy manually:

#### Step 1: Prepare Environment

```bash
# Ensure you're on the correct branch
git checkout main
git pull origin main

# Install dependencies
npm ci

# Copy environment file
cp .env.production .env.local
```

#### Step 2: Run Tests

```bash
# Run all tests
npm run test:ci

# Run security checks
node scripts/security-check.js

# Lint code
npm run lint
```

#### Step 3: Build Application

```bash
# Build Next.js application
npm run build

# Verify build output
ls -la .next
```

#### Step 4: Backup Database (Production Only)

```bash
# Create backup directory
mkdir -p backups/pre-deploy-$(date +%Y%m%d_%H%M%S)

# Export Firebase data
firebase database:get / --project your-project-id > backups/pre-deploy-$(date +%Y%m%d_%H%M%S)/database-backup.json
```

#### Step 5: Deploy Firebase Configuration

```bash
# Deploy database rules
firebase deploy --only database --project your-project-id

# Verify rules are active
firebase database:get /.settings/rules --project your-project-id
```

#### Step 6: Deploy Application

**For Vercel:**
```bash
# Install Vercel CLI if needed
npm install -g vercel

# Deploy to production
vercel --prod
```

**For Firebase Hosting:**
```bash
# Deploy to hosting
firebase deploy --only hosting --project your-project-id
```

**For Custom Server:**
```bash
# Copy files to server
scp -r .next package.json package-lock.json user@server:/path/to/app

# SSH to server
ssh user@server

# Install dependencies and start
cd /path/to/app
npm ci --production
pm2 restart bhaiyapos
```

#### Step 7: Verify Deployment

```bash
# Run health check
./scripts/health-check.sh production

# Check application logs
# (depends on hosting platform)
```

## Post-Deployment Verification

### Immediate Checks (0-5 minutes)

1. **Application Accessibility**
   ```bash
   curl -I https://your-app-url.com
   ```
   Expected: HTTP 200 response

2. **Authentication Flow**
   - Navigate to login page
   - Attempt login with test credentials
   - Verify successful authentication

3. **Critical Functionality**
   - Create a test customer
   - Create a test transaction
   - Verify data persistence

4. **Error Monitoring**
   - Check error logs for new errors
   - Verify no spike in error rate

### Short-term Monitoring (5-30 minutes)

1. **Performance Metrics**
   - Monitor response times
   - Check for slow operations
   - Verify performance thresholds

2. **User Activity**
   - Monitor active user sessions
   - Check for authentication issues
   - Verify offline queue processing

3. **Database Operations**
   - Monitor Firebase read/write counts
   - Check for failed operations
   - Verify data consistency

### Long-term Monitoring (30+ minutes)

1. **Error Rates**
   - Track error rate trends
   - Investigate any anomalies
   - Monitor error types

2. **Performance Trends**
   - Track average response times
   - Monitor slow operation frequency
   - Check memory/CPU usage

3. **User Feedback**
   - Monitor support channels
   - Track user-reported issues
   - Gather feedback on new features

## Rollback Procedure

### When to Rollback

Trigger a rollback if:
- Error rate increases >5%
- Performance degrades >20%
- Critical bug discovered
- User complaints spike
- Data integrity issues detected

### Automated Rollback

```bash
# Make script executable (first time only)
chmod +x scripts/rollback.sh

# Rollback staging
./scripts/rollback.sh staging

# Rollback production (requires confirmation)
./scripts/rollback.sh production
```

### Manual Rollback

#### Step 1: Identify Backup

```bash
# List available backups
ls -lt backups/ | grep "pre-deploy"

# Note the timestamp of the backup to restore
```

#### Step 2: Create Pre-Rollback Backup

```bash
# Create backup of current state
mkdir -p backups/pre-rollback-$(date +%Y%m%d_%H%M%S)
firebase database:get / --project your-project-id > backups/pre-rollback-$(date +%Y%m%d_%H%M%S)/database-backup.json
```

#### Step 3: Restore Database

```bash
# Restore from backup
firebase database:set / backups/pre-deploy-TIMESTAMP/database-backup.json --project your-project-id --confirm
```

#### Step 4: Rollback Application

**For Vercel:**
- Use Vercel dashboard to rollback to previous deployment
- Or use CLI: `vercel rollback`

**For Firebase Hosting:**
```bash
# List previous releases
firebase hosting:releases:list --project your-project-id

# Rollback to specific version
firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION TARGET_SITE_ID
```

**For Custom Server:**
```bash
# Deploy previous version
git checkout <previous-commit>
npm run build
# Copy to server and restart
```

#### Step 5: Verify Rollback

```bash
# Run health check
./scripts/health-check.sh production

# Verify critical functionality
# Monitor error logs
```

#### Step 6: Document Rollback

Create a rollback report documenting:
- Reason for rollback
- Timestamp of rollback
- Backup used
- Issues encountered
- Next steps for fix

## Monitoring and Alerts

### Application Monitoring

1. **Error Tracking**
   - Set up error tracking service (Sentry, LogRocket, etc.)
   - Configure error rate alerts
   - Monitor error types and frequencies

2. **Performance Monitoring**
   - Track response times
   - Monitor slow operations
   - Set up performance degradation alerts

3. **Uptime Monitoring**
   - Use uptime monitoring service (UptimeRobot, Pingdom, etc.)
   - Configure downtime alerts
   - Monitor from multiple locations

### Firebase Monitoring

1. **Database Usage**
   - Monitor read/write operations
   - Track bandwidth usage
   - Set up quota alerts

2. **Authentication**
   - Monitor authentication success/failure rates
   - Track active users
   - Set up suspicious activity alerts

3. **Security Rules**
   - Monitor rule violations
   - Track unauthorized access attempts
   - Review security logs regularly

### Infrastructure Monitoring

1. **Server Resources** (for self-hosted)
   - Monitor CPU usage
   - Track memory usage
   - Monitor disk space
   - Set up resource alerts

2. **Network**
   - Monitor network latency
   - Track bandwidth usage
   - Monitor SSL certificate expiry

### Alert Configuration

Set up alerts for:
- Application downtime (immediate)
- Error rate >5% (5 minutes)
- Response time >3s (10 minutes)
- Database quota >80% (1 hour)
- SSL certificate expiry <30 days (daily)
- Disk space >80% (1 hour)
- Memory usage >90% (15 minutes)

### Health Checks

Run automated health checks:

```bash
# Run health check
./scripts/health-check.sh production

# Schedule with cron (every 5 minutes)
*/5 * * * * /path/to/scripts/health-check.sh production >> /var/log/health-check.log 2>&1
```

## Troubleshooting

### Common Issues

#### Build Failures

**Symptom:** `npm run build` fails

**Solutions:**
1. Clear build cache: `rm -rf .next`
2. Reinstall dependencies: `rm -rf node_modules && npm ci`
3. Check for TypeScript/ESLint errors
4. Verify environment variables are set

#### Deployment Failures

**Symptom:** Deployment script fails

**Solutions:**
1. Verify Firebase CLI is authenticated: `firebase login`
2. Check project permissions
3. Verify environment file exists
4. Check network connectivity

#### Application Not Accessible

**Symptom:** HTTP 404 or 502 errors

**Solutions:**
1. Verify deployment completed successfully
2. Check DNS configuration
3. Verify SSL certificate is valid
4. Check server logs for errors

#### Firebase Connection Issues

**Symptom:** "Permission denied" or connection errors

**Solutions:**
1. Verify Firebase credentials in environment variables
2. Check Firebase security rules
3. Verify user authentication
4. Check Firebase project status

#### Performance Issues

**Symptom:** Slow response times

**Solutions:**
1. Check server resources (CPU, memory)
2. Review Firebase query efficiency
3. Check for memory leaks
4. Verify caching is working
5. Review recent code changes

#### Data Inconsistency

**Symptom:** Data doesn't match expected state

**Solutions:**
1. Check for failed atomic operations
2. Review recent transactions
3. Verify Firebase rules aren't blocking writes
4. Check for race conditions
5. Consider rollback if severe

### Getting Help

If issues persist:

1. **Check Logs**
   - Application logs
   - Firebase logs
   - Server logs (if self-hosted)

2. **Review Recent Changes**
   - Check git history
   - Review deployment logs
   - Compare with previous working version

3. **Contact Support**
   - Firebase support (for Firebase issues)
   - Hosting provider support
   - Development team

4. **Emergency Rollback**
   - If critical issue, rollback immediately
   - Investigate root cause after rollback
   - Plan fix and re-deployment

## Best Practices

### Deployment Schedule

- **Staging:** Deploy anytime during business hours
- **Production:** Deploy during low-traffic periods (e.g., late evening)
- **Hotfixes:** Deploy as soon as tested, regardless of schedule

### Communication

- Notify team before production deployments
- Post deployment status in team channel
- Document any issues encountered
- Share post-deployment metrics

### Version Control

- Tag releases in git: `git tag v1.0.0`
- Use semantic versioning
- Maintain CHANGELOG.md
- Keep deployment branch clean

### Testing

- Always test in staging first
- Run full test suite before deployment
- Perform manual testing of critical flows
- Have rollback plan ready

### Documentation

- Document all deployments
- Keep deployment logs
- Update runbooks as needed
- Share lessons learned

## Deployment Checklist

Use this checklist for every deployment:

### Pre-Deployment
- [ ] Code reviewed and approved
- [ ] All tests passing
- [ ] Security checks passing
- [ ] Environment variables configured
- [ ] Firebase rules updated
- [ ] Backup created (production)
- [ ] Team notified
- [ ] Rollback plan ready

### Deployment
- [ ] Build successful
- [ ] Firebase configuration deployed
- [ ] Application deployed
- [ ] Deployment logged

### Post-Deployment
- [ ] Application accessible
- [ ] Authentication working
- [ ] Critical functionality verified
- [ ] No error spikes
- [ ] Performance acceptable
- [ ] Team notified of completion
- [ ] Monitoring active

### If Issues Occur
- [ ] Issue documented
- [ ] Severity assessed
- [ ] Rollback decision made
- [ ] Team notified
- [ ] Root cause investigated
- [ ] Fix planned

## Conclusion

Following this deployment guide ensures safe, reliable deployments of the BhaiyaPos application. Always prioritize data integrity and user experience, and don't hesitate to rollback if issues arise.

For questions or issues, contact the development team or refer to other documentation in the `docs/` directory.
