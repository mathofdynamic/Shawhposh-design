import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const scanRoots = ['src', 'server'];
const ignoredPathParts = new Set(['node_modules', 'tests', '__tests__', 'migrations']);
const forbidden = [
  ['Admin fixture repository', /\b(?:useAdminRepository|AdminRepository|generateMockShippingLabel)\b/],
  ['demo clock or reset controls', /\b(?:demoClock|DEMO_CLOCK|Reset Demo Data|DemoModeNoticeBar|resetToFixtures|resetToDefaults)\b/i],
  ['synthetic review or social-proof data', /\b(?:ReviewScrollTicker|InstagramFeed|reviewsCount|reviewCount|ratingScore|originalPriceTomans|discountPercent|isPopular)\b/],
  ['placeholder stock imagery', /https:\/\/(?:picsum\.photos|images\.unsplash\.com)/i],
];
const businessStorageKey = /(?:cart|order|product|inventory|analytics|design|production|payment|support|shipping|review|staff|customer|admin_db|admin_repo)/i;

async function collect(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (ignoredPathParts.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(absolute));
    else if (/\.(?:ts|tsx|js|jsx|mjs)$/.test(entry.name) && !/\.test\.[^.]+$/.test(entry.name)) files.push(absolute);
  }
  return files;
}

const findings = [];
for (const scanRoot of scanRoots) {
  for (const absolute of await collect(path.join(root, scanRoot))) {
    const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
    const lines = (await readFile(absolute, 'utf8')).split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const [label, pattern] of forbidden) {
        if (pattern.test(line)) findings.push(`${relative}:${index + 1}: ${label}`);
        pattern.lastIndex = 0;
      }
    });
  }
}

const appPath = path.join(root, 'src/App.tsx');
const appSource = await readFile(appPath, 'utf8');
if (/localStorage\.setItem\(\s*['"]shahpoosh_cart['"]/.test(appSource)) {
  findings.push('src/App.tsx: legacy cart is written instead of being read once for migration');
}
if (/localStorage\.setItem\(\s*['"]SHAHPOOSH_ADMIN_DB_V1['"]/.test(appSource) || /localStorage\.setItem\(\s*['"]SHAWHPOSH_ADMIN_REPO_V1['"]/.test(appSource)) {
  findings.push('src/App.tsx: demo admin persistence is still written');
}

for (const absolute of await collect(path.join(root, 'src'))) {
  if (/\.test\.[^.]+$/.test(absolute)) continue;
  const relative = path.relative(root, absolute).replaceAll(path.sep, '/');
  const lines = (await readFile(absolute, 'utf8')).split(/\r?\n/);
  lines.forEach((line, index) => {
    const writes = line.matchAll(/localStorage\.setItem\(\s*(['"])([^'"]+)\1/g);
    for (const [, , key] of writes) {
      if (businessStorageKey.test(key) && key !== 'shahpoosh_cart_migration_key') {
        findings.push(`${relative}:${index + 1}: business localStorage write (${key})`);
      }
    }
  });
}

const distPath = path.join(root, 'dist');
try {
  const assets = await readdir(path.join(distPath, 'assets'), { withFileTypes: true });
  const scripts = assets.filter((entry) => entry.isFile() && entry.name.endsWith('.js'));
  const bundledForbidden = [
    'generateSyntheticDatabase',
    'resetToFixtures',
    'DEMO_CLOCK',
    'ReviewScrollTicker',
    'NotificationsPopover',
    'PaymentsPage',
    'RefundsPage',
    'SuppliersPage',
    'MediaAssetsPage',
    'WorkReportPage',
    'AdminStyleGallery',
    'https://picsum.photos',
    'https://images.unsplash.com',
  ];
  for (const script of scripts) {
    const relative = `dist/assets/${script.name}`;
    const source = await readFile(path.join(distPath, 'assets', script.name), 'utf8');
    for (const token of bundledForbidden) {
      if (source.includes(token)) findings.push(`${relative}: forbidden runtime bundle token (${token})`);
    }
  }
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

if (findings.length) {
  console.error(`Runtime data audit failed (${findings.length} finding${findings.length === 1 ? '' : 's'}):`);
  for (const finding of findings) console.error(`- ${finding}`);
  process.exitCode = 1;
} else {
  console.log('Runtime data audit passed: no admin fixtures, synthetic reviews/promotions, placeholder imagery URLs, business-data localStorage writes, or forbidden prototype modules in the production bundle.');
}
