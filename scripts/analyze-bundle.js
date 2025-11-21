#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * Analyzes Next.js build output and checks against size budgets
 */

const fs = require('fs');
const path = require('path');

// Bundle size budgets (in KB)
const SIZE_BUDGETS = {
  TOTAL_JS: 500, // Total JavaScript
  FIRST_LOAD_JS: 300, // First load JS
  PAGE_JS: 100, // Individual page JS
  SHARED_CHUNKS: 200, // Shared chunks
};

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function formatSize(bytes) {
  return (bytes / 1024).toFixed(2) + ' KB';
}

function analyzeBundle() {
  console.log(`${colors.cyan}=== Bundle Size Analysis ===${colors.reset}\n`);

  const buildManifestPath = path.join(
    process.cwd(),
    '.next',
    'build-manifest.json'
  );

  if (!fs.existsSync(buildManifestPath)) {
    console.error(
      `${colors.red}Error: Build manifest not found. Run 'npm run build' first.${colors.reset}`
    );
    process.exit(1);
  }

  const buildManifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));

  // Analyze pages
  const pages = buildManifest.pages || {};
  const pageStats = [];
  let totalSize = 0;
  let violations = [];

  Object.entries(pages).forEach(([route, files]) => {
    let pageSize = 0;

    files.forEach((file) => {
      const filePath = path.join(process.cwd(), '.next', file);
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        pageSize += stats.size;
      }
    });

    totalSize += pageSize;
    const pageSizeKB = pageSize / 1024;

    pageStats.push({
      route,
      size: pageSize,
      sizeKB: pageSizeKB,
      files: files.length,
    });

    // Check against budget
    if (pageSizeKB > SIZE_BUDGETS.PAGE_JS) {
      violations.push({
        type: 'page',
        route,
        size: pageSizeKB,
        budget: SIZE_BUDGETS.PAGE_JS,
        excess: pageSizeKB - SIZE_BUDGETS.PAGE_JS,
      });
    }
  });

  // Sort by size
  pageStats.sort((a, b) => b.size - a.size);

  // Display results
  console.log(`${colors.blue}Page Sizes:${colors.reset}`);
  pageStats.slice(0, 10).forEach((page) => {
    const color =
      page.sizeKB > SIZE_BUDGETS.PAGE_JS ? colors.red : colors.green;
    console.log(
      `  ${color}${page.route.padEnd(40)} ${formatSize(page.size).padStart(
        12
      )}${colors.reset}`
    );
  });

  if (pageStats.length > 10) {
    console.log(`  ... and ${pageStats.length - 10} more pages\n`);
  } else {
    console.log();
  }

  // Total size
  const totalSizeKB = totalSize / 1024;
  const totalColor =
    totalSizeKB > SIZE_BUDGETS.TOTAL_JS ? colors.red : colors.green;
  console.log(
    `${colors.blue}Total Bundle Size:${colors.reset} ${totalColor}${formatSize(
      totalSize
    )}${colors.reset}`
  );
  console.log(
    `${colors.blue}Budget:${colors.reset} ${formatSize(
      SIZE_BUDGETS.TOTAL_JS * 1024
    )}\n`
  );

  // Violations
  if (violations.length > 0) {
    console.log(`${colors.red}=== Budget Violations ===${colors.reset}\n`);
    violations.forEach((v) => {
      console.log(`${colors.red}✗${colors.reset} ${v.route}`);
      console.log(
        `  Size: ${v.size.toFixed(2)} KB (Budget: ${v.budget} KB)`
      );
      console.log(`  Excess: ${v.excess.toFixed(2)} KB\n`);
    });
  } else {
    console.log(`${colors.green}✓ All pages within budget${colors.reset}\n`);
  }

  // Recommendations
  console.log(`${colors.cyan}=== Recommendations ===${colors.reset}\n`);

  if (totalSizeKB > SIZE_BUDGETS.TOTAL_JS) {
    console.log(`${colors.yellow}•${colors.reset} Total bundle size exceeds budget`);
    console.log('  - Consider code splitting');
    console.log('  - Use dynamic imports for large components');
    console.log('  - Remove unused dependencies\n');
  }

  const largePages = pageStats.filter(
    (p) => p.sizeKB > SIZE_BUDGETS.PAGE_JS
  );
  if (largePages.length > 0) {
    console.log(`${colors.yellow}•${colors.reset} ${largePages.length} pages exceed size budget`);
    console.log('  - Implement lazy loading');
    console.log('  - Split large components');
    console.log('  - Optimize images and assets\n');
  }

  // Check for duplicate dependencies
  console.log(`${colors.yellow}•${colors.reset} Check for duplicate dependencies:`);
  console.log('  Run: npm ls <package-name>');
  console.log('  Consider using npm dedupe\n');

  // Exit with error if violations exist
  if (violations.length > 0) {
    process.exit(1);
  }
}

// Run analysis
try {
  analyzeBundle();
} catch (error) {
  console.error(`${colors.red}Error analyzing bundle:${colors.reset}`, error);
  process.exit(1);
}
