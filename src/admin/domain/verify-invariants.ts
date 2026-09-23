/**
 * Shahpoosh Invariant Verification CLI Runner
 * Executes all 7 domain invariant suites against the synthetic fixtures.
 */

import { generateSyntheticDatabase } from './generator';
import { runInvariantVerification } from './invariants';

console.log('------------------------------------------------------------');
console.log('🏛️  SHAWHPOSH LUXURY STREETWEAR - ADMIN INVARIANT SUITE AUDIT');
console.log('------------------------------------------------------------\n');

const db = generateSyntheticDatabase();
const report = runInvariantVerification(db);

console.log(`⏱️ Audit Timestamp: ${report.timestampIso}`);
console.log(`📋 Total Checks: ${report.totalChecks} | ✅ Passed: ${report.passedChecks} | ❌ Failed: ${report.failedChecks}\n`);

report.checks.forEach((c, index) => {
  const icon = c.status === 'passed' ? '✅' : '❌';
  console.log(`${icon} [${index + 1}/${report.totalChecks}] [${c.category.toUpperCase()}] ${c.name}`);
  console.log(`   Message: ${c.message}`);
  if (c.details) {
    console.log(`   Details:`, JSON.stringify(c.details));
  }
  console.log('');
});

if (report.allPassed) {
  console.log('🎉 ALL DOMAIN INVARIANTS PASSED SUCCESSFULLY!');
  process.exit(0);
} else {
  console.error('💥 ONE OR MORE INVARIANT CHECKS FAILED!');
  process.exit(1);
}
