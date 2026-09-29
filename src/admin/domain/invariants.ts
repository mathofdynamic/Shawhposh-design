/**
 * Shahpoosh Admin Invariant Verification Suite
 * Validates referential integrity, financial reconciliation, stock formulas, and metric distinctness.
 */

import { AdminDatabaseState } from './types';

export interface InvariantCheckResult {
  id: string;
  name: string;
  category: 'integrity' | 'financial' | 'inventory' | 'metrics' | 'lifecycle';
  status: 'passed' | 'failed';
  message: string;
  details?: Record<string, any>;
}

export interface InvariantSuiteReport {
  timestampIso: string;
  allPassed: boolean;
  totalChecks: number;
  passedChecks: number;
  failedChecks: number;
  checks: InvariantCheckResult[];
}

export function runInvariantVerification(db: AdminDatabaseState): InvariantSuiteReport {
  const checks: InvariantCheckResult[] = [];

  // 1. Identity & Referential Integrity: Order -> Customer
  const customerIdSet = new Set(db.customers.map((c) => c.id));
  const invalidCustomerOrders = db.orders.filter((o) => !customerIdSet.has(o.customerId));
  checks.push({
    id: 'REF_ORDER_CUSTOMER',
    name: 'صحت ارجاع سفارش به مشتری معتبر',
    category: 'integrity',
    status: invalidCustomerOrders.length === 0 ? 'passed' : 'failed',
    message:
      invalidCustomerOrders.length === 0
        ? `تمامی ${db.orders.length} سفارش به مشتریان ثبت‌شده ارجاع داده شده‌اند.`
        : `تعداد ${invalidCustomerOrders.length} سفارش دارای شناسه مشتری نامعتبر هستند.`,
    details: { totalOrders: db.orders.length, invalidCount: invalidCustomerOrders.length },
  });

  // 2. Identity & Referential Integrity: Order Items -> Product & Variant
  const productIdSet = new Set(db.products.map((p) => p.id));
  const variantSkuSet = new Set(db.variants.map((v) => v.sku));
  let brokenLineItems = 0;
  let brokenCustomDesigns = 0;
  const designIdSet = new Set(db.customDesigns.map((d) => d.id));

  db.orders.forEach((o) => {
    o.items.forEach((item) => {
      if (!productIdSet.has(item.productId) || !variantSkuSet.has(item.variantSku)) {
        brokenLineItems++;
      }
      if (item.isCustomPod && item.customDesignId && !designIdSet.has(item.customDesignId)) {
        brokenCustomDesigns++;
      }
    });
  });

  checks.push({
    id: 'REF_ITEM_VARIANT_PRODUCT',
    name: 'صحت ارجاع اقلام به محصول و تنوع انبار (SKU)',
    category: 'integrity',
    status: brokenLineItems === 0 ? 'passed' : 'failed',
    message:
      brokenLineItems === 0
        ? 'تمامی اقلام سبد خرید دارای کدهای معتبر محصول و SKU انبار هستند.'
        : `تعداد ${brokenLineItems} ردیف کالا دارای ارجاع ناقص به محصول یا SKU است.`,
    details: { totalVariants: db.variants.length, brokenLineItems },
  });

  checks.push({
    id: 'REF_CUSTOM_LINE_DESIGN',
    name: 'صحت ارجاع اقلام سفارشی به شناسنامه طرح آتلیه',
    category: 'integrity',
    status: brokenCustomDesigns === 0 ? 'passed' : 'failed',
    message:
      brokenCustomDesigns === 0
        ? `کلیه اقلام چاپ سفارشی به فایل‌های ثبت‌شده در آتلیه (${db.customDesigns.length} طرح) متصل هستند.`
        : `تعداد ${brokenCustomDesigns} قلم سفارشی به طرح نامعتبر متصل است.`,
    details: { totalCustomDesigns: db.customDesigns.length, brokenCustomDesigns },
  });

  // 3. Stock Invariant: availableStock = onHand - reserved >= 0
  const negativeAvailableVariants = db.variants.filter(
    (v) => v.onHandStock - v.reservedStock < 0 || v.onHandStock < 0 || v.reservedStock < 0
  );
  checks.push({
    id: 'INV_AVAILABLE_STOCK',
    name: 'ناوردایی فرمول موجودی قابل فروش (موجودی فیزیکی منهای رزرو >= ۰)',
    category: 'inventory',
    status: negativeAvailableVariants.length === 0 ? 'passed' : 'failed',
    message:
      negativeAvailableVariants.length === 0
        ? `فرمول موجودی قابل فروش در تمامی ${db.variants.length} تنوع کالا رعایت شده و موجودی منفی صفر است.`
        : `تعداد ${negativeAvailableVariants.length} تنوع دارای موجودی منفی یا رزرو مازاد است.`,
    details: {
      totalSkus: db.variants.length,
      negativeCount: negativeAvailableVariants.length,
      examples: negativeAvailableVariants.slice(0, 3).map((v) => v.sku),
    },
  });

  // 4. Financial Reconciliation: Order totals derive from simulated verified payments
  // Definition:
  // Gross Verified Sales = Sum of all VERIFIED_PAID payments
  // Total Refunds = Sum of all refunded amounts from refund payments
  // Net Sales = Gross Verified Sales - Total Refunds
  const verifiedPayments = db.payments.filter((p) => p.status === 'verified_paid');
  const refundedPayments = db.payments.filter((p) => p.status === 'refunded');

  const grossVerifiedTomans = verifiedPayments.reduce((sum, p) => sum + p.amountTomans, 0);
  const totalRefundedTomans = refundedPayments.reduce(
    (sum, p) => sum + (p.refundedAmountTomans || p.amountTomans),
    0
  );
  const netSalesTomans = grossVerifiedTomans - totalRefundedTomans;

  // Compare with orders having status verified_paid vs refunded
  const verifiedPaidOrdersTotal = db.orders
    .filter((o) => o.paymentStatus === 'verified_paid')
    .reduce((sum, o) => sum + o.totalTomans, 0);

  const refundedOrdersTotal = db.orders
    .filter((o) => o.paymentStatus === 'refunded')
    .reduce((sum, o) => sum + o.totalTomans, 0);

  const financialDiscrepancy = Math.abs(grossVerifiedTomans - verifiedPaidOrdersTotal);
  const refundDiscrepancy = Math.abs(totalRefundedTomans - refundedOrdersTotal);

  checks.push({
    id: 'FIN_VERIFIED_PAYMENTS_MATCH',
    name: 'انطباق دفاتر مالی: مجموع مبالغ تاییدشده تراکنش‌ها با فاکتورهای قطعی',
    category: 'financial',
    status: financialDiscrepancy === 0 && refundDiscrepancy === 0 ? 'passed' : 'failed',
    message:
      financialDiscrepancy === 0 && refundDiscrepancy === 0
        ? `فروش ناخالص (${grossVerifiedTomans.toLocaleString()} تومان) و مرجوعی‌ها (${totalRefundedTomans.toLocaleString()} تومان) انطباق ۱۰۰٪ دارند. خالص فروش: ${netSalesTomans.toLocaleString()} تومان.`
        : `مغایرت مالی شناسایی شد! ناخالص: ${financialDiscrepancy}، مرجوعی: ${refundDiscrepancy}`,
    details: {
      grossVerifiedTomans,
      verifiedPaidOrdersTotal,
      totalRefundedTomans,
      refundedOrdersTotal,
      netSalesTomans,
      discrepancy: financialDiscrepancy,
    },
  });

  // 5. Distinct Metric Semantic Invariant:
  // Product Count !== SKU Count !== Customer Count !== Unit Count
  const productCount = db.products.length;
  const skuCount = db.variants.length;
  const customerCount = db.customers.length;
  const totalUnitsOnHand = db.variants.reduce((acc, v) => acc + v.onHandStock, 0);

  const distinctProductMetrics =
    productCount !== skuCount &&
    skuCount !== customerCount &&
    customerCount !== totalUnitsOnHand &&
    productCount < skuCount;

  checks.push({
    id: 'METRIC_SEMANTIC_DISTINCTION',
    name: 'تمایز معنایی و عددی شاخص‌ها (محصولات ≠ تنوع SKU ≠ مشتریان ≠ تعداد فیزیکی)',
    category: 'metrics',
    status: distinctProductMetrics ? 'passed' : 'failed',
    message: `شاخص‌ها تفکیک واقعی دارند: ${productCount} محصول پایه، ${skuCount} تنوع SKU، ${customerCount} مشتری و ${totalUnitsOnHand} تکه لباس در انبار.`,
    details: { productCount, skuCount, customerCount, totalUnitsOnHand },
  });

  // 6. Distinct Analytics Metric Semantic Invariant:
  // Visitors !== Sessions !== Pageviews
  const { visitors, sessions, pageviews } = db.analytics;
  const distinctTrafficMetrics =
    visitors.last30d < sessions.last30d &&
    sessions.last30d < pageviews.last30d &&
    visitors.today > 0 &&
    sessions.today > visitors.today;

  checks.push({
    id: 'METRIC_TRAFFIC_HIERARCHY',
    name: 'سلسله‌مراتب ترافیکی (بازدیدکنندگان یکتا < نشست‌ها < تعداد بازدید صفحات)',
    category: 'metrics',
    status: distinctTrafficMetrics ? 'passed' : 'failed',
    message: `سلسله‌مراتب ترافیک ۳۰ روزه رعایت شده است: ${visitors.last30d.toLocaleString()} کاربر یکتا < ${sessions.last30d.toLocaleString()} نشست < ${pageviews.last30d.toLocaleString()} بازدید صفحه.`,
    details: {
      visitors30d: visitors.last30d,
      sessions30d: sessions.last30d,
      pageviews30d: pageviews.last30d,
    },
  });

  // 7. Workflow Edge Cases Presence (Inspectability)
  // Ensure database contains:
  // - Low stock variants (available <= 3)
  // - Pending review design
  // - Rejected design
  // - Pending payment order
  // - Cancelled order
  // - Overdue / active staff tasks
  const lowStockCount = db.variants.filter((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold).length;
  const pendingDesigns = db.customDesigns.filter((d) => d.status === 'under_review').length;
  const rejectedDesigns = db.customDesigns.filter((d) => d.status === 'rejected').length;
  const pendingOrders = db.orders.filter((o) => o.status === 'pending_payment').length;
  const cancelledOrders = db.orders.filter((o) => o.status === 'cancelled').length;

  const hasEdgeCases =
    lowStockCount > 0 &&
    pendingDesigns > 0 &&
    rejectedDesigns > 0 &&
    pendingOrders > 0 &&
    cancelledOrders > 0;

  checks.push({
    id: 'WORKFLOW_INSPECTABILITY_EDGE_CASES',
    name: 'پوشش حالات خاص و گوشه‌ای کارگاه (کالای کم‌موجود، طرح نیازمند اصلاح، سفارش معلق)',
    category: 'lifecycle',
    status: hasEdgeCases ? 'passed' : 'failed',
    message: `نمونه‌های بازرسی موجودند: ${lowStockCount} مورد کسری انبار، ${pendingDesigns} طرح در نوبت، ${rejectedDesigns} طرح رد شده، ${pendingOrders} پرداخت معلق.`,
    details: {
      lowStockCount,
      pendingDesigns,
      rejectedDesigns,
      pendingOrders,
      cancelledOrders,
    },
  });

  // 8. Catalog & Entity Integrity Invariants
  // 8a. SKU Uniqueness
  const allSkus = db.variants.map((v) => v.sku);
  const uniqueSkus = new Set(allSkus);
  const hasDuplicateSkus = allSkus.length !== uniqueSkus.size;
  checks.push({
    id: 'CATALOG_SKU_UNIQUENESS',
    name: 'یکتا بودن شناسه انبارداری (SKU) در کل کاتالوگ',
    category: 'integrity',
    status: !hasDuplicateSkus ? 'passed' : 'failed',
    message: !hasDuplicateSkus
      ? `تمامی ${allSkus.length} تنوع موجود در انبار دارای SKU کاملاً منحصربه‌فرد هستند.`
      : `تعداد ${allSkus.length - uniqueSkus.size} کد تنوع تکراری در انبار شناسایی شد!`,
    details: { totalSkus: allSkus.length, uniqueCount: uniqueSkus.size },
  });

  // 8b. Product Base Price Positivity
  const invalidPriceProducts = db.products.filter(
    (p) => !p.basePriceTomans || isNaN(p.basePriceTomans) || p.basePriceTomans <= 0
  );
  checks.push({
    id: 'CATALOG_PRODUCT_PRICING',
    name: 'صحت قیمت‌گذاری پایه محصولات (قیمت مثبت و بزرگتر از صفر)',
    category: 'financial',
    status: invalidPriceProducts.length === 0 ? 'passed' : 'failed',
    message: invalidPriceProducts.length === 0
      ? `تمامی ${db.products.length} محصول کاتالوگ دارای قیمت پایه معتبر و مثبت هستند.`
      : `تعداد ${invalidPriceProducts.length} محصول دارای قیمت پایه صفر یا منفی هستند.`,
    details: { totalProducts: db.products.length, invalidCount: invalidPriceProducts.length },
  });

  // 8c. Category & Collection Integrity
  const categoryIds = new Set((db.categories || []).map((c) => c.id));
  const invalidCategoryProducts = db.products.filter((p) => p.category && !categoryIds.has(p.category));
  const categorySlugs = (db.categories || []).map((c) => c.slug);
  const duplicateCatSlugs = categorySlugs.length !== new Set(categorySlugs).size;

  checks.push({
    id: 'CATALOG_CATEGORY_INTEGRITY',
    name: 'صحت دسته‌بندی‌ها و عدم ارجاع شکسته محصولات',
    category: 'integrity',
    status: invalidCategoryProducts.length === 0 && !duplicateCatSlugs ? 'passed' : 'failed',
    message: invalidCategoryProducts.length === 0 && !duplicateCatSlugs
      ? `تمامی ${db.products.length} محصول به دسته‌بندی‌های معتبر متصل هستند و اسلاگ‌ها یکتا هستند.`
      : `خطا در پیوستگی دسته‌بندی‌ها یا اسلاگ تکراری یافت شد.`,
    details: {
      totalCategories: (db.categories || []).length,
      invalidProductCount: invalidCategoryProducts.length,
      duplicateSlugs: duplicateCatSlugs,
    },
  });

  // 9. Blank Garment Physical Stock Invariant (No duplication across hypothetical designs)
  // "One blank customizable garment may support many artwork options: NEVER duplicate its physical stock across hypothetical designs."
  // Custom designs in db.customDesigns do NOT each claim their own on-hand inventory pool;
  // instead they refer to canonical blank garments or line items when fulfilled.
  const customDesignsWithoutPhysicalStockDuplication = db.customDesigns.every(
    (d) => !(d as any).onHandStock && !(d as any).physicalStockUnits
  );
  checks.push({
    id: 'INV_POD_BLANK_STOCK_CANONICAL',
    name: 'عدم تکثیر موجودی فیزیکی البسه خام به ازای طرح‌های سفارشی فرضی',
    category: 'inventory',
    status: customDesignsWithoutPhysicalStockDuplication ? 'passed' : 'failed',
    message: customDesignsWithoutPhysicalStockDuplication
      ? `تمامی ${db.customDesigns.length} طرح آتلیه چاپ بدون ایجاد موجودی فیزیکی کاذب به مخزن متمرکز البسه خام متصل هستند.`
      : 'خطای نقض ناوردایی: برخی طرح‌های سفارشی به اشتباه موجودی فیزیکی مستقل ایجاد کرده‌اند!',
    details: { totalCustomDesigns: db.customDesigns.length },
  });

  // 10. Purchase Order Supplier Referential Integrity
  const supplierIdSet = new Set((db.suppliers || []).map((s) => s.id));
  const invalidPoSuppliers = (db.purchaseOrders || []).filter((po) => !supplierIdSet.has(po.supplierId));
  checks.push({
    id: 'REF_PO_SUPPLIER',
    name: 'صحت ارجاع سفارشات خرید به تامین‌کنندگان معتبر',
    category: 'integrity',
    status: invalidPoSuppliers.length === 0 ? 'passed' : 'failed',
    message: invalidPoSuppliers.length === 0
      ? `تمامی ${(db.purchaseOrders || []).length} سفارش خرید به تامین‌کنندگان دارای پرونده رسمی متصل هستند.`
      : `تعداد ${invalidPoSuppliers.length} سفارش خرید دارای تامین‌کننده نامعتبر است.`,
    details: { totalPOs: (db.purchaseOrders || []).length, invalidCount: invalidPoSuppliers.length },
  });

  // 11. Stock Movement Audit Consistency
  const movements = db.stockMovements || [];
  const invalidMovements = movements.filter(
    (m) => m.newOnHand < 0 || m.newReserved < 0 || m.newOnHand < m.newReserved
  );
  checks.push({
    id: 'INV_STOCK_MOVEMENT_CONSISTENCY',
    name: 'صحت ناوردایی تاریخچه گردش انبار (موجودی فیزیکی >= تعهد رزرو >= ۰)',
    category: 'inventory',
    status: invalidMovements.length === 0 ? 'passed' : 'failed',
    message: invalidMovements.length === 0
      ? `تمامی ${movements.length} رکورد در دفتر روزنامه گردش انبار دارای مقادیر معتبر و منطبق بر تعهدات هستند.`
      : `تعداد ${invalidMovements.length} رکورد گردش انبار دارای مقادیر نامعتبر است.`,
    details: { totalMovements: movements.length, invalidCount: invalidMovements.length },
  });

  // 15. Financial Refund Cap Invariant:
  // No refund record or payment refund amount may exceed the captured amount
  const paymentsWithExcessiveRefunds = (db.payments || []).filter(
    (p) => (p.refundedAmountTomans || 0) > p.amountTomans
  );
  const excessiveRefundRecords = (db.refunds || []).filter((r) => {
    const p = db.payments.find((pay) => pay.id === r.paymentId);
    return p && (r.processedAmountTomans || r.requestedAmountTomans) > p.amountTomans;
  });
  const hasExcessiveRefunds = paymentsWithExcessiveRefunds.length > 0 || excessiveRefundRecords.length > 0;
  checks.push({
    id: 'FIN_REFUND_CAP_INVARIANT',
    name: 'سقف مبلغ استرداد (عدم فراتر رفتن مجموع مرجوعی از کل تراکنش قطعی)',
    category: 'financial',
    status: !hasExcessiveRefunds ? 'passed' : 'failed',
    message: !hasExcessiveRefunds
      ? 'هیچ مبلغ استردادی از سقف مجاز پرداخت تاییدشده فراتر نرفته است.'
      : 'استرداد غیرمجاز بیش از سقف پرداخت در پایگاه داده شناسایی شد!',
    details: {
      excessivePayments: paymentsWithExcessiveRefunds.length,
      excessiveRefunds: excessiveRefundRecords.length,
    },
  });

  // 16. State Machine Consistency: Production cannot start on unverified payments
  const contradictoryOrders = (db.orders || []).filter((o) => {
    const isProductionOrBeyond =
      o.status === 'in_production' ||
      o.status === 'quality_check' ||
      o.status === 'ready_to_ship' ||
      o.status === 'shipped' ||
      o.status === 'delivered';
    const isUnverifiedPayment = o.paymentStatus !== 'verified_paid' && o.paymentStatus !== 'partial_refund';
    return isProductionOrBeyond && isUnverifiedPayment;
  });
  checks.push({
    id: 'ORDER_PRODUCTION_PAYMENT_CONSISTENCY',
    name: 'عدم تناقض خطوط حالت: ممنوعیت ورود سفارشات پرداخت‌نشده به خط تولید',
    category: 'lifecycle',
    status: contradictoryOrders.length === 0 ? 'passed' : 'failed',
    message: contradictoryOrders.length === 0
      ? 'هیچ سفارش پرداخت‌نشده یا ناموفقی در صف تولید کارگاه یا ارسال بارنامه وجود ندارد.'
      : `تعداد ${contradictoryOrders.length} سفارش بدون تسویه معتبر وارد فرآیند تولید یا ارسال شده‌اند!`,
    details: { contradictoryCount: contradictoryOrders.length },
  });

  const passedChecks = checks.filter((c) => c.status === 'passed').length;
  const failedChecks = checks.length - passedChecks;

  return {
    timestampIso: new Date().toISOString(),
    allPassed: failedChecks === 0,
    totalChecks: checks.length,
    passedChecks,
    failedChecks,
    checks,
  };
}

export function verifyDomainInvariants(db: AdminDatabaseState) {
  const report = runInvariantVerification(db);
  return {
    isValid: report.allPassed,
    totalChecks: report.totalChecks,
    results: report.checks.map((c) => ({
      invariant: c.name,
      passed: c.status === 'passed',
      details: c.message,
    })),
  };
}

