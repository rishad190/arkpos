# Deployment Quick Start Guide

This guide provides a quick reference for deploying the BhaiyaPos application.

## Prerequisites

- Node.js 18+ installed
- Firebase CLI installed: `npm install -g firebase-tools`
- Firebase project access
- Environment files configured

## First-Time Setup

### 1. Configure Environment Files

```bash
# Copy example files
cp .env.staging.example .env.staging
cp .env.production.example .env.production

# Edit files with your Firebase credentials
# Use your favorite editor (nano, vim, code, etc.)
nano .env.staging
nano .env.production
```

### 2. Make Scripts Executable

```bash
chmod +x scripts/deploy.sh
chmod +x scripts/rollback.sh
chmod +x scripts/health-check.sh
```

### 3. Authenticate with Firebase

```bash
firebase login
```

## Quick Deployment

### Deploy to Staging

```bash
npm run deploy:staging
```

This will:
- Run all tests
- Run security checks
- Lint code
- Build application
- Deploy Firebase rules
- Deploy application

### Deploy to Production

```bash
npm run deploy:production
```

This will do everything staging does, plus:
- Create database backup
- Require explicit confirmation
- Create deployment record

## Quick Health Check

```bash
# Check staging
npm run health-check:staging

# Check production
npm run health-check:production
```

## Quick Rollback

```bash
# Rollback staging
npm run rollback:staging

# Rollback production (requires confirmation)
npm run rollback:production
```

## Common Commands

### Pre-Deployment Checks

```bash
# Run all pre-deployment checks
npm run predeploy

# Or run individually:
npm run test:ci          # Run tests
npm run lint             # Lint code
node scripts/security-check.js  # Security check
```

### Build

```bash
# Build for production
npm run build

# Build and analyze bundle
npm run build:analyze
```

### Testing

```bash
# Run all tests
npm test

# Run tests in CI mode
npm run test:ci

# Run with coverage
npm run test:coverage
```

## Troubleshooting

### Build Fails

```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm ci
npm run build
```

### Firebase Authentication Issues

```bash
# Re-authenticate
firebase logout
firebase login
```

### Deployment Script Fails

```bash
# Check script permissions
ls -la scripts/

# Make executable if needed
chmod +x scripts/*.sh
```

### Health Check Fails

1. Check application URL in script
2. Verify environment variables
3. Check Firebase connectivity
4. Review error logs

## Emergency Procedures

### Application Down

```bash
# 1. Check status
npm run health-check:production

# 2. Review logs
tail -n 100 dev.log

# 3. If needed, rollback
npm run rollback:production
```

### High Error Rate

```bash
# 1. Check health
npm run health-check:production

# 2. Monitor for 5 minutes
# 3. If not improving, rollback
npm run rollback:production
```

### Data Issues

```bash
# 1. Stop writes (if possible)
# 2. Create backup
firebase database:get / --project your-project-id > emergency-backup.json

# 3. Rollback
npm run rollback:production
```

## Deployment Checklist

Quick checklist for deployments:

**Before:**
- [ ] Tests pass
- [ ] Code reviewed
- [ ] Environment configured
- [ ] Team notified

**During:**
- [ ] Build succeeds
- [ ] Deployment completes
- [ ] Health check passes

**After:**
- [ ] Application accessible
- [ ] Critical features work
- [ ] No error spikes
- [ ] Team notified

## Getting Help

- **Full Documentation**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Rollback Plan**: See [ROLLBACK_PLAN.md](ROLLBACK_PLAN.md)
- **Checklist**: See [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md)

## Quick Reference

### URLs
- **Staging**: https://your-staging-url.com
- **Production**: https://your-production-url.com
- **Firebase Console**: https://console.firebase.google.com

### Scripts Location
- Deploy: `scripts/deploy.sh`
- Rollback: `scripts/rollback.sh`
- Health Check: `scripts/health-check.sh`

### Important Files
- Staging env: `.env.staging`
- Production env: `.env.production`
- Firebase rules: `database.rules.json`
- Firebase config: `firebase.json`

---

**Remember**: When in doubt, check the full documentation or ask for help. It's better to be safe than sorry!
