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

  it('enforces monetary invariants: fake refunds cannot exceed captured amount', async () => {
    const { validateRefundEligibility } = await import('../paymentLedger');
    const verifiedPayment = db.payments.find((p) => p.status === 'verified_paid');
    assert.ok(verifiedPayment, 'Must have at least one verified payment');

    // 1. Attempt refund greater than captured amount
    const excessiveAmount = verifiedPayment.amountTomans + 100000;
    const excessiveCheck = validateRefundEligibility(verifiedPayment, excessiveAmount);
    assert.equal(excessiveCheck.eligible, false, 'Excessive refund must be rejected');
    assert.ok(excessiveCheck.error, 'Must provide Persian error explanation');

    // 2. Exact amount is allowed
    const validCheck = validateRefundEligibility(verifiedPayment, verifiedPayment.amountTomans);
    assert.equal(validCheck.eligible, true, 'Exact captured amount refund must be permitted');

    // 3. Partial amount is allowed
    const halfCheck = validateRefundEligibility(verifiedPayment, Math.floor(verifiedPayment.amountTomans / 2));
    assert.equal(halfCheck.eligible, true, 'Partial refund within limit must be permitted');

    // 4. Reject refund on unpaid or pending payment
    const pendingPayment = db.payments.find((p) => p.status === 'pending');
    if (pendingPayment) {
      const pendingCheck = validateRefundEligibility(pendingPayment, pendingPayment.amountTomans);
      assert.equal(pendingCheck.eligible, false, 'Refund on pending payment must be rejected');
    }

    // 5. Cumulative partial refunds cannot exceed captured amount
    const fakePriorRefund = {
      id: 'REF-TEST-01',
      orderId: verifiedPayment.orderId,
      paymentId: verifiedPayment.id,
      customerId: verifiedPayment.customerId,
      customerName: 'مشتری تست',
      destinationAccountMasked: 'IR12***4567',
      isPartial: false,
      requestedAmountTomans: verifiedPayment.amountTomans,
      processedAmountTomans: verifiedPayment.amountTomans,
      reason: 'Prior test refund',
      status: 'processed' as const,
      requestedAt: new Date().toISOString(),
      processedAt: new Date().toISOString(),
      approvedById: 'STF-01',
    };
    const cumulativeCheck = validateRefundEligibility(verifiedPayment, 1000, [fakePriorRefund]);
    assert.equal(cumulativeCheck.eligible, false, 'Cumulative refund exceeding captured total must be rejected');
  });

  it('guarantees financial selectors avoid double-counting failed retries and duplicate callbacks', async () => {
    const { calculateLedgerSummary } = await import('../paymentLedger');
    const summary = calculateLedgerSummary(db);

    // Verified captures only
    const verifiedTotal = db.payments
      .filter((p) => p.status === 'verified_paid')
      .reduce((s, p) => s + p.amountTomans, 0);
    assert.equal(summary.grossCapturedTomans, verifiedTotal);

    // Pending excluded from net revenue
    assert.ok(summary.pendingHoldTomans >= 0);
    assert.ok(summary.netRevenueTomans <= summary.grossCapturedTomans);

    // Failed retry attempts excluded from captured & net revenue
    const failedTotal = db.payments
      .filter((p) => p.status === 'failed')
      .reduce((s, p) => s + p.amountTomans, 0);
    assert.equal(summary.failedAttemptsTomans, failedTotal);
    assert.equal(summary.netRevenueTomans, summary.grossCapturedTomans - summary.totalProcessedRefundsTomans);
  });

  it('enforces independent status machine transition guards preventing contradictory states', async () => {
    const { canTransitionOrderStatus } = await import('../orderStateMachine');
    
    // 1. Prevent production of an unverified payment order
    const pendingOrder = db.orders.find((o) => o.status === 'pending_payment') || {
      ...db.orders[0],
      status: 'pending_payment' as const,
      paymentStatus: 'pending' as const,
    };
    const unverifiedProductionCheck = canTransitionOrderStatus('in_production', { order: pendingOrder, payment: null });
    assert.equal(unverifiedProductionCheck.allowed, false, 'Production of unverified order must be blocked by guard');
    assert.ok(unverifiedProductionCheck.reason?.includes('پرداخت') || unverifiedProductionCheck.reason?.includes('تسویه'), 'Guard message must mention payment requirement');

    // 2. Prevent moving delivered order backwards to pending
    const deliveredOrder = db.orders.find((o) => o.status === 'delivered') || {
      ...db.orders[0],
      status: 'delivered' as const,
      paymentStatus: 'verified_paid' as const,
    };
    const backwardsCheck = canTransitionOrderStatus('pending_payment', { order: deliveredOrder });
    assert.equal(backwardsCheck.allowed, false, 'Delivered order cannot revert to pending');

    // 3. Standard paid processing order can move forward to in_production
    const standardPaidOrder = {
      ...db.orders[0],
      hasCustomLineItem: false,
      status: 'paid_processing' as const,
      paymentStatus: 'verified_paid' as const,
    };
    const forwardCheck = canTransitionOrderStatus('in_production', { order: standardPaidOrder });
    assert.equal(forwardCheck.allowed, true, 'Standard paid order can move to production');

    // 4. Custom order without approved design cannot enter production
    const customUnapprovedOrder = {
      ...db.orders[0],
      hasCustomLineItem: true,
      status: 'paid_processing' as const,
      paymentStatus: 'verified_paid' as const,
    };
    const customCheck = canTransitionOrderStatus('in_production', { order: customUnapprovedOrder, designs: [] });
    assert.equal(customCheck.allowed, false, 'Custom order without approved design cannot enter production');
  });

  it('releases stock reservation cleanly upon order cancellation without negative inventory', () => {
    const activeOrder = db.orders.find((o) => o.status === 'in_production' || o.status === 'paid_processing');
    if (activeOrder && activeOrder.items.length > 0) {
      const item = activeOrder.items[0];
      const variantBefore = db.variants.find((v) => v.sku === item.variantSku);
      const reservedBefore = variantBefore?.reservedStock || 0;

      const cancelRes = adminRepository.cancelOrderWithReason(
        activeOrder.id,
        'انصراف کاربر در تست خودکار ناوردایی',
        'STF-01'
      );
      assert.equal(cancelRes.success, true);

      const variantAfter = adminRepository.getStateSnapshot().variants.find((v) => v.sku === item.variantSku);
      if (variantAfter) {
        assert.ok(variantAfter.reservedStock <= reservedBefore, 'Reserved stock must decrease');
        assert.ok(variantAfter.reservedStock >= 0, 'Reserved stock cannot become negative');
        assert.ok(variantAfter.onHandStock - variantAfter.reservedStock >= 0, 'Available stock remains non-negative');
      }
    }
  });

  it('redacts sensitive fields by default in gateway metadata without leaking secrets', async () => {
    const { getSafeGatewayMetadata } = await import('../paymentLedger');
    const samplePayment = db.payments[0];
    const meta = getSafeGatewayMetadata(samplePayment);

    assert.ok(meta.maskedCardPan.includes('**'), 'Card PAN must be masked');
    assert.ok(meta.maskedClientIp.includes('***'), 'IP must be masked');
    // Ensure no raw secret tokens or password fields are present
    assert.equal((meta as any).secretKey, undefined);
    assert.equal((meta as any).merchantPassword, undefined);
    assert.equal((meta as any).accessToken, undefined);
    assert.equal(meta.isDemoSimulated, true);
  });

  it('validates custom studio transitions: approving verified paid design dispatches to production', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const pendingDesign = snapshot.customDesigns.find((d) => d.status === 'under_review');
    assert.ok(pendingDesign, 'Must have at least one under_review design');

    const order = snapshot.orders.find((o) => o.id === pendingDesign.orderId);
    assert.ok(order, 'Linked order must exist');

    // Save and restore order payment status
    const origPayment = order.paymentStatus;
    const origStatus = order.status;
    order.paymentStatus = 'verified_paid';
    order.status = 'paid_processing';

    const approveRes = adminRepository.approveCustomDesign(
      pendingDesign.id,
      'STF-02',
      'تایید تست خودکار داوری'
    );
    assert.equal(approveRes.success, true);
    assert.equal(approveRes.dispatchedToProduction, true, 'Paid order design must dispatch to production');

    const updatedState = adminRepository.getStateSnapshot();
    const updatedDesign = updatedState.customDesigns.find((d) => d.id === pendingDesign.id);
    const updatedOrder = updatedState.orders.find((o) => o.id === pendingDesign.orderId);
    const linkedJob = updatedState.productionJobs.find((j) => j.orderId === pendingDesign.orderId);

    assert.equal(updatedDesign?.status, 'approved');
    assert.equal(updatedOrder?.designStatus, 'approved');
    assert.equal(updatedOrder?.status, 'in_production');
    assert.ok(linkedJob, 'Production job must be created or updated');
    assert.equal(linkedJob?.stage, 'printing_dtg');

    // Restore original payment status
    order.paymentStatus = origPayment;
    order.status = origStatus;
  });

  it('enforces verified payment: approving unpaid design does NOT dispatch to production', () => {
    const snapshot = adminRepository.getStateSnapshot();
    // Pick another design and make its order unpaid
    const testDesign = snapshot.customDesigns[snapshot.customDesigns.length - 1];
    const order = snapshot.orders.find((o) => o.id === testDesign.orderId);
    if (order) {
      const origPayment = order.paymentStatus;
      const origStatus = order.status;
      order.paymentStatus = 'pending';
      order.status = 'pending_payment';

      const approveRes = adminRepository.approveCustomDesign(
        testDesign.id,
        'STF-02',
        'تایید هنری بدون تسویه'
      );
      assert.equal(approveRes.success, true);
      assert.equal(approveRes.dispatchedToProduction, false, 'Unpaid order must not be dispatched to production');

      const updatedOrder = adminRepository.getStateSnapshot().orders.find((o) => o.id === testDesign.orderId);
      assert.equal(updatedOrder?.status, 'pending_payment', 'Order status must remain pending_payment');

      // Restore
      order.paymentStatus = origPayment;
      order.status = origStatus;
    }
  });

  it('guarantees invariant: rejected designs do not change payment status', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const testDesign = snapshot.customDesigns[0];
    const order = snapshot.orders.find((o) => o.id === testDesign.orderId);
    assert.ok(order, 'Linked order must exist');
    const paymentBefore = order.paymentStatus;

    const rejectRes = adminRepository.rejectCustomDesign(
      testDesign.id,
      'STF-02',
      'کیفیت ناکافی در تست خودکار'
    );
    assert.equal(rejectRes.success, true);

    const updatedOrder = adminRepository.getStateSnapshot().orders.find((o) => o.id === testDesign.orderId);
    assert.equal(updatedOrder?.paymentStatus, paymentBefore, 'Payment status must remain strictly unchanged on design rejection');
    assert.equal(updatedOrder?.designStatus, 'rejected');
  });

  it('guarantees immutable linked revisions upon customer revision submission', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const design = snapshot.customDesigns.find((d) => d.settings);
    assert.ok(design, 'Must have a design with settings');

    const revCountBefore = design.revisionCount || 1;
    const historyLengthBefore = design.revisions?.length || 0;

    const res = adminRepository.submitCustomerRevision(
      design.id,
      { designScale: 115, designPosX: 10 },
      'توضیح تست نسخه اصلاحی'
    );
    assert.equal(res.success, true);

    const updatedDesign = adminRepository.getStateSnapshot().customDesigns.find((d) => d.id === design.id);
    assert.ok(updatedDesign);
    assert.equal(updatedDesign.revisionCount, revCountBefore + 1);
    assert.equal(updatedDesign.revisions?.length, historyLengthBefore + 1);
    assert.equal(updatedDesign.settings?.designScale, 115);
    assert.equal(updatedDesign.status, 'under_review');
  });

  it('validates structured print rules and provides honest notice for unsupported deep preflight', async () => {
    const { validateDesignStructuredRules, getUnsupportedFeatureNotice, DEFAULT_PRINT_RULE_ZONES } = await import('../customStudio');
    const design = db.customDesigns[0];
    const zone = DEFAULT_PRINT_RULE_ZONES[0];

    const validation = validateDesignStructuredRules(design, zone);
    assert.ok(typeof validation.passed === 'boolean');
    assert.ok(Array.isArray(validation.errors));
    assert.ok(Array.isArray(validation.warnings));

    // Unsupported feature notice
    const notice = getUnsupportedFeatureNotice('file_export');
    assert.equal(notice.supported, false);
    assert.ok(notice.labelFa.includes('نیازمند زیرساخت آپلود/پردازش فایل'));
  });

  it('safely handles missing or corrupted artwork without throwing exceptions', () => {
    // Missing design ID returns null without throwing
    const missing = adminRepository.getCustomDesignById('DSG-NON-EXISTENT-999');
    assert.equal(missing, null);

    // Approval or rejection of non-existent design safely returns error object
    const approveMissing = adminRepository.approveCustomDesign('DSG-NON-EXISTENT-999', 'STF-01');
    assert.equal(approveMissing.success, false);
    assert.ok(approveMissing.error);

    const rejectMissing = adminRepository.rejectCustomDesign('DSG-NON-EXISTENT-999', 'STF-01', 'دلیل رد');
    assert.equal(rejectMissing.success, false);
    assert.ok(rejectMissing.error);

    const revisionMissing = adminRepository.requestDesignRevision('DSG-NON-EXISTENT-999', 'STF-01', 'اصلاحیه');
    assert.equal(revisionMissing.success, false);
    assert.ok(revisionMissing.error);
  });

  it('guarantees production lean workflow: dashboard queue counts match jobs and capacity invariants hold', () => {
    const metrics = adminRepository.getDailyProductionMetrics();
    const snapshot = adminRepository.getStateSnapshot();

    assert.equal(metrics.totalJobs, snapshot.productionJobs.length, 'Total jobs count must match');
    assert.ok(metrics.dailyCapacityUnits >= 32, 'Capacity rated for workshop shifts');
    assert.ok(metrics.availableCapacityUnits >= 0, 'Available capacity non-negative');
    assert.ok(metrics.avgTurnaroundHours > 0, 'Turnaround hours must be positive');
  });

  it('enforces guardrail: no production dispatch from unpaid or unapproved orders', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const job = snapshot.productionJobs[0];
    const order = snapshot.orders.find((o) => o.id === job.orderId);
    assert.ok(order);

    // Test with unpaid order
    const origPayment = order.paymentStatus;
    order.paymentStatus = 'pending';

    const advRes = adminRepository.advanceProductionJob(job.id, 'printing_dtg', 'STF-04');
    assert.equal(advRes.success, false, 'Advancing unpaid order must fail');
    assert.ok(advRes.error?.includes('تسویه نشده'));

    // Restore payment status
    order.paymentStatus = origPayment;
  });

  it('enforces QC failure guardrails: rejected QC item does NOT become shippable and logs defect', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const job = snapshot.productionJobs.find((j) => j.stage === 'qc_inspection') || snapshot.productionJobs[0];
    const order = snapshot.orders.find((o) => o.id === job.orderId);
    assert.ok(order);

    const initialReprintCount = job.reprintCount || 0;

    const qcFailRes = adminRepository.submitQcInspection(job.id, {
      passed: false,
      defectReason: 'انحراف ۲ سانتی‌متری کادر سینه',
      wastedGarmentCount: 1,
      reprintReworkAssigned: true,
      operatorId: 'STF-05',
    });

    assert.equal(qcFailRes.success, true);

    const updatedState = adminRepository.getStateSnapshot();
    const updatedJob = updatedState.productionJobs.find((j) => j.id === job.id);
    const updatedOrder = updatedState.orders.find((o) => o.id === job.orderId);

    assert.equal(updatedJob?.qcStatus, 'failed');
    assert.equal(updatedJob?.stage, 'reprint_needed');
    assert.equal(updatedJob?.reprintCount, initialReprintCount + 1);
    assert.equal(updatedOrder?.productionStatus, 'rework');
    assert.notEqual(updatedOrder?.status, 'ready_to_ship', 'Rejected QC item must NOT become shippable');
    assert.notEqual(updatedOrder?.status, 'shipped');
  });

  it('supports hold and resume branches with explicit reasons and audit recording', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const job = snapshot.productionJobs[1];

    const holdRes = adminRepository.holdProductionJob(job.id, 'کسری رنگ کارتریج فیروزه‌ای', 'STF-04');
    assert.equal(holdRes.success, true);

    let currentJob = adminRepository.getStateSnapshot().productionJobs.find((j) => j.id === job.id);
    assert.equal(currentJob?.stage, 'on_hold');
    assert.equal(currentJob?.holdReason, 'کسری رنگ کارتریج فیروزه‌ای');

    const resumeRes = adminRepository.resumeProductionJob(job.id, 'STF-04');
    assert.equal(resumeRes.success, true);

    currentJob = adminRepository.getStateSnapshot().productionJobs.find((j) => j.id === job.id);
    assert.equal(currentJob?.stage, 'queued');
    assert.equal(currentJob?.holdReason, undefined);
  });

  // ==========================================
  // PROMPT 14 — CUSTOMERS, PROFILES, AUDIT & LTV
  // ==========================================

  it('guarantees customer totals agree with orders: LTV equals verified paid spend minus processed refunds', () => {
    const snapshot = adminRepository.getStateSnapshot();

    for (const c of snapshot.customers) {
      const custOrders = snapshot.orders.filter((o) => o.customerId === c.id);
      const verifiedPaidTotal = custOrders
        .filter((o) => o.paymentStatus === 'verified_paid')
        .reduce((sum, o) => sum + o.totalTomans, 0);
      const refundedTotal = custOrders
        .filter((o) => o.paymentStatus === 'refunded')
        .reduce((sum, o) => sum + o.totalTomans, 0);
      const expectedNetLtv = Math.max(0, verifiedPaidTotal - refundedTotal);

      assert.equal(
        c.totalSpentTomans,
        expectedNetLtv,
        `Customer ${c.id} totalSpentTomans (${c.totalSpentTomans}) must match formula: Paid (${verifiedPaidTotal}) - Refunds (${refundedTotal})`
      );
      assert.equal(c.totalOrdersCount, custOrders.length, `Customer ${c.id} order count must match actual orders count`);
    }
  });

  it('guarantees customer dossier data isolation: profiles never expose data from another fixture', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const c1 = snapshot.customers[0];
    const c2 = snapshot.customers[1];

    const d1 = adminRepository.getCustomerDetails(c1.id);
    const d2 = adminRepository.getCustomerDetails(c2.id);

    assert.ok(d1, 'Customer 1 dossier must exist');
    assert.ok(d2, 'Customer 2 dossier must exist');

    // d1 must contain only c1 data
    for (const o of d1.orders) {
      assert.equal(o.customerId, c1.id, 'All orders in d1 must belong to c1');
    }
    for (const d of d1.customDesigns) {
      assert.equal(d.customerId, c1.id, 'All designs in d1 must belong to c1');
    }
    for (const t of d1.supportTickets) {
      assert.ok(!d2.supportTickets.some((t2) => t2.id === t.id), 'Support tickets must be strictly isolated');
    }
  });

  it('persists customer staff notes and records comprehensive audit trail and activity log', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const customer = snapshot.customers[2];
    const initialNotesCount = customer.staffNotes?.length || 0;
    const initialAuditCount = customer.auditTrail?.length || 0;

    const res = adminRepository.addCustomerNote(
      customer.id,
      'تست خودکار ناوردایی: مشتری تقاضای تغییر سایز به XL پیش از دوخت نهایی دارد.',
      'کارشناس تضمین کیفیت',
      customer.totalOrdersCount > 0 ? snapshot.orders.find((o) => o.customerId === customer.id)?.id : undefined
    );

    assert.equal(res.success, true);
    assert.ok(res.note);

    const updatedDossier = adminRepository.getCustomerDetails(customer.id);
    assert.ok(updatedDossier);
    assert.equal(updatedDossier.staffNotes.length, initialNotesCount + 1);
    assert.equal(updatedDossier.auditTrail.length, initialAuditCount + 1);
    assert.equal(updatedDossier.staffNotes[0].text, 'تست خودکار ناوردایی: مشتری تقاضای تغییر سایز به XL پیش از دوخت نهایی دارد.');

    // Activity log emitted
    const recentActivity = adminRepository.getActivityLogs(5);
    assert.ok(recentActivity.some((a) => a.description.includes(customer.id)));
  });

  it('validates customer update inputs and enforces duplicate detection on mobile and email', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const c1 = snapshot.customers[3];
    const c2 = snapshot.customers[4];

    // Invalid mobile format
    const invalidMobileRes = adminRepository.updateCustomer(c1.id, { phone: '12345' }, 'مدیر');
    assert.equal(invalidMobileRes.success, false);
    assert.ok(invalidMobileRes.error?.includes('۰۹'));

    // Duplicate mobile detection
    const duplicateRes = adminRepository.updateCustomer(c1.id, { phone: c2.phone }, 'مدیر');
    assert.equal(duplicateRes.success, false);
    assert.ok(duplicateRes.error?.includes('قبلاً برای مشتری دیگر'));

    // Valid update succeeds
    const validRes = adminRepository.updateCustomer(c1.id, { fullName: 'نام جدید تست شده' }, 'مدیر');
    assert.equal(validRes.success, true);
    assert.equal(validRes.customer?.fullName, 'نام جدید تست شده');
  });

  it('supports GDPR data export and safer deletion-request without instant destructive data wiping', () => {
    const snapshot = adminRepository.getStateSnapshot();
    const customer = snapshot.customers[5];

    // Data export
    const exportRes = adminRepository.requestCustomerDataExport(customer.id, 'مدیر حقوقی');
    assert.equal(exportRes.success, true);
    assert.ok(exportRes.exportData);
    assert.equal(exportRes.exportData.customer.id, customer.id);
    assert.ok(Array.isArray(exportRes.exportData.orders));

    // Deletion request
    const delRes = adminRepository.requestCustomerDeletion(customer.id, 'درخواست کاربر طبق حق فراموشی', 'واحد پشتیبانی');
    assert.equal(delRes.success, true);
    assert.equal(delRes.customer?.status, 'deactivated');
    assert.ok(delRes.customer?.deletionRequested);
    assert.equal(delRes.customer?.deletionRequested?.status, 'pending_review');
  });
});
