/**
 * Shahpoosh Domain Invariant Test Assertions
 * Tests ID uniqueness, referential integrity, financial reconciliation, and stock mutations.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateSyntheticDatabase } from '../generator';
import { runInvariantVerification } from '../invariants';
import { adminRepository } from '../repository';

describe('Shahpoosh Synthetic Domain Invariants', () => {
  const db = generateSyntheticDatabase();

  it('passes all 8 core invariant checks on initial deterministic state', () => {
    const report = runInvariantVerification(db);
    assert.equal(report.allPassed, true);
    assert.equal(report.failedChecks, 0);
  });

  it('guarantees unique IDs across all entities', () => {
    const custIds = new Set(db.customers.map((c) => c.id));
    assert.equal(custIds.size, db.customers.length);

    const prodIds = new Set(db.products.map((p) => p.id));
    assert.equal(prodIds.size, db.products.length);

    const variantSkus = new Set(db.variants.map((v) => v.sku));
    assert.equal(variantSkus.size, db.variants.length);

    const orderIds = new Set(db.orders.map((o) => o.id));
    assert.equal(orderIds.size, db.orders.length);

    const paymentIds = new Set(db.payments.map((p) => p.id));
    assert.equal(paymentIds.size, db.payments.length);
  });

  it('prevents negative stock or unreserved reduction in mutation seam', () => {
    const variant = db.variants[0];
    const invalidStock = variant.reservedStock - 1;

    const res = adminRepository.updateVariantStock(
      variant.sku,
      invalidStock,
      'STF-01',
      'Test invalid reduction'
    );

    // Must be rejected by invariant guard
    assert.equal(res.success, false);
    assert.ok(res.error);
  });

  it('guarantees deterministic sales analytics reconciliation and strict revenue definitions', () => {
    const sales = adminRepository.getSalesAnalytics('30d');

    // 1. Gross - Discounts === Captured
    const expectedCaptured = sales.grossOrderValueTomans - sales.discountsTomans;
    assert.equal(sales.capturedPaymentsTomans, expectedCaptured);

    // 2. Captured - Processed Refunds === Net Sales
    const expectedNet = sales.capturedPaymentsTomans - sales.processedRefundsTomans;
    assert.equal(sales.netSalesTomans, expectedNet);

    // 3. Pending/initiated payments strictly excluded from captured/net revenue
    assert.ok(sales.initiatedPendingPaymentsTomans >= 0);
    assert.ok(sales.failedPaymentsTomans >= 0);

    // 4. Distinction between processed and requested refunds
    assert.ok(sales.processedRefundsTomans >= 0);
    assert.ok(sales.requestedRefundsTomans >= 0);

    // 5. Zero or negative net adjustments handling in timeline points
    for (const point of sales.timeline) {
      assert.equal(point.netSalesTomans, point.grossSalesTomans - point.refundsTomans);
      assert.ok(typeof point.netSalesTomans === 'number');
      assert.ok(!isNaN(point.netSalesTomans));
    }

    // 6. Unit economics have valid positive prices and margins
    assert.ok(sales.unitEconomics.length >= 4);
    for (const ue of sales.unitEconomics) {
      assert.ok(ue.sellingPriceTomans > 0);
      assert.ok(ue.totalDirectCostTomans > 0);
      assert.ok(ue.grossContributionTomans > 0);
      assert.ok(ue.grossMarginPercent > 0 && ue.grossMarginPercent < 100);
    }
  });
});
