#!/bin/bash

# Deployment Script for BhaiyaPos
# Usage: ./scripts/deploy.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="backups/pre-deploy-${TIMESTAMP}"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BhaiyaPos Deployment Script${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Check if required files exist
if [[ ! -f ".env.${ENVIRONMENT}" ]]; then
    echo -e "${RED}Error: .env.${ENVIRONMENT} file not found${NC}"
    exit 1
fi

# Step 1: Pre-deployment checks
echo -e "\n${YELLOW}Step 1: Running pre-deployment checks...${NC}"

# Check Node version
NODE_VERSION=$(node -v)
echo "Node version: ${NODE_VERSION}"

# Check npm version
NPM_VERSION=$(npm -v)
echo "npm version: ${NPM_VERSION}"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo -e "${RED}Error: Firebase CLI not found. Install with: npm install -g firebase-tools${NC}"
    exit 1
fi

# Step 2: Run tests
echo -e "\n${YELLOW}Step 2: Running test suite...${NC}"
npm run test:ci

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Tests failed. Deployment aborted.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ All tests passed${NC}"

# Step 3: Run security checks
echo -e "\n${YELLOW}Step 3: Running security checks...${NC}"
node scripts/security-check.js

if [ $? -ne 0 ]; then
    echo -e "${RED}Warning: Security checks found issues. Review before continuing.${NC}"
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 4: Lint code
echo -e "\n${YELLOW}Step 4: Linting code...${NC}"
npm run lint

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Linting failed. Fix errors before deploying.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Linting passed${NC}"

# Step 5: Build application
echo -e "\n${YELLOW}Step 5: Building application...${NC}"

# Copy environment file
cp ".env.${ENVIRONMENT}" .env.local

# Build Next.js application
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Build failed. Deployment aborted.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Build completed successfully${NC}"

# Step 6: Backup current Firebase data (production only)
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "\n${YELLOW}Step 6: Creating Firebase backup...${NC}"
    mkdir -p "${BACKUP_DIR}"
    
    # Export Firebase data
    firebase database:get / --project "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" > "${BACKUP_DIR}/database-backup.json"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup created at ${BACKUP_DIR}${NC}"
    else
        echo -e "${RED}Warning: Backup failed. Continue with caution.${NC}"
    fi
fi

# Step 7: Deploy Firebase rules and indexes
echo -e "\n${YELLOW}Step 7: Deploying Firebase configuration...${NC}"

# Deploy database rules
firebase deploy --only database --project "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Firebase rules deployment failed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Firebase rules deployed${NC}"

# Step 8: Deploy application
echo -e "\n${YELLOW}Step 8: Deploying application...${NC}"

if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${YELLOW}Deploying to PRODUCTION. This will affect live users.${NC}"
    read -p "Are you sure you want to continue? (yes/no) " -r
    echo
    if [[ ! $REPLY == "yes" ]]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
fi

# Deploy to hosting (adjust based on your hosting provider)
# For Vercel:
# vercel --prod

# For Firebase Hosting:
# firebase deploy --only hosting --project "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}"

# For custom server:
# npm run start

echo -e "${GREEN}✓ Application deployed${NC}"

# Step 9: Post-deployment verification
echo -e "\n${YELLOW}Step 9: Running post-deployment checks...${NC}"

# Wait for deployment to propagate
sleep 5

# Check if application is accessible (adjust URL based on environment)
if [[ "$ENVIRONMENT" == "production" ]]; then
    APP_URL="https://your-production-url.com"
else
    APP_URL="https://your-staging-url.com"
fi

# Uncomment to enable health check
# HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}")
# if [ "$HTTP_STATUS" -eq 200 ]; then
#     echo -e "${GREEN}✓ Application is accessible${NC}"
# else
#     echo -e "${RED}Warning: Application returned status ${HTTP_STATUS}${NC}"
# fi

# Step 10: Create deployment record
echo -e "\n${YELLOW}Step 10: Creating deployment record...${NC}"

DEPLOY_LOG="deployments/deploy-${ENVIRONMENT}-${TIMESTAMP}.log"
mkdir -p deployments

cat > "${DEPLOY_LOG}" << EOF
Deployment Record
=================
Environment: ${ENVIRONMENT}
Timestamp: ${TIMESTAMP}
Node Version: ${NODE_VERSION}
npm Version: ${NPM_VERSION}
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git rev-parse --abbrev-ref HEAD)
Deployed By: $(whoami)
Status: SUCCESS
EOF

echo -e "${GREEN}✓ Deployment record created: ${DEPLOY_LOG}${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Timestamp: ${TIMESTAMP}"
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "Backup: ${BACKUP_DIR}"
fi
echo -e "Log: ${DEPLOY_LOG}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Monitor application logs for errors"
echo -e "2. Verify critical functionality"
echo -e "3. Check performance metrics"
echo -e "4. Notify team of deployment"

exit 0
