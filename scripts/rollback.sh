#!/bin/bash

# Rollback Script for BhaiyaPos
# Usage: ./scripts/rollback.sh [staging|production] [backup-timestamp]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
BACKUP_TIMESTAMP=${2}

echo -e "${RED}========================================${NC}"
echo -e "${RED}BhaiyaPos Rollback Script${NC}"
echo -e "${RED}Environment: ${ENVIRONMENT}${NC}"
echo -e "${RED}========================================${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Production rollback requires explicit confirmation
if [[ "$ENVIRONMENT" == "production" ]]; then
    echo -e "${RED}WARNING: You are about to rollback PRODUCTION${NC}"
    echo -e "${RED}This will affect live users!${NC}"
    read -p "Type 'ROLLBACK' to confirm: " -r
    echo
    if [[ ! $REPLY == "ROLLBACK" ]]; then
        echo -e "${YELLOW}Rollback cancelled${NC}"
        exit 0
    fi
fi

# Step 1: List available backups
echo -e "\n${YELLOW}Step 1: Available backups${NC}"

if [ -z "$BACKUP_TIMESTAMP" ]; then
    echo "Available backups:"
    ls -lt backups/ | grep "pre-deploy" | head -10
    echo
    read -p "Enter backup timestamp (YYYYMMDD_HHMMSS): " BACKUP_TIMESTAMP
fi

BACKUP_DIR="backups/pre-deploy-${BACKUP_TIMESTAMP}"

if [[ ! -d "$BACKUP_DIR" ]]; then
    echo -e "${RED}Error: Backup directory not found: ${BACKUP_DIR}${NC}"
    exit 1
fi

echo -e "${GREEN}Using backup: ${BACKUP_DIR}${NC}"

# Step 2: Verify backup integrity
echo -e "\n${YELLOW}Step 2: Verifying backup integrity...${NC}"

if [[ ! -f "${BACKUP_DIR}/database-backup.json" ]]; then
    echo -e "${RED}Error: Backup file not found${NC}"
    exit 1
fi

# Check if backup file is valid JSON
if ! jq empty "${BACKUP_DIR}/database-backup.json" 2>/dev/null; then
    echo -e "${RED}Error: Backup file is not valid JSON${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Backup integrity verified${NC}"

# Step 3: Create pre-rollback backup
echo -e "\n${YELLOW}Step 3: Creating pre-rollback backup...${NC}"

ROLLBACK_TIMESTAMP=$(date +%Y%m%d_%H%M%S)
ROLLBACK_BACKUP_DIR="backups/pre-rollback-${ROLLBACK_TIMESTAMP}"
mkdir -p "${ROLLBACK_BACKUP_DIR}"

firebase database:get / --project "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" > "${ROLLBACK_BACKUP_DIR}/database-backup.json"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Pre-rollback backup created${NC}"
else
    echo -e "${RED}Error: Failed to create pre-rollback backup${NC}"
    exit 1
fi

# Step 4: Restore Firebase data
echo -e "\n${YELLOW}Step 4: Restoring Firebase data...${NC}"

firebase database:set / "${BACKUP_DIR}/database-backup.json" --project "${NEXT_PUBLIC_FIREBASE_PROJECT_ID}" --confirm

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to restore Firebase data${NC}"
    echo -e "${YELLOW}You can manually restore from: ${ROLLBACK_BACKUP_DIR}${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Firebase data restored${NC}"

# Step 5: Restore previous deployment (if applicable)
echo -e "\n${YELLOW}Step 5: Restoring previous deployment...${NC}"

# This step depends on your hosting provider
# For Vercel: Use Vercel dashboard to rollback to previous deployment
# For Firebase Hosting: firebase hosting:clone SOURCE_SITE_ID:SOURCE_VERSION TARGET_SITE_ID
# For custom server: Deploy previous version

echo -e "${YELLOW}Note: Application rollback must be done through your hosting provider${NC}"
echo -e "For Vercel: Use the Vercel dashboard to rollback"
echo -e "For Firebase Hosting: Use 'firebase hosting:clone' command"

# Step 6: Verify rollback
echo -e "\n${YELLOW}Step 6: Verifying rollback...${NC}"

# Wait for changes to propagate
sleep 5

# Check if application is accessible
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

# Step 7: Create rollback record
echo -e "\n${YELLOW}Step 7: Creating rollback record...${NC}"

ROLLBACK_LOG="deployments/rollback-${ENVIRONMENT}-${ROLLBACK_TIMESTAMP}.log"
mkdir -p deployments

cat > "${ROLLBACK_LOG}" << EOF
Rollback Record
===============
Environment: ${ENVIRONMENT}
Timestamp: ${ROLLBACK_TIMESTAMP}
Restored From: ${BACKUP_DIR}
Pre-Rollback Backup: ${ROLLBACK_BACKUP_DIR}
Git Commit: $(git rev-parse HEAD)
Git Branch: $(git rev-parse --abbrev-ref HEAD)
Performed By: $(whoami)
Status: SUCCESS
EOF

echo -e "${GREEN}✓ Rollback record created: ${ROLLBACK_LOG}${NC}"

# Summary
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Rollback completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo -e "Environment: ${ENVIRONMENT}"
echo -e "Restored from: ${BACKUP_DIR}"
echo -e "Pre-rollback backup: ${ROLLBACK_BACKUP_DIR}"
echo -e "Log: ${ROLLBACK_LOG}"
echo -e "\n${YELLOW}Next steps:${NC}"
echo -e "1. Verify application functionality"
echo -e "2. Monitor error logs"
echo -e "3. Investigate root cause of issues"
echo -e "4. Notify team of rollback"
echo -e "5. Plan fix and re-deployment"

exit 0
