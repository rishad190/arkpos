#!/bin/bash

# Health Check Script for BhaiyaPos
# Usage: ./scripts/health-check.sh [staging|production]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-staging}
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}BhaiyaPos Health Check${NC}"
echo -e "${GREEN}Environment: ${ENVIRONMENT}${NC}"
echo -e "${GREEN}========================================${NC}"

# Validate environment
if [[ "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "production" ]]; then
    echo -e "${RED}Error: Invalid environment. Use 'staging' or 'production'${NC}"
    exit 1
fi

# Set application URL based on environment
if [[ "$ENVIRONMENT" == "production" ]]; then
    APP_URL="https://your-production-url.com"
else
    APP_URL="https://your-staging-url.com"
fi

HEALTH_PASSED=true

# Check 1: Application accessibility
echo -e "\n${YELLOW}Check 1: Application accessibility${NC}"
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${APP_URL}" || echo "000")

if [ "$HTTP_STATUS" -eq 200 ]; then
    echo -e "${GREEN}✓ Application is accessible (HTTP ${HTTP_STATUS})${NC}"
else
    echo -e "${RED}✗ Application returned HTTP ${HTTP_STATUS}${NC}"
    HEALTH_PASSED=false
fi

# Check 2: Response time
echo -e "\n${YELLOW}Check 2: Response time${NC}"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" "${APP_URL}" || echo "999")
RESPONSE_TIME_MS=$(echo "$RESPONSE_TIME * 1000" | bc)

if (( $(echo "$RESPONSE_TIME < 3" | bc -l) )); then
    echo -e "${GREEN}✓ Response time: ${RESPONSE_TIME_MS}ms${NC}"
else
    echo -e "${RED}✗ Response time too slow: ${RESPONSE_TIME_MS}ms${NC}"
    HEALTH_PASSED=false
fi

# Check 3: Firebase connectivity
echo -e "\n${YELLOW}Check 3: Firebase connectivity${NC}"

# Load environment variables
if [[ -f ".env.${ENVIRONMENT}" ]]; then
    source ".env.${ENVIRONMENT}"
fi

# Check Firebase Realtime Database
FIREBASE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${NEXT_PUBLIC_FIREBASE_DATABASE_URL}/.json" || echo "000")

if [ "$FIREBASE_STATUS" -eq 200 ] || [ "$FIREBASE_STATUS" -eq 401 ]; then
    echo -e "${GREEN}✓ Firebase Realtime Database is accessible${NC}"
else
    echo -e "${RED}✗ Firebase Realtime Database returned HTTP ${FIREBASE_STATUS}${NC}"
    HEALTH_PASSED=false
fi

# Check 4: SSL certificate
echo -e "\n${YELLOW}Check 4: SSL certificate${NC}"
SSL_EXPIRY=$(echo | openssl s_client -servername $(echo $APP_URL | sed 's|https://||') -connect $(echo $APP_URL | sed 's|https://||'):443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)

if [ -n "$SSL_EXPIRY" ]; then
    echo -e "${GREEN}✓ SSL certificate valid until: ${SSL_EXPIRY}${NC}"
    
    # Check if certificate expires in less than 30 days
    EXPIRY_EPOCH=$(date -d "$SSL_EXPIRY" +%s 2>/dev/null || date -j -f "%b %d %H:%M:%S %Y %Z" "$SSL_EXPIRY" +%s 2>/dev/null)
    CURRENT_EPOCH=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( ($EXPIRY_EPOCH - $CURRENT_EPOCH) / 86400 ))
    
    if [ $DAYS_UNTIL_EXPIRY -lt 30 ]; then
        echo -e "${YELLOW}⚠ SSL certificate expires in ${DAYS_UNTIL_EXPIRY} days${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Could not verify SSL certificate${NC}"
fi

# Check 5: Node.js process (for self-hosted)
echo -e "\n${YELLOW}Check 5: Application process${NC}"
if pgrep -f "next start" > /dev/null; then
    echo -e "${GREEN}✓ Next.js process is running${NC}"
else
    echo -e "${YELLOW}⚠ Next.js process not found (may be hosted externally)${NC}"
fi

# Check 6: Disk space (for self-hosted)
echo -e "\n${YELLOW}Check 6: Disk space${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')

if [ $DISK_USAGE -lt 80 ]; then
    echo -e "${GREEN}✓ Disk usage: ${DISK_USAGE}%${NC}"
elif [ $DISK_USAGE -lt 90 ]; then
    echo -e "${YELLOW}⚠ Disk usage: ${DISK_USAGE}% (warning)${NC}"
else
    echo -e "${RED}✗ Disk usage: ${DISK_USAGE}% (critical)${NC}"
    HEALTH_PASSED=false
fi

# Check 7: Memory usage (for self-hosted)
echo -e "\n${YELLOW}Check 7: Memory usage${NC}"
if command -v free &> /dev/null; then
    MEMORY_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3/$2 * 100}')
    
    if [ $MEMORY_USAGE -lt 80 ]; then
        echo -e "${GREEN}✓ Memory usage: ${MEMORY_USAGE}%${NC}"
    elif [ $MEMORY_USAGE -lt 90 ]; then
        echo -e "${YELLOW}⚠ Memory usage: ${MEMORY_USAGE}% (warning)${NC}"
    else
        echo -e "${RED}✗ Memory usage: ${MEMORY_USAGE}% (critical)${NC}"
        HEALTH_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ Memory check not available${NC}"
fi

# Check 8: Error logs
echo -e "\n${YELLOW}Check 8: Recent errors${NC}"
if [ -f "dev.log" ]; then
    ERROR_COUNT=$(grep -c "ERROR" dev.log 2>/dev/null || echo "0")
    
    if [ $ERROR_COUNT -eq 0 ]; then
        echo -e "${GREEN}✓ No errors in logs${NC}"
    elif [ $ERROR_COUNT -lt 10 ]; then
        echo -e "${YELLOW}⚠ ${ERROR_COUNT} errors found in logs${NC}"
    else
        echo -e "${RED}✗ ${ERROR_COUNT} errors found in logs${NC}"
        HEALTH_PASSED=false
    fi
else
    echo -e "${YELLOW}⚠ Log file not found${NC}"
fi

# Create health check report
REPORT_FILE="health-checks/health-${ENVIRONMENT}-${TIMESTAMP}.log"
mkdir -p health-checks

cat > "${REPORT_FILE}" << EOF
Health Check Report
===================
Environment: ${ENVIRONMENT}
Timestamp: ${TIMESTAMP}
Application URL: ${APP_URL}

Results:
--------
HTTP Status: ${HTTP_STATUS}
Response Time: ${RESPONSE_TIME_MS}ms
Firebase Status: ${FIREBASE_STATUS}
SSL Certificate: ${SSL_EXPIRY}
Disk Usage: ${DISK_USAGE}%
Memory Usage: ${MEMORY_USAGE}%
Error Count: ${ERROR_COUNT}

Overall Status: $([ "$HEALTH_PASSED" = true ] && echo "PASSED" || echo "FAILED")
EOF

# Summary
echo -e "\n${GREEN}========================================${NC}"
if [ "$HEALTH_PASSED" = true ]; then
    echo -e "${GREEN}Health check PASSED${NC}"
    echo -e "${GREEN}========================================${NC}"
    exit 0
else
    echo -e "${RED}Health check FAILED${NC}"
    echo -e "${RED}========================================${NC}"
    echo -e "${YELLOW}Review the issues above and take corrective action${NC}"
    exit 1
fi
