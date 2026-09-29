/**
 * Shahpoosh Admin UI-Only Repository Layer
 * Manages versioned local state, typed selectors, mutations with invariant guards, and activity emission.
 */

import {
  AdminDatabaseState,
  DateRangePreset,
  OrderStatus,
  Order,
  OrderLineItem,
  CustomDesign,
  ActivityLog,
  PaymentAttempt,
  ActionQueueItem,
  ActionSeverity,
  PseudonymousSession,
  SecurityAuditIncident,
  ProvinceGeoStat,
  UtmCampaignStat,
  SalesAnalyticsData,
  SalesTimelinePoint,
  CategorySalesStat,
  SkuSalesStat,
  UnitEconomicsItem,
  AdminProduct,
  ProductVariant,
  AdminCategory,
  AdminCollection,
  MediaAsset,
  StockMovement,
  Supplier,
  PurchaseOrder,
  WorkshopMaterial,
  StockMovementType,
  RefundRecord,
  SettlementBatchItem,
  DesignSettings,
  ArtworkAsset,
  PrintRuleZone,
  ProductionStage,
  Customer,
  CustomerDetailData,
  Shipment,
  ReturnRequest,
  ReturnReason,
  ReturnStatus,
  InspectionOutcome,
  ReturnResolution,
  ReturnRequestItem,
  CustomerSupportTicket,
  CustomerProductReview,
  CarrierName,
  ShipmentStatus,
  NotificationTemplate,
  SimulatedNotificationLog,
  DiscountRule,
  MarketingCampaign,
  HomepageLayoutConfig,
  StoreBanner,
  CmsCustomPage,
  SeoMetadataRecord,
  FunnelAnalysis,
} from './types';
import { generateSyntheticDatabase, SCHEMA_VERSION, DEMO_CLOCK_ISO } from './generator';
import { runInvariantVerification, InvariantSuiteReport } from './invariants';
import {
  canTransitionOrderStatus,
  detectOrderExceptions,
  OrderException,
  getOrderType,
} from './orderStateMachine';
import {
  calculateLedgerSummary,
  validateRefundEligibility,
  generateSettlementBatches,
  FinancialLedgerSummary,
} from './paymentLedger';
import {
  DEFAULT_ARTWORK_ASSETS,
  DEFAULT_PRINT_RULE_ZONES,
} from './customStudio';
import {
  CARRIER_CONFIG,
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_RETURN_REQUESTS,
  renderNotificationTemplate,
} from './shippingReturnsNotifications';
import {
  DEFAULT_DISCOUNTS,
  DEFAULT_MARKETING_CAMPAIGNS,
  DEFAULT_HOMEPAGE_CONFIG,
  DEFAULT_STORE_BANNERS,
  DEFAULT_CMS_PAGES,
  DEFAULT_SEO_RECORDS,
  calculateDiscountPreview,
  validateDiscountConflicts,
} from './marketingCms';

const STORAGE_KEY = `SHAHPOOSH_ADMIN_DB_V${SCHEMA_VERSION}`;
const DATA_CHANGE_EVENT = 'shahpoosh:admin_data_mutated';

class AdminRepository {
  private state: AdminDatabaseState;

  constructor() {
    this.state = this.loadOrInitialize();
  }

  /**
   * Safely load state from localStorage or initialize with deterministic fixtures
   */
  private loadOrInitialize(): AdminDatabaseState {
    if (typeof window === 'undefined') {
      return generateSyntheticDatabase();
    }

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AdminDatabaseState;
        if (parsed && parsed.schemaVersion === SCHEMA_VERSION && Array.isArray(parsed.orders)) {
          // Backwards compatibility migration for catalog & inventory tables
          if (
            !parsed.categories ||
            !parsed.collections ||
            !parsed.mediaAssets ||
            !parsed.stockMovements ||
            !parsed.suppliers ||
            !parsed.purchaseOrders ||
            !parsed.workshopMaterials
          ) {
            const fresh = generateSyntheticDatabase();
            parsed.categories = parsed.categories || fresh.categories;
            parsed.collections = parsed.collections || fresh.collections;
            parsed.mediaAssets = parsed.mediaAssets || fresh.mediaAssets;
            parsed.stockMovements = parsed.stockMovements || fresh.stockMovements;
            parsed.suppliers = parsed.suppliers || fresh.suppliers;
            parsed.purchaseOrders = parsed.purchaseOrders || fresh.purchaseOrders;
            parsed.workshopMaterials = parsed.workshopMaterials || fresh.workshopMaterials;
            this.saveState(parsed);
          }
          return parsed;
        }
      }
    } catch (e) {
      console.warn('[Shahpoosh Admin] Corrupted or legacy local storage detected. Resetting to fixtures.', e);
    }

    const fresh = generateSyntheticDatabase();
    this.saveState(fresh);
    return fresh;
  }

  private saveState(newState: AdminDatabaseState): void {
    this.state = newState;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
        window.dispatchEvent(new CustomEvent(DATA_CHANGE_EVENT));
      } catch (err) {
        console.error('[Shahpoosh Admin] Failed to save database to localStorage', err);
      }
    }
  }

  public resetToDefaults(): AdminDatabaseState {
    const fresh = generateSyntheticDatabase();
    this.saveState(fresh);
    return fresh;
  }

  public getStateSnapshot(): Readonly<AdminDatabaseState> {
    return this.state;
  }

  public getDemoClock(): string {
    return DEMO_CLOCK_ISO;
  }

  public runInvariantSuite(): InvariantSuiteReport {
    return runInvariantVerification(this.state);
  }

  // ==========================================
  // SELECTORS
  // ==========================================

  public getDashboardKPIs(timeframe: DateRangePreset = '30d') {
    const nowMs = new Date(this.state.demoClockIso).getTime();
    const timeframeDays = timeframe === 'today' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const thresholdMs = nowMs - timeframeDays * 24 * 3600 * 1000;
    const prevThresholdMs = thresholdMs - timeframeDays * 24 * 3600 * 1000;

    // Current window orders
    const filteredOrders = this.state.orders.filter((o) => {
      const oMs = new Date(o.createdAt).getTime();
      return oMs >= thresholdMs && oMs <= nowMs;
    });

    // Previous window orders (for true delta calculations)
    const prevOrders = this.state.orders.filter((o) => {
      const oMs = new Date(o.createdAt).getTime();
      return oMs >= prevThresholdMs && oMs < thresholdMs;
    });

    const verifiedOrders = filteredOrders.filter((o) => o.paymentStatus === 'verified_paid');
    const prevVerifiedOrders = prevOrders.filter((o) => o.paymentStatus === 'verified_paid');

    const grossSalesTomans = verifiedOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const prevGrossSalesTomans = prevVerifiedOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const grossDeltaPercent = prevGrossSalesTomans > 0
      ? Math.round(((grossSalesTomans - prevGrossSalesTomans) / prevGrossSalesTomans) * 1000) / 10
      : 0;

    const refundedOrders = filteredOrders.filter((o) => o.paymentStatus === 'refunded');
    const prevRefundedOrders = prevOrders.filter((o) => o.paymentStatus === 'refunded');
    const refundsTomans = refundedOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const prevRefundsTomans = prevRefundedOrders.reduce((sum, o) => sum + o.totalTomans, 0);

    const netSalesTomans = grossSalesTomans - refundsTomans;
    const prevNetSalesTomans = prevGrossSalesTomans - prevRefundsTomans;
    const netDeltaPercent = prevNetSalesTomans > 0
      ? Math.round(((netSalesTomans - prevNetSalesTomans) / prevNetSalesTomans) * 1000) / 10
      : 0;

    const ordersDeltaPercent = prevOrders.length > 0
      ? Math.round(((filteredOrders.length - prevOrders.length) / prevOrders.length) * 1000) / 10
      : 0;

    const averageOrderValueTomans = verifiedOrders.length ? Math.round(grossSalesTomans / verifiedOrders.length) : 0;
    const prevAverageOrderValueTomans = prevVerifiedOrders.length ? Math.round(prevGrossSalesTomans / prevVerifiedOrders.length) : 0;
    const aovDeltaPercent = prevAverageOrderValueTomans > 0
      ? Math.round(((averageOrderValueTomans - prevAverageOrderValueTomans) / prevAverageOrderValueTomans) * 1000) / 10
      : 0;

    // Standard vs Custom Revenue Breakdown
    const customOrders = verifiedOrders.filter((o) => o.hasCustomLineItem);
    const customRevenueTomans = customOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const standardRevenueTomans = Math.max(0, grossSalesTomans - customRevenueTomans);
    const customRevenuePercent = grossSalesTomans > 0 ? Math.round((customRevenueTomans / grossSalesTomans) * 100) : 0;
    const standardRevenuePercent = 100 - customRevenuePercent;

    // Traffic Metrics derived from snapshots
    const currSnapshots = this.state.analytics.dailySnapshots.slice(-timeframeDays);
    const prevSnapshots = this.state.analytics.dailySnapshots.slice(-2 * timeframeDays, -timeframeDays);

    const visitors = currSnapshots.reduce((s, d) => s + d.visitors, 0);
    const prevVisitors = prevSnapshots.reduce((s, d) => s + d.visitors, 0);
    const visitorsDeltaPercent = prevVisitors > 0
      ? Math.round(((visitors - prevVisitors) / prevVisitors) * 1000) / 10
      : 0;

    const sessions = currSnapshots.reduce((s, d) => s + d.sessions, 0);
    const prevSessions = prevSnapshots.reduce((s, d) => s + d.sessions, 0);
    const sessionsDeltaPercent = prevSessions > 0
      ? Math.round(((sessions - prevSessions) / prevSessions) * 1000) / 10
      : 0;

    const pageviews = currSnapshots.reduce((s, d) => s + d.pageviews, 0);

    const conversionRatePercent = sessions > 0
      ? Math.round((verifiedOrders.length / sessions) * 10000) / 100
      : 0;
    const prevConversionRatePercent = prevSessions > 0
      ? Math.round((prevVerifiedOrders.length / prevSessions) * 10000) / 100
      : 0;
    const conversionDeltaPercent = prevConversionRatePercent > 0
      ? Math.round(((conversionRatePercent - prevConversionRatePercent) / prevConversionRatePercent) * 1000) / 10
      : 0;

    // New Customers in Timeframe
    const newCustomersCount = this.state.customers.filter((c) => {
      const cMs = new Date(c.createdAt).getTime();
      return cMs >= thresholdMs && cMs <= nowMs;
    }).length;
    const prevNewCustomersCount = this.state.customers.filter((c) => {
      const cMs = new Date(c.createdAt).getTime();
      return cMs >= prevThresholdMs && cMs < thresholdMs;
    }).length;
    const newCustomersDeltaPercent = prevNewCustomersCount > 0
      ? Math.round(((newCustomersCount - prevNewCustomersCount) / prevNewCustomersCount) * 1000) / 10
      : 0;

    // Operational counts
    const pendingDesignCount = this.state.customDesigns.filter((d) => d.status === 'under_review').length;
    const activeProductionCount = this.state.orders.filter(
      (o) => o.status === 'in_production' || o.status === 'quality_check' || o.status === 'paid_processing'
    ).length;
    const lowStockCount = this.state.variants.filter(
      (v) => v.onHandStock - v.reservedStock <= v.minStockThreshold
    ).length;
    const failedPaymentsCount = this.state.payments.filter(
      (p) => p.status === 'failed' && new Date(p.createdAt).getTime() >= thresholdMs
    ).length;
    const productionOverdueCount = this.state.productionJobs.filter(
      (j) => j.stage !== 'completed' && (j.qcStatus === 'failed' || j.reprintCount > 0)
    ).length;
    const fulfillmentExceptionsCount = this.state.shipments.filter(
      (s) => s.status === 'returned'
    ).length;

    // Catalog & Stock distinct metrics
    const catalogMetrics = {
      productCount: this.state.products.length,
      activeProductsCount: this.state.products.filter((p) => p.isLive).length,
      variantSkuCount: this.state.variants.length,
      customerCount: this.state.customers.length,
      totalUnitsOnHand: this.state.variants.reduce((acc, v) => acc + v.onHandStock, 0),
      availableUnitsToSell: this.state.variants.reduce((acc, v) => acc + Math.max(0, v.onHandStock - v.reservedStock), 0),
      reservedUnitsCount: this.state.variants.reduce((acc, v) => acc + v.reservedStock, 0),
    };

    // Team Work Report
    const teamWorkReport = {
      completedTasks: this.state.tasks.filter((t) => t.status === 'completed').length,
      pendingTasks: this.state.tasks.filter((t) => t.status === 'todo' || t.status === 'in_progress').length,
      urgentTasks: this.state.tasks.filter((t) => (t.status === 'todo' || t.status === 'in_progress') && t.priority === 'urgent').length,
      onlineStaffCount: this.state.staff.filter((s) => s.isOnline).length,
      totalStaffCount: this.state.staff.length,
    };

    return {
      timeframe,
      timeframeDays,
      grossSalesTomans,
      grossRevenueTomans: grossSalesTomans,
      prevGrossSalesTomans,
      grossDeltaPercent,
      netSalesTomans,
      prevNetSalesTomans,
      netDeltaPercent,
      refundsTomans,
      ordersCount: filteredOrders.length,
      prevOrdersCount: prevOrders.length,
      ordersDeltaPercent,
      verifiedPaidOrdersCount: verifiedOrders.length,
      activeOrdersCount: activeProductionCount,
      pendingOrdersCount: filteredOrders.filter((o) => o.status === 'pending_payment').length,
      averageOrderValueTomans,
      prevAverageOrderValueTomans,
      aovDeltaPercent,
      // Revenue Breakdown
      standardRevenueTomans,
      customRevenueTomans,
      standardRevenuePercent,
      customRevenuePercent,
      // Traffic
      traffic: {
        visitors,
        prevVisitors,
        visitorsDeltaPercent,
        sessions,
        prevSessions,
        sessionsDeltaPercent,
        pageviews,
        conversionRatePercent,
        prevConversionRatePercent,
        conversionDeltaPercent,
      },
      // Customers
      newCustomersCount,
      prevNewCustomersCount,
      newCustomersDeltaPercent,
      // Catalog & Inventory
      catalog: catalogMetrics,
      metrics: catalogMetrics, // backwards compatibility
      // Exceptions & Risks
      pendingDesignCount,
      designsAwaitingReview: pendingDesignCount,
      lowStockCount,
      lowStockSkusCount: lowStockCount,
      failedPaymentsCount,
      productionOverdueCount,
      fulfillmentExceptionsCount,
      // Team
      teamWorkReport,
      // Synchronized snapshots for charts
      chartSnapshots: currSnapshots,
    };
  }

  /**
   * Action Center actionable queue selector
   * Derives actionable work items from all modules without fake dismissals.
   */
  public getActionQueue(): ActionQueueItem[] {
    const nowMs = new Date(this.state.demoClockIso).getTime();
    const items: ActionQueueItem[] = [];

    const formatAgeText = (isoString?: string) => {
      if (!isoString) return 'نامشخص';
      const pastMs = new Date(isoString).getTime();
      const diffMinutes = Math.max(1, Math.round((nowMs - pastMs) / (60 * 1000)));
      if (diffMinutes < 60) return `${diffMinutes} دقیقه پیش`;
      const diffHours = Math.round(diffMinutes / 60);
      if (diffHours < 24) return `${diffHours} ساعت پیش`;
      const diffDays = Math.round(diffHours / 24);
      return `${diffDays} روز پیش`;
    };

    // 1. Custom Studio - Awaiting Review
    this.state.customDesigns
      .filter((d) => d.status === 'under_review')
      .forEach((d) => {
        const createdMs = new Date(d.submittedAt).getTime();
        const ageHours = (nowMs - createdMs) / (3600 * 1000);
        items.push({
          id: `act-design-${d.id}`,
          module: 'custom_studio',
          title: `داوری فایل چاپ سفارشی: ${d.title}`,
          description: `سفارش ${d.orderId} با ابعاد ${d.dimensionsMm} و وضوح ${d.resolutionDpi} DPI منتظر تایید تطابق رنگی CMYK است.`,
          severity: ageHours > 24 ? 'critical' : 'high',
          ageText: formatAgeText(d.submittedAt),
          ageMs: nowMs - createdMs,
          assignedRole: 'طراح و ناظر آتلیه چاپ',
          requiredRoleKey: 'designer_reviewer',
          linkedEntityType: 'design',
          linkedEntityId: d.id,
          primaryActionLabel: 'تایید مستقیم چاپ',
          secondaryActionLabel: 'مشاهده در آتلیه',
          targetRoute: '/admin/custom-studio/approval',
          canDirectResolve: true,
          directActionType: 'approve_design',
        });
      });

    // 2. Inventory - Critical Low Stock
    this.state.variants
      .filter((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold)
      .forEach((v) => {
        const freeStock = v.onHandStock - v.reservedStock;
        const product = this.state.products.find((p) => p.id === v.productId);
        items.push({
          id: `act-stock-${v.sku}`,
          module: 'inventory',
          title: `کسری بحرانی انبار: ${product?.name || 'کالا'} (${v.sku})`,
          description: `رنگ ${v.colorName}، سایز ${v.size}. موجودی فیزیکی ${v.onHandStock}، رزرو ${v.reservedStock}. موجودی آزاد: ${freeStock} عدد (آستانه: ${v.minStockThreshold}).`,
          severity: freeStock <= 0 ? 'critical' : 'high',
          ageText: `موجودی آزاد: ${freeStock} عدد`,
          ageMs: freeStock <= 0 ? 999999999 : 500000000,
          assignedRole: 'مسئول انبار و مدیریت کارگاه',
          requiredRoleKey: 'super_admin',
          linkedEntityType: 'variant',
          linkedEntityId: v.sku,
          primaryActionLabel: 'شارژ انبار (+۲۰ عدد)',
          secondaryActionLabel: 'انبارگردانی',
          targetRoute: '/admin/catalog/inventory',
          canDirectResolve: true,
          directActionType: 'restock_variant',
        });
      });

    // 3. Production - Overdue or QC Failures
    this.state.productionJobs
      .filter((j) => j.stage !== 'completed' && (j.qcStatus === 'failed' || j.reprintCount > 0))
      .forEach((j) => {
        items.push({
          id: `act-job-${j.id}`,
          module: 'production',
          title: `تجدید چاپ یا رد کیفی: جاب ${j.id}`,
          description: `سفارش ${j.orderId} تنوع ${j.variantSku} نیازمند اصلاح اپراتور است (دفعات چاپ: ${j.reprintCount}، ایراد: ${j.qcNotes || 'عدم ثبات رنگ'}).`,
          severity: 'high',
          ageText: j.startedAt ? formatAgeText(j.startedAt) : 'در صف پرینتر',
          ageMs: 85000000,
          assignedRole: 'اپراتور ارشد پرینتر DTG',
          requiredRoleKey: 'production_operator',
          linkedEntityType: 'job',
          linkedEntityId: j.id,
          primaryActionLabel: 'بررسی در میز تولید',
          targetRoute: `/admin/custom-studio/jobs/${j.id}`,
          canDirectResolve: false,
        });
      });

    // 4. Sales - Paid Processing awaiting release to production
    this.state.orders
      .filter((o) => o.status === 'paid_processing' && o.paymentStatus === 'verified_paid')
      .slice(0, 5)
      .forEach((o) => {
        const createdMs = new Date(o.createdAt).getTime();
        items.push({
          id: `act-order-${o.id}`,
          module: 'sales',
          title: `سفارش تاییدشده در انتظار ورود به خط: ${o.id}`,
          description: `مشتری: ${o.customerName} (${o.city}) · بهای فاکتور: ${o.totalTomans.toLocaleString()} تومان (${o.items.length} قلم).`,
          severity: 'medium',
          ageText: formatAgeText(o.createdAt),
          ageMs: nowMs - createdMs,
          assignedRole: 'سرپرست خط آماده‌سازی',
          requiredRoleKey: 'super_admin',
          linkedEntityType: 'order',
          linkedEntityId: o.id,
          primaryActionLabel: 'انتقال به خط چاپ',
          secondaryActionLabel: 'مشاهده سفارش',
          targetRoute: '/admin/sales/orders',
          canDirectResolve: true,
          directActionType: 'advance_order',
        });
      });

    // 5. Payments - Failed Gateway attempts
    this.state.payments
      .filter((p) => p.status === 'failed')
      .slice(0, 4)
      .forEach((p) => {
        const createdMs = new Date(p.createdAt).getTime();
        items.push({
          id: `act-payment-${p.id}`,
          module: 'payments',
          title: `خطای تراکنش شاپرک: ${p.id}`,
          description: `تراکنش سفارش ${p.orderId} به مبلغ ${p.amountTomans.toLocaleString()} تومان با خطای درگاه مواجه شد. پیگیری پشتیبانی لازم است.`,
          severity: 'medium',
          ageText: formatAgeText(p.createdAt),
          ageMs: nowMs - createdMs,
          assignedRole: 'پشتیبانی، مالی و لجستیک',
          requiredRoleKey: 'support_finance',
          linkedEntityType: 'payment',
          linkedEntityId: p.id,
          primaryActionLabel: 'بررسی فیش و تراکنش',
          targetRoute: '/admin/sales/payments',
          canDirectResolve: false,
        });
      });

    // 6. Urgent Staff Tasks
    this.state.tasks
      .filter((t) => (t.status === 'todo' || t.status === 'in_progress') && (t.priority === 'urgent' || t.priority === 'high'))
      .forEach((t) => {
        const createdMs = new Date(t.createdAt).getTime();
        const staff = this.state.staff.find((s) => s.id === t.assignedStaffId);
        items.push({
          id: `act-task-${t.id}`,
          module: 'tasks',
          title: `وظیفه ضروری کارگاه: ${t.title}`,
          description: `${t.description} (مهلت تعیین‌شده: ${t.dueDate}).`,
          severity: t.priority === 'urgent' ? 'critical' : 'high',
          ageText: formatAgeText(t.createdAt),
          ageMs: nowMs - createdMs,
          assignedRole: staff ? staff.fullName : 'تیم کارگاه',
          requiredRoleKey: 'all',
          linkedEntityType: 'task',
          linkedEntityId: t.id,
          primaryActionLabel: 'ثبت تکمیل وظیفه',
          secondaryActionLabel: 'کارتابل وظایف',
          targetRoute: '/admin/team/tasks',
          canDirectResolve: true,
          directActionType: 'complete_task',
        });
      });

    // Sort by severity: critical -> high -> medium -> low, then ageMs descending
    const severityWeight: Record<ActionSeverity, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    items.sort((a, b) => {
      const diffSev = severityWeight[b.severity] - severityWeight[a.severity];
      if (diffSev !== 0) return diffSev;
      return b.ageMs - a.ageMs;
    });

    return items;
  }

  /**
   * Traffic & Engagement Analytics Selector
   */
  public getTrafficAnalytics(timeframe: DateRangePreset = '30d', customStart?: string, customEnd?: string) {
    let currSnapshots = [...this.state.analytics.dailySnapshots];
    let prevSnapshots = [...this.state.analytics.dailySnapshots];

    if (customStart && customEnd) {
      currSnapshots = currSnapshots.filter((d) => d.date >= customStart && d.date <= customEnd);
      if (currSnapshots.length === 0) {
        currSnapshots = this.state.analytics.dailySnapshots.slice(-30);
      }
      prevSnapshots = this.state.analytics.dailySnapshots.slice(-2 * currSnapshots.length, -currSnapshots.length);
    } else {
      const days = timeframe === 'today' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      currSnapshots = this.state.analytics.dailySnapshots.slice(-days);
      prevSnapshots = this.state.analytics.dailySnapshots.slice(-2 * days, -days);
    }

    const visitors = currSnapshots.reduce((s, d) => s + d.visitors, 0);
    const prevVisitors = prevSnapshots.reduce((s, d) => s + d.visitors, 0);
    const visitorsDelta = prevVisitors > 0 ? Math.round(((visitors - prevVisitors) / prevVisitors) * 1000) / 10 : 0;

    const sessions = currSnapshots.reduce((s, d) => s + d.sessions, 0);
    const prevSessions = prevSnapshots.reduce((s, d) => s + d.sessions, 0);
    const sessionsDelta = prevSessions > 0 ? Math.round(((sessions - prevSessions) / prevSessions) * 1000) / 10 : 0;

    const pageviews = currSnapshots.reduce((s, d) => s + d.pageviews, 0);
    const prevPageviews = prevSnapshots.reduce((s, d) => s + d.pageviews, 0);
    const pageviewsDelta = prevPageviews > 0 ? Math.round(((pageviews - prevPageviews) / prevPageviews) * 1000) / 10 : 0;

    const avgBounceRate = currSnapshots.length
      ? Math.round((currSnapshots.reduce((s, d) => s + (d.bounceRatePercent ?? 26.4), 0) / currSnapshots.length) * 10) / 10
      : 26.4;
    const prevBounceRate = prevSnapshots.length
      ? Math.round((prevSnapshots.reduce((s, d) => s + (d.bounceRatePercent ?? 28.1), 0) / prevSnapshots.length) * 10) / 10
      : 28.1;
    const bounceRateDelta = prevBounceRate > 0 ? Math.round((avgBounceRate - prevBounceRate) * 10) / 10 : 0;

    const avgDurationSec = currSnapshots.length
      ? Math.round(currSnapshots.reduce((s, d) => s + (d.avgSessionDurationSec ?? 204), 0) / currSnapshots.length)
      : 204;
    const prevDurationSec = prevSnapshots.length
      ? Math.round(prevSnapshots.reduce((s, d) => s + (d.avgSessionDurationSec ?? 195), 0) / prevSnapshots.length)
      : 195;
    const durationDelta = prevDurationSec > 0 ? Math.round(((avgDurationSec - prevDurationSec) / prevDurationSec) * 1000) / 10 : 0;

    // Pseudonymous demo sessions conforming to RFC 5737
    const pseudonymousSessions: PseudonymousSession[] = [
      {
        id: 'SES-2026-9041',
        visitorId: 'VIS-782',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۱:۴۵',
        rfcDocumentationIp: '198.51.100.14',
        deviceType: 'mobile',
        deviceModel: 'Apple iPhone 15 Pro (Safari / iOS 18)',
        browser: 'Mobile Safari 18.0',
        landingPage: '/',
        exitPage: '/checkout',
        durationSeconds: 312,
        pageviewsCount: 5,
        converted: true,
        orderId: 'ORD-1405-882101',
        journeySteps: ['صفحه اصلی /', 'استودیو چاپ سه‌بعدی /studio', 'انتخاب تیشرت مشکی اورسایز', 'آپلود آرت‌ورک نستعلیق', 'تکمیل سفارش و درگاه شاپرک'],
      },
      {
        id: 'SES-2026-9042',
        visitorId: 'VIS-491',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۱:۳۲',
        rfcDocumentationIp: '203.0.113.88',
        deviceType: 'desktop',
        deviceModel: 'Windows 11 PC (Chrome 128 / Desktop)',
        browser: 'Google Chrome 128.0',
        landingPage: '/catalog/hoodie-heavyweight',
        exitPage: '/cart',
        durationSeconds: 185,
        pageviewsCount: 3,
        converted: false,
        journeySteps: ['کاتالوگ هودی زمستانه', 'بررسی جدول سایزبندی', 'افزودن به سبد خرید'],
      },
      {
        id: 'SES-2026-9043',
        visitorId: 'VIS-319',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۱:۱۵',
        rfcDocumentationIp: '192.0.2.73',
        deviceType: 'mobile',
        deviceModel: 'Samsung Galaxy S24 Ultra (Chrome)',
        browser: 'Chrome Mobile 127.0',
        landingPage: '/studio',
        exitPage: '/studio',
        durationSeconds: 420,
        pageviewsCount: 4,
        converted: true,
        orderId: 'ORD-1405-882103',
        journeySteps: ['ورود مستقیم به آتلیه طراحی', 'تنظیم موکاپ جلو و پشت', 'انتخاب فونت ثلث', 'پرداخت فاکتور بانکی'],
      },
      {
        id: 'SES-2026-9044',
        visitorId: 'VIS-902',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۰:۵۰',
        rfcDocumentationIp: '198.51.100.56',
        deviceType: 'desktop',
        deviceModel: 'Apple Mac Studio (macOS 15 Sequoia)',
        browser: 'Safari 18.0',
        landingPage: '/catalog/oversized-tshirt',
        exitPage: '/catalog/oversized-tshirt',
        durationSeconds: 94,
        pageviewsCount: 2,
        converted: false,
        journeySteps: ['مشاهده تیشرت پنبه سوپر', 'بررسی جزئیات دوخت و پارچه'],
      },
      {
        id: 'SES-2026-9045',
        visitorId: 'VIS-104',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۰:۲۸',
        rfcDocumentationIp: '203.0.113.120',
        deviceType: 'tablet',
        deviceModel: 'Apple iPad Pro 13 (Safari / iPadOS)',
        browser: 'Mobile Safari 18.0',
        landingPage: '/',
        exitPage: '/checkout',
        durationSeconds: 275,
        pageviewsCount: 6,
        converted: true,
        orderId: 'ORD-1405-882105',
        journeySteps: ['صفحه اصلی کالکشن پاییزه', 'استودیو چاپ آنلاین', 'تایید فایل برداری SVG', 'پرداخت موفق شاپرک'],
      },
      {
        id: 'SES-2026-9046',
        visitorId: 'VIS-612',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۰۹:۴۰',
        rfcDocumentationIp: '192.0.2.145',
        deviceType: 'mobile',
        deviceModel: 'Xiaomi 14 (MIUI / Chrome)',
        browser: 'Chrome Mobile 128.0',
        landingPage: '/studio',
        exitPage: '/studio',
        durationSeconds: 140,
        pageviewsCount: 2,
        converted: false,
        journeySteps: ['ورود به طراح آنلاین از استوری اینستاگرام', 'تست چیدمان تایپوگرافی'],
      },
    ];

    // Security audit incidents using RFC 5737 documentation IPs
    const securityIncidents: SecurityAuditIncident[] = [
      {
        id: 'SEC-1405-01',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۱:۵۲:۱۰',
        rfcDocumentationIp: '198.51.100.201',
        threatCategory: 'bot_crawler',
        severity: 'medium',
        actionTaken: 'rate_limited',
        notes: 'خزشگر خودکار با یوزر ایجنت ناشناخته در حال فراخوانی مکرر کاتالوگ محصولات با نرخ ۴۰ درخواست در ثانیه.',
      },
      {
        id: 'SEC-1405-02',
        timestamp: '۱۴۰۵/۰۷/۰۲ ۱۱:۱۸:۴۵',
        rfcDocumentationIp: '203.0.113.99',
        threatCategory: 'brute_force_login',
        severity: 'critical',
        actionTaken: 'firewall_blocked',
        notes: 'تلاش مکرر ناموفق برای احراز هویت در روت /admin با گذرواژه‌های دیکشنری؛ آی‌پی در فایروال مسدود شد.',
      },
      {
        id: 'SEC-1405-03',
        timestamp: '۱۴۰5/۰۷/۰۲ ۱۰:۰۵:۲۲',
        rfcDocumentationIp: '192.0.2.180',
        threatCategory: 'suspicious_payment_flood',
        severity: 'high',
        actionTaken: 'captcha_enforced',
        notes: 'ارسال ۳ تلاش پیاپی برای تست تراکنش بدون تکمیل اطلاعات سبد خرید؛ چالش تایید انسانی فعال شد.',
      },
      {
        id: 'SEC-1405-04',
        timestamp: '۱۴۰۵/۰۷/۰۱ ۱۸:۴۰:۰۵',
        rfcDocumentationIp: '198.51.100.115',
        threatCategory: 'sql_injection_attempt',
        severity: 'high',
        actionTaken: 'firewall_blocked',
        notes: 'تزریق کاراکترهای اسکریپتی مشکوک در پارامتر جستجوی کاتالوگ؛ درخواست توسط فیلتر امنیتی WAF متوقف شد.',
      },
      {
        id: 'SEC-1405-05',
        timestamp: '۱۴۰۵/۰۷/۰۱ ۱۴:۲۲:۵۰',
        rfcDocumentationIp: '203.0.113.44',
        threatCategory: 'rate_limit_exceeded',
        severity: 'medium',
        actionTaken: 'rate_limited',
        notes: 'تخلف از محدودیت مصرف API موکاپ‌های سه‌بعدی؛ اعمال وقفه ۵ دقیقه‌ای بر روی سشن کاربر.',
      },
    ];

    return {
      timeframe,
      visitors,
      prevVisitors,
      visitorsDelta,
      sessions,
      prevSessions,
      sessionsDelta,
      pageviews,
      prevPageviews,
      pageviewsDelta,
      avgBounceRate,
      prevBounceRate,
      bounceRateDelta,
      avgDurationSec,
      prevDurationSec,
      durationDelta,
      newVisitorsPercent: 64,
      returningVisitorsPercent: 36,
      snapshots: currSnapshots,
      devices: [
        { label: 'گوشی موبایل (Mobile)', percentage: 68, sessions: Math.round(sessions * 0.68) },
        { label: 'رایانه دسکتاپ (Desktop)', percentage: 26, sessions: Math.round(sessions * 0.26) },
        { label: 'تبلت (Tablet)', percentage: 6, sessions: Math.round(sessions * 0.06) },
      ],
      browsers: [
        { name: 'Google Chrome', percentage: 54, sessions: Math.round(sessions * 0.54) },
        { name: 'Apple Safari', percentage: 34, sessions: Math.round(sessions * 0.34) },
        { name: 'Mozilla Firefox', percentage: 8, sessions: Math.round(sessions * 0.08) },
        { name: 'Samsung Internet', percentage: 4, sessions: Math.round(sessions * 0.04) },
      ],
      topLandingPages: [
        { path: '/', title: 'صفحه اصلی و کالکشن پاییزه', views: Math.round(pageviews * 0.42), bounceRate: 24.1 },
        { path: '/studio', title: 'استودیوی چاپ آنلاین و طراح سه‌بعدی', views: Math.round(pageviews * 0.28), bounceRate: 18.5 },
        { path: '/catalog/oversized-tshirt', title: 'تیشرت اورسایز پنبه سوپر', views: Math.round(pageviews * 0.16), bounceRate: 29.0 },
        { path: '/catalog/hoodie-heavyweight', title: 'هودی زمستانه سنگین', views: Math.round(pageviews * 0.09), bounceRate: 31.2 },
        { path: '/cart', title: 'سبد خرید', views: Math.round(pageviews * 0.05), bounceRate: 15.0 },
      ],
      topExitPages: [
        { path: '/checkout', title: 'تکمیل سفارش و درگاه شاپرک (خروج مثبت)', exits: Math.round(sessions * 0.24) },
        { path: '/cart', title: 'سبد خرید (رهاسازی)', exits: Math.round(sessions * 0.18) },
        { path: '/', title: 'صفحه اصلی', exits: Math.round(sessions * 0.16) },
        { path: '/studio', title: 'آتلیه طراحی بدون ثبت سفارش', exits: Math.round(sessions * 0.14) },
      ],
      pseudonymousSessions,
      securityIncidents,
    };
  }

  /**
   * Geographic Distribution Analytics Selector
   */
  public getGeographyAnalytics(timeframe: DateRangePreset = '30d') {
    const nowMs = new Date(this.state.demoClockIso).getTime();
    const timeframeDays = timeframe === 'today' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const thresholdMs = nowMs - timeframeDays * 24 * 3600 * 1000;

    const ordersInTimeframe = this.state.orders.filter((o) => {
      const oMs = new Date(o.createdAt).getTime();
      return oMs >= thresholdMs;
    });

    const totalOrders = ordersInTimeframe.length || 1;
    const totalRevenue = ordersInTimeframe.reduce((s, o) => s + o.totalTomans, 0);

    const provinceData: ProvinceGeoStat[] = [
      {
        province: 'تهران',
        majorHub: 'تهران، شمیرانات، ری و اسلامشهر',
        ordersCount: Math.round(totalOrders * 0.41),
        percentageShare: 41.0,
        revenueTomans: Math.round(totalRevenue * 0.41),
        averageLeadDays: 1.2,
        preferredCarrier: 'پیک اختصاصی تهران / تیپاکس',
      },
      {
        province: 'اصفهان',
        majorHub: 'اصفهان، کاشان و نجف‌آباد',
        ordersCount: Math.round(totalOrders * 0.18),
        percentageShare: 18.0,
        revenueTomans: Math.round(totalRevenue * 0.18),
        averageLeadDays: 2.1,
        preferredCarrier: 'تیپاکس اکسپرس',
      },
      {
        province: 'خراسان رضوی',
        majorHub: 'مشهد مقدس و نیشابور',
        ordersCount: Math.round(totalOrders * 0.13),
        percentageShare: 13.0,
        revenueTomans: Math.round(totalRevenue * 0.13),
        averageLeadDays: 2.6,
        preferredCarrier: 'پست پیشتاز هوایی',
      },
      {
        province: 'فارس',
        majorHub: 'شیراز و مرودشت',
        ordersCount: Math.round(totalOrders * 0.11),
        percentageShare: 11.0,
        revenueTomans: Math.round(totalRevenue * 0.11),
        averageLeadDays: 2.4,
        preferredCarrier: 'تیپاکس',
      },
      {
        province: 'آذربایجان شرقی',
        majorHub: 'تبریز و مراغه',
        ordersCount: Math.round(totalOrders * 0.07),
        percentageShare: 7.0,
        revenueTomans: Math.round(totalRevenue * 0.07),
        averageLeadDays: 2.8,
        preferredCarrier: 'پست پیشتاز',
      },
      {
        province: 'سایر استان‌ها',
        majorHub: 'گیلان، مازندران، خوزستان، البرز و یزد',
        ordersCount: Math.round(totalOrders * 0.07),
        percentageShare: 7.0,
        revenueTomans: Math.round(totalRevenue * 0.07),
        averageLeadDays: 3.2,
        preferredCarrier: 'پست پیشتاز / چاپار',
      },
      {
        province: 'نامشخص / پروکسی و مسیریابی امن',
        majorHub: 'اتصال با VPN یا شبکه امنیتی خصوصی',
        ordersCount: Math.max(1, Math.round(totalOrders * 0.03)),
        percentageShare: 3.0,
        revenueTomans: Math.round(totalRevenue * 0.03),
        averageLeadDays: 2.5,
        preferredCarrier: 'توزیع به آدرس پستی مقصد فاکتور',
        isUnknownOrProxy: true,
      },
    ];

    return {
      timeframe,
      totalOrders,
      totalRevenue,
      coveredProvincesCount: 18,
      leadProvince: 'تهران (۴۱.۰٪)',
      averageNationalLeadDays: 2.2,
      provinces: provinceData,
    };
  }

  /**
   * Acquisition & UTM Channels Analytics Selector
   */
  public getAcquisitionAnalytics(timeframe: DateRangePreset = '30d') {
    const channels = [...this.state.analytics.channelAttribution];
    const totalSessions = channels.reduce((s, c) => s + c.sessionsCount, 0);
    const totalRevenue = channels.reduce((s, c) => s + c.revenueTomans, 0);

    const utmCampaigns: UtmCampaignStat[] = [
      {
        source: 'instagram',
        medium: 'story_swipe',
        campaign: 'autumn_drop_2026',
        content: 'hero_hoodie_video',
        channelCategory: 'شبکه‌های اجتماعی',
        sessions: 8400,
        orders: 285,
        conversionRatePercent: 3.39,
        attributedRevenueTomans: 16800000,
      },
      {
        source: 'instagram',
        medium: 'bio_link',
        campaign: 'dtg_custom_launch',
        content: 'studio_3d_cta',
        channelCategory: 'شبکه‌های اجتماعی',
        sessions: 5800,
        orders: 203,
        conversionRatePercent: 3.5,
        attributedRevenueTomans: 11600000,
      },
      {
        source: 'google',
        medium: 'organic_search',
        campaign: 'seo_calligraphy_tshirt',
        content: 'high_intent_keyword',
        channelCategory: 'موتورهای جستجو',
        sessions: 8400,
        orders: 244,
        conversionRatePercent: 2.9,
        attributedRevenueTomans: 14100000,
      },
      {
        source: 'direct',
        medium: 'none',
        campaign: 'direct_brand_entry',
        content: 'browser_bookmark',
        channelCategory: 'برندینگ مستقیم',
        sessions: 9800,
        orders: 470,
        conversionRatePercent: 4.8,
        attributedRevenueTomans: 22600000,
      },
      {
        source: 'telegram',
        medium: 'channel_post',
        campaign: 'flash_sale_weekend',
        content: 'coupon_card_banner',
        channelCategory: 'پیام‌رسان‌ها',
        sessions: 4100,
        orders: 86,
        conversionRatePercent: 2.1,
        attributedRevenueTomans: 5900000,
      },
      {
        source: 'torob',
        medium: 'price_comparison',
        campaign: 'marketplace_feed',
        content: 'oversized_black_box',
        channelCategory: 'موتورهای جستجوی کالا',
        sessions: 3200,
        orders: 122,
        conversionRatePercent: 3.81,
        attributedRevenueTomans: 6200000,
      },
      {
        source: 'influencer_collab',
        medium: 'referral',
        campaign: 'calligraphy_artists',
        content: 'nastaliq_artist_drop',
        channelCategory: 'همکاری تجاری',
        sessions: 1950,
        orders: 58,
        conversionRatePercent: 2.97,
        attributedRevenueTomans: 3800000,
      },
    ];

    return {
      timeframe,
      totalSessions,
      totalRevenue,
      channels,
      utmCampaigns,
    };
  }

  public getSalesAnalytics(
    timeframe: DateRangePreset = '30d',
    customStart?: string,
    customEnd?: string
  ): SalesAnalyticsData {
    const nowMs = new Date(this.state.demoClockIso).getTime();

    let timeframeDays: number;
    let thresholdMs: number;
    let endMs: number;
    let startDateIso: string;
    let endDateIso: string;

    if (customStart && customEnd) {
      startDateIso = customStart;
      endDateIso = customEnd;
      thresholdMs = new Date(customStart).getTime();
      endMs = new Date(customEnd + 'T23:59:59.999Z').getTime();
      timeframeDays = Math.max(1, Math.round((endMs - thresholdMs) / (24 * 3600 * 1000)));
    } else {
      timeframeDays = timeframe === 'today' ? 1 : timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
      endMs = nowMs;
      thresholdMs = nowMs - timeframeDays * 24 * 3600 * 1000;
      startDateIso = new Date(thresholdMs).toISOString().slice(0, 10);
      endDateIso = new Date(nowMs).toISOString().slice(0, 10);
    }

    const prevThresholdMs = thresholdMs - timeframeDays * 24 * 3600 * 1000;

    // Current window orders
    const currOrders = this.state.orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= thresholdMs && t <= endMs;
    });

    // Previous window orders (for true delta calculations)
    const prevOrders = this.state.orders.filter((o) => {
      const t = new Date(o.createdAt).getTime();
      return t >= prevThresholdMs && t < thresholdMs;
    });

    // Status classifications
    const verifiedPaidOrders = currOrders.filter((o) => o.paymentStatus === 'verified_paid');
    const prevVerifiedPaidOrders = prevOrders.filter((o) => o.paymentStatus === 'verified_paid');

    const refundedOrders = currOrders.filter((o) => o.paymentStatus === 'refunded' || o.status === 'refunded');
    const prevRefundedOrders = prevOrders.filter((o) => o.paymentStatus === 'refunded' || o.status === 'refunded');

    const pendingOrders = currOrders.filter((o) => o.paymentStatus === 'pending');
    const failedOrders = currOrders.filter((o) => o.paymentStatus === 'failed');

    // Requested refunds (Distinguish refunds already processed from requested refunds)
    const requestedRefundOrders = currOrders.filter(
      (o) =>
        (o.status === 'paid_processing' && o.notes && (o.notes.includes('مرجوع') || o.notes.includes('انصراف') || o.notes.includes('سایز'))) ||
        (o.status === 'cancelled' && o.paymentStatus === 'verified_paid')
    );
    // Ensure at least 1 requested refund is visible for illustrative audit if none explicitly matched
    const requestedRefundsTomans = requestedRefundOrders.length > 0
      ? requestedRefundOrders.reduce((s, o) => s + o.totalTomans, 0)
      : (currOrders.find((o) => o.status === 'paid_processing')?.totalTomans || 1350000);
    const requestedRefundsCount = requestedRefundOrders.length > 0 ? requestedRefundOrders.length : 1;

    // Helper for percentage delta
    const calcDelta = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

    // Gross Order Value: Sum of line items subtotal + shippingFee before discount
    const grossOrderValueTomans = verifiedPaidOrders.reduce(
      (sum, o) => sum + (o.subtotalTomans + o.shippingFeeTomans),
      0
    );
    const prevGrossOrderValueTomans = prevVerifiedPaidOrders.reduce(
      (sum, o) => sum + (o.subtotalTomans + o.shippingFeeTomans),
      0
    );
    const grossOrderValueDeltaPercent = calcDelta(grossOrderValueTomans, prevGrossOrderValueTomans);

    // Discounts
    const discountsTomans = verifiedPaidOrders.reduce((sum, o) => sum + o.discountTomans, 0);
    const discountedOrdersCount = verifiedPaidOrders.filter((o) => o.discountTomans > 0).length;
    const prevDiscountsTomans = prevVerifiedPaidOrders.reduce((sum, o) => sum + o.discountTomans, 0);
    const discountsDeltaPercent = calcDelta(discountsTomans, prevDiscountsTomans);

    // Captured / Verified Payments (Revenue settled via Gateway)
    // Note: totalTomans = subtotalTomans + shippingFeeTomans - discountTomans.
    // Mathematically: grossOrderValueTomans - discountsTomans === capturedPaymentsTomans!
    const capturedPaymentsTomans = verifiedPaidOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const capturedPaymentsCount = verifiedPaidOrders.length;
    const prevCapturedPaymentsTomans = prevVerifiedPaidOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const capturedPaymentsDeltaPercent = calcDelta(capturedPaymentsTomans, prevCapturedPaymentsTomans);

    // Processed Refunds (Already returned to customer accounts)
    const processedRefundsTomans = refundedOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const processedRefundsCount = refundedOrders.length;
    const prevProcessedRefundsTomans = prevRefundedOrders.reduce((sum, o) => sum + o.totalTomans, 0);

    // Net Sales (Captured payments minus processed refunds)
    const netSalesTomans = capturedPaymentsTomans - processedRefundsTomans;
    const prevNetSalesTomans = prevCapturedPaymentsTomans - prevProcessedRefundsTomans;
    const netSalesDeltaPercent = calcDelta(netSalesTomans, prevNetSalesTomans);

    // Shipping Collected
    const shippingCollectedTomans = verifiedPaidOrders.reduce((sum, o) => sum + o.shippingFeeTomans, 0);
    const prevShippingCollectedTomans = prevVerifiedPaidOrders.reduce((sum, o) => sum + o.shippingFeeTomans, 0);
    const shippingCollectedDeltaPercent = calcDelta(shippingCollectedTomans, prevShippingCollectedTomans);

    // Initiated / Pending / Failed (Strictly NOT revenue)
    const initiatedPendingPaymentsTomans = pendingOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const initiatedPendingPaymentsCount = pendingOrders.length;
    const failedPaymentsTomans = failedOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const failedPaymentsCount = failedOrders.length;

    // Refund Rate
    const totalFinishedOrders = capturedPaymentsCount + processedRefundsCount;
    const refundRatePercent =
      totalFinishedOrders > 0
        ? Math.round((processedRefundsCount / totalFinishedOrders) * 1000) / 10
        : 0;
    const prevFinishedOrders = prevVerifiedPaidOrders.length + prevRefundedOrders.length;
    const prevRefundRatePercent =
      prevFinishedOrders > 0
        ? Math.round((prevRefundedOrders.length / prevFinishedOrders) * 1000) / 10
        : 0;
    const refundRateDeltaPercent = Math.round((refundRatePercent - prevRefundRatePercent) * 10) / 10;

    // AOV & Volumes
    const averageOrderValueTomans =
      capturedPaymentsCount > 0 ? Math.round(capturedPaymentsTomans / capturedPaymentsCount) : 0;
    const prevAovTomans =
      prevVerifiedPaidOrders.length > 0
        ? Math.round(prevCapturedPaymentsTomans / prevVerifiedPaidOrders.length)
        : 0;
    const aovDeltaPercent = calcDelta(averageOrderValueTomans, prevAovTomans);
    const verifiedOrdersDeltaPercent = calcDelta(capturedPaymentsCount, prevVerifiedPaidOrders.length);

    // Costs Estimation (Based on Shahpoosh Workshop Fixtures)
    let estimatedRawCogsTomans = 0;
    let estimatedPrintingCostTomans = 0;
    let itemsSoldCount = 0;

    for (const o of verifiedPaidOrders) {
      for (const item of o.items) {
        itemsSoldCount += item.quantity;
        const pName = item.productName.toLowerCase();
        // Raw garment blank cost
        let unitGarment = 340000;
        if (pName.includes('هودی') || pName.includes('سویشرت')) {
          unitGarment = 680000;
        } else if (pName.includes('کلاه') || pName.includes('بیسیک')) {
          unitGarment = 220000;
        } else {
          unitGarment = Math.round(item.unitPriceTomans * 0.32);
        }
        estimatedRawCogsTomans += unitGarment * item.quantity;

        // Print & curing cost
        let unitPrint = 75000;
        if (item.isCustomPod || item.customDesignId) {
          unitPrint = 155000; // DTG 300DPI custom artwork
        } else if (pName.includes('بیسیک') && !pName.includes('چاپ')) {
          unitPrint = 0;
        }
        estimatedPrintingCostTomans += unitPrint * item.quantity;
      }
    }

    const estimatedPackagingCostTomans = verifiedPaidOrders.length * 45000; // Luxury box + hangtag + seal
    const estimatedGatewayFeesTomans = verifiedPaidOrders.reduce((sum, o) => {
      // Shaparak gateway fee: 1% capped at 4,000 Tomans, minimum 1,200 Tomans
      const fee = Math.min(4000, Math.max(1200, Math.round(o.totalTomans * 0.01)));
      return sum + fee;
    }, 0);

    const totalEstimatedDirectCostsTomans =
      estimatedRawCogsTomans +
      estimatedPrintingCostTomans +
      estimatedPackagingCostTomans +
      estimatedGatewayFeesTomans;

    const estimatedGrossMarginTomans = netSalesTomans - totalEstimatedDirectCostsTomans;
    const estimatedGrossMarginPercent =
      netSalesTomans > 0 ? Math.round((estimatedGrossMarginTomans / netSalesTomans) * 1000) / 10 : 0;

    // Previous window costs for margin delta
    const prevDirectCosts = Math.round(prevNetSalesTomans * 0.42);
    const prevMargin = prevNetSalesTomans - prevDirectCosts;
    const prevMarginPercent = prevNetSalesTomans > 0 ? Math.round((prevMargin / prevNetSalesTomans) * 1000) / 10 : 0;
    const marginDeltaPercent = Math.round((estimatedGrossMarginPercent - prevMarginPercent) * 10) / 10;

    const avgItemsPerOrder =
      capturedPaymentsCount > 0 ? Math.round((itemsSoldCount / capturedPaymentsCount) * 10) / 10 : 1;

    // Standard vs Custom Revenue Split
    let standardRevenueTomans = 0;
    let standardOrdersCount = 0;
    let customRevenueTomans = 0;
    let customOrdersCount = 0;

    for (const o of verifiedPaidOrders) {
      if (o.hasCustomLineItem) {
        customOrdersCount++;
        customRevenueTomans += o.totalTomans;
      } else {
        standardOrdersCount++;
        standardRevenueTomans += o.totalTomans;
      }
    }

    const standardRevenuePercent =
      capturedPaymentsTomans > 0 ? Math.round((standardRevenueTomans / capturedPaymentsTomans) * 100) : 0;
    const customRevenuePercent = 100 - standardRevenuePercent;

    // Category Ranking
    const categoryMap = new Map<
      string,
      { label: string; count: number; items: number; revenue: number }
    >();

    categoryMap.set('calligraphy', {
      label: 'خوشنویسی و تایپوگرافی اصیل',
      count: 0,
      items: 0,
      revenue: 0,
    });
    categoryMap.set('graphic', {
      label: 'گرافیک و استریت‌ویر مدرن',
      count: 0,
      items: 0,
      revenue: 0,
    });
    categoryMap.set('minimalist', {
      label: 'طرح‌های مینیمال و نشانه‌شناسی',
      count: 0,
      items: 0,
      revenue: 0,
    });
    categoryMap.set('custom_pod', {
      label: 'سفارشات شخصی‌سازی‌شده آتلیه',
      count: 0,
      items: 0,
      revenue: 0,
    });

    for (const o of verifiedPaidOrders) {
      for (const it of o.items) {
        const prod = this.state.products.find((p) => p.id === it.productId);
        const catKey = it.isCustomPod ? 'custom_pod' : prod?.category || 'calligraphy';
        const entry = categoryMap.get(catKey) || {
          label: 'سایر محصولات',
          count: 0,
          items: 0,
          revenue: 0,
        };
        entry.count++;
        entry.items += it.quantity;
        entry.revenue += it.subtotalTomans;
        categoryMap.set(catKey, entry);
      }
    }

    const totalCatRev = Array.from(categoryMap.values()).reduce((s, c) => s + c.revenue, 0) || 1;
    const categoryStats: CategorySalesStat[] = Array.from(categoryMap.entries()).map(([key, val]) => ({
      category: key,
      categoryLabelFa: val.label,
      ordersCount: val.count,
      itemsSoldCount: val.items,
      revenueTomans: val.revenue,
      sharePercent: Math.round((val.revenue / totalCatRev) * 100),
      estimatedMarginPercent: key === 'custom_pod' ? 63.7 : key === 'calligraphy' ? 64.2 : 58.5,
    }));

    // Top SKUs Ranking
    const skuMap = new Map<
      string,
      {
        productId: string;
        productName: string;
        category: string;
        size: string;
        colorName: string;
        unitPrice: number;
        qty: number;
        revenue: number;
      }
    >();

    for (const o of verifiedPaidOrders) {
      for (const it of o.items) {
        const prod = this.state.products.find((p) => p.id === it.productId);
        const existing = skuMap.get(it.variantSku) || {
          productId: it.productId,
          productName: it.productName,
          category: prod?.category || 'calligraphy',
          size: it.size,
          colorName: it.colorName,
          unitPrice: it.unitPriceTomans,
          qty: 0,
          revenue: 0,
        };
        existing.qty += it.quantity;
        existing.revenue += it.subtotalTomans;
        skuMap.set(it.variantSku, existing);
      }
    }

    const sortedSkus = Array.from(skuMap.entries())
      .map(([sku, data]) => {
        const estimatedUnitCost = Math.round(data.unitPrice * 0.38) + 85000;
        const totalCost = estimatedUnitCost * data.qty;
        const profit = data.revenue - totalCost;
        return {
          sku,
          productId: data.productId,
          productName: data.productName,
          category: data.category,
          size: data.size,
          colorName: data.colorName,
          unitPriceTomans: data.unitPrice,
          quantitySold: data.qty,
          totalRevenueTomans: data.revenue,
          sharePercent: capturedPaymentsTomans > 0 ? Math.round((data.revenue / capturedPaymentsTomans) * 1000) / 10 : 0,
          estimatedCostTomans: totalCost,
          estimatedProfitTomans: profit,
          marginPercent: data.revenue > 0 ? Math.round((profit / data.revenue) * 1000) / 10 : 0,
        };
      })
      .sort((a, b) => b.totalRevenueTomans - a.totalRevenueTomans);

    const topSkus = sortedSkus.slice(0, 10);

    // Unit Economics Fixture Items (Deterministic Workshop Economics)
    const unitEconomics: UnitEconomicsItem[] = [
      {
        id: 'UE-01',
        title: 'تیشرت قواره آزاد خوشنویسی «هیچ» (پنبه ۲۸۰ گرم)',
        type: 'catalog_standard',
        sellingPriceTomans: 1350000,
        rawGarmentCostTomans: 360000,
        printCostTomans: 85000,
        packagingCostTomans: 45000,
        gatewayFeeTomans: 4000,
        totalDirectCostTomans: 494000,
        grossContributionTomans: 856000,
        grossMarginPercent: 63.4,
        notes: 'محبوب‌ترین آیتم کالکشن پاییزه؛ چاپ تثبیت‌شده با پرس حرارتی ۱۶۰ درجه',
      },
      {
        id: 'UE-02',
        title: 'هودی اورسایز نستعلیق ۳ نخ خارخورده ۴۰۰ گرم',
        type: 'catalog_standard',
        sellingPriceTomans: 2650000,
        rawGarmentCostTomans: 780000,
        printCostTomans: 120000,
        packagingCostTomans: 45000,
        gatewayFeeTomans: 4000,
        totalDirectCostTomans: 949000,
        grossContributionTomans: 1701000,
        grossMarginPercent: 64.2,
        notes: 'حداکثر سود ناخالص سبد؛ پارچه سنگین گرم زمستانه با جیب کانگورویی',
      },
      {
        id: 'UE-03',
        title: 'تیشرت اختصاصی آتلیه طراحی آنلاین (چاپ تکی برداری)',
        type: 'custom_pod',
        sellingPriceTomans: 1580000,
        rawGarmentCostTomans: 360000,
        printCostTomans: 165000,
        packagingCostTomans: 45000,
        gatewayFeeTomans: 4000,
        totalDirectCostTomans: 574000,
        grossContributionTomans: 1006000,
        grossMarginPercent: 63.7,
        notes: 'چاپ مستقیم دیجیتال رزولوشن ۳۰۰DPI بدون شابلون اولیه و پروسس تکی',
      },
      {
        id: 'UE-04',
        title: 'تیشرت بیسیک قواره آزاد بدون چاپ (مشکی عمیق)',
        type: 'catalog_standard',
        sellingPriceTomans: 890000,
        rawGarmentCostTomans: 320000,
        printCostTomans: 0,
        packagingCostTomans: 45000,
        gatewayFeeTomans: 4000,
        totalDirectCostTomans: 369000,
        grossContributionTomans: 521000,
        grossMarginPercent: 58.5,
        notes: 'بدون هزینه جوهر و عمل‌آوری؛ حاشیه پایین‌تر اما سرعت ارسال فوری',
      },
      {
        id: 'UE-05',
        title: 'کلاه کپ کتان سنگ‌شور با گلدوزی تایپوگرافی',
        type: 'catalog_standard',
        sellingPriceTomans: 680000,
        rawGarmentCostTomans: 190000,
        printCostTomans: 65000,
        packagingCostTomans: 45000,
        gatewayFeeTomans: 4000,
        totalDirectCostTomans: 304000,
        grossContributionTomans: 376000,
        grossMarginPercent: 55.3,
        notes: 'آیتم مکمل سبد خرید جهت افزایش میانگین ارزش فاکتور (AOV)',
      },
    ];

    // Timeline Snapshots
    // Use daily snapshots from repository or group orders by date
    const snapshotsSlice = this.state.analytics.dailySnapshots.slice(-timeframeDays);
    const timeline: SalesTimelinePoint[] = snapshotsSlice.map((s) => {
      const gross = s.grossSalesTomans;
      const ref = s.refundsTomans;
      const net = gross - ref; // Handles zero or negative net adjustments
      const aov = s.ordersCount > 0 ? Math.round(gross / s.ordersCount) : 0;
      return {
        date: s.date,
        dateLabelFa: s.date.slice(5),
        grossSalesTomans: gross,
        refundsTomans: ref,
        netSalesTomans: net,
        ordersCount: s.ordersCount,
        aovTomans: aov,
      };
    });

    return {
      timeframe,
      timeframeDays,
      startDateIso,
      endDateIso,
      grossOrderValueTomans,
      grossOrderValueDeltaPercent,
      discountsTomans,
      discountedOrdersCount,
      discountsDeltaPercent,
      capturedPaymentsTomans,
      capturedPaymentsCount,
      capturedPaymentsDeltaPercent,
      processedRefundsTomans,
      processedRefundsCount,
      requestedRefundsTomans,
      requestedRefundsCount,
      refundRatePercent,
      refundRateDeltaPercent,
      netSalesTomans,
      netSalesDeltaPercent,
      shippingCollectedTomans,
      shippingCollectedDeltaPercent,
      initiatedPendingPaymentsTomans,
      initiatedPendingPaymentsCount,
      failedPaymentsTomans,
      failedPaymentsCount,
      estimatedRawCogsTomans,
      estimatedPrintingCostTomans,
      estimatedPackagingCostTomans,
      estimatedGatewayFeesTomans,
      totalEstimatedDirectCostsTomans,
      estimatedGrossMarginTomans,
      estimatedGrossMarginPercent,
      marginDeltaPercent,
      verifiedOrdersCount: capturedPaymentsCount,
      verifiedOrdersDeltaPercent,
      averageOrderValueTomans,
      aovDeltaPercent,
      itemsSoldCount,
      avgItemsPerOrder,
      standardRevenueTomans,
      standardRevenuePercent,
      standardOrdersCount,
      customRevenueTomans,
      customRevenuePercent,
      customOrdersCount,
      timeline,
      categoryStats,
      topSkus,
      unitEconomics,
    };
  }

  public getOrders(filters?: {
    status?: OrderStatus | 'all';
    paymentStatus?: string;
    search?: string;
    hasCustom?: boolean;
    datePreset?: DateRangePreset;
    page?: number;
    pageSize?: number;
  }) {
    let list = [...this.state.orders];
    const nowMs = new Date(this.state.demoClockIso).getTime();

    if (filters?.datePreset && filters.datePreset !== 'all') {
      const days = filters.datePreset === 'today' ? 1 : filters.datePreset === '7d' ? 7 : filters.datePreset === '30d' ? 30 : 90;
      const cutoff = nowMs - days * 24 * 3600 * 1000;
      list = list.filter((o) => new Date(o.createdAt).getTime() >= cutoff);
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((o) => o.status === filters.status);
    }

    if (filters?.paymentStatus && filters.paymentStatus !== 'all') {
      list = list.filter((o) => o.paymentStatus === filters.paymentStatus);
    }

    if (filters?.hasCustom !== undefined) {
      list = list.filter((o) => o.hasCustomLineItem === filters.hasCustom);
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.customerPhone.includes(q) ||
          o.city.toLowerCase().includes(q)
      );
    }

    // Sort by createdAt descending
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 15;
    const total = list.length;
    const totalPages = Math.ceil(total / pageSize);
    const paginated = list.slice((page - 1) * pageSize, page * pageSize);

    return {
      items: paginated,
      total,
      page,
      pageSize,
      totalPages,
    };
  }

  public getOrderById(orderId: string) {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const customer = this.state.customers.find((c) => c.id === order.customerId);
    const payment = this.state.payments.find((p) => p.orderId === order.id);
    const shipment = this.state.shipments.find((s) => s.orderId === order.id);
    const jobs = this.state.productionJobs.filter((j) => j.orderId === order.id);
    const designs = this.state.customDesigns.filter((d) => d.orderId === order.id);

    return {
      order,
      customer,
      payment,
      shipment,
      jobs,
      designs,
    };
  }

  public getProductById(id: string): AdminProduct | undefined {
    return this.state.products.find((p) => p.id === id);
  }

  public getCategoryById(id: string): AdminCategory | undefined {
    return this.state.categories?.find((c) => c.id === id);
  }

  public getCollectionById(id: string): AdminCollection | undefined {
    return this.state.collections?.find((c) => c.id === id);
  }

  public getCategories(): AdminCategory[] {
    return this.state.categories || [];
  }

  public getCollections(): AdminCollection[] {
    return this.state.collections || [];
  }

  public getMediaAssets(): MediaAsset[] {
    return this.state.mediaAssets || [];
  }

  public getProducts(filters?: {
    category?: string;
    status?: string;
    productType?: string;
    search?: string;
    isCustomizable?: boolean;
    lowStockOnly?: boolean;
    sortBy?: 'date_desc' | 'date_asc' | 'price_desc' | 'price_asc' | 'name_asc' | 'stock_desc';
  }) {
    let list = [...this.state.products];

    if (filters?.category && filters.category !== 'all') {
      list = list.filter((p) => p.category === filters.category);
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((p) => (p.status || (p.isLive ? 'active' : 'draft')) === filters.status);
    }

    if (filters?.productType && filters.productType !== 'all') {
      list = list.filter((p) => (p.productType || 'finished') === filters.productType);
    }

    if (filters?.isCustomizable !== undefined) {
      list = list.filter((p) => p.isCustomizable === filters.isCustomizable);
    }

    if (filters?.lowStockOnly) {
      list = list.filter((p) =>
        p.variants.some((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold)
      );
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q) ||
          p.skuPrefix.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price_desc':
          list.sort((a, b) => b.basePriceTomans - a.basePriceTomans);
          break;
        case 'price_asc':
          list.sort((a, b) => a.basePriceTomans - b.basePriceTomans);
          break;
        case 'name_asc':
          list.sort((a, b) => a.name.localeCompare(b.name, 'fa'));
          break;
        case 'stock_desc':
          list.sort((a, b) => {
            const stockA = a.variants.reduce((acc, v) => acc + (v.onHandStock - v.reservedStock), 0);
            const stockB = b.variants.reduce((acc, v) => acc + (v.onHandStock - v.reservedStock), 0);
            return stockB - stockA;
          });
          break;
        case 'date_asc':
          list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
          break;
        case 'date_desc':
        default:
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
      }
    }

    return list;
  }

  public getVariants(filters?: {
    lowStockOnly?: boolean;
    search?: string;
  }) {
    let list = [...this.state.variants];

    if (filters?.lowStockOnly) {
      list = list.filter((v) => v.onHandStock - v.reservedStock <= v.minStockThreshold);
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (v) => v.sku.toLowerCase().includes(q) || v.colorName.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getCustomers(filters?: {
    tag?: string;
    search?: string;
  }) {
    let list = [...this.state.customers];

    if (filters?.tag && filters.tag !== 'all') {
      list = list.filter((c) => c.tag === filters.tag);
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q)
      );
    }

    // Sort by highest spenders
    list.sort((a, b) => b.totalSpentTomans - a.totalSpentTomans);
    return list;
  }

  /**
   * Complete Customer Dossier / Detail Selector
   * Calculates LTV = Verified Paid Spend - Processed Refunds, and returns isolated customer-specific data
   */
  public getCustomerDetails(customerId: string): CustomerDetailData | null {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const orders = this.state.orders
      .filter((o) => o.customerId === customerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const payments = this.state.payments
      .filter((p) => p.customerId === customerId || orders.some((o) => o.id === p.orderId))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const customDesigns = this.state.customDesigns
      .filter((d) => d.customerId === customerId || orders.some((o) => o.id === d.orderId));

    const shipments = (this.state.shipments || [])
      .filter((s) => s.customerId === customerId || orders.some((o) => o.id === s.orderId));

    const supportTickets = customer.supportTickets || [];
    const reviews = customer.reviews || [];
    const staffNotes = customer.staffNotes || [];
    const auditTrail = customer.auditTrail || [];
    const addresses = customer.addresses || [];
    const savedFavorites = customer.savedFavorites || [];
    const cartItems = customer.cartItems || [];
    const browsingEvents = customer.browsingEvents || [];

    // Verified Paid Orders & Spend
    const verifiedPaidOrders = orders.filter((o) => o.paymentStatus === 'verified_paid');
    const verifiedPaidSpendTomans = verifiedPaidOrders.reduce((sum, o) => sum + o.totalTomans, 0);

    // Processed Refunds: deduct refunds on customer's orders
    const processedRefundsTomans = orders.reduce((sum, o) => {
      const pay = payments.find((p) => p.orderId === o.id);
      const refAmt = pay?.refundedAmountTomans ?? (o.paymentStatus === 'refunded' ? o.totalTomans : 0);
      return sum + refAmt;
    }, 0);

    const netLtvSpendTomans = Math.max(0, verifiedPaidSpendTomans - processedRefundsTomans);
    const averageOrderValueTomans = verifiedPaidOrders.length > 0
      ? Math.round(netLtvSpendTomans / verifiedPaidOrders.length)
      : 0;

    const dates = orders.map((o) => new Date(o.createdAt).getTime()).filter((t) => !isNaN(t));
    const firstOrderDate = dates.length > 0 ? new Date(Math.min(...dates)).toISOString() : undefined;
    const lastOrderDate = dates.length > 0 ? new Date(Math.max(...dates)).toISOString() : undefined;
    const hasCustomOrders = orders.some((o) => o.hasCustomLineItem) || customDesigns.length > 0;

    return {
      customer,
      orders,
      payments,
      customDesigns,
      shipments,
      supportTickets,
      reviews,
      staffNotes,
      auditTrail,
      addresses,
      savedFavorites,
      cartItems,
      browsingEvents,
      totalOrdersCount: orders.length,
      verifiedPaidOrdersCount: verifiedPaidOrders.length,
      verifiedPaidSpendTomans,
      processedRefundsTomans,
      netLtvSpendTomans,
      averageOrderValueTomans,
      firstOrderDate,
      lastOrderDate,
      hasCustomOrders,
    };
  }

  /**
   * Filtered & Segmented Customers List Selector
   */
  public getCustomersList(options?: {
    search?: string;
    segment?: 'all' | 'first_time' | 'repeat' | 'recently_active' | 'inactive' | 'custom_design' | 'high_spend';
    orderType?: 'all' | 'has_custom' | 'standard_only';
    province?: string;
    status?: 'all' | 'active' | 'inactive' | 'deactivated';
    sortBy?: 'ltv_desc' | 'ltv_asc' | 'orders_desc' | 'recent_active' | 'date_desc' | 'name';
  }) {
    const now = new Date(this.state.demoClockIso || DEMO_CLOCK_ISO).getTime();
    const HIGH_SPEND_THRESHOLD_TOMANS = 2_000_000;

    let items = [...this.state.customers];

    // Compute live per-customer metrics for filtering and sorting
    const customerMetrics = new Map<string, {
      totalOrders: number;
      paidSpend: number;
      refunds: number;
      netLtv: number;
      hasCustom: boolean;
      daysSinceActive: number;
    }>();

    for (const c of this.state.customers) {
      const custOrders = this.state.orders.filter((o) => o.customerId === c.id);
      const paidOrders = custOrders.filter((o) => o.paymentStatus === 'verified_paid');
      const paidSpend = paidOrders.reduce((sum, o) => sum + o.totalTomans, 0);
      const refunds = custOrders
        .filter((o) => o.paymentStatus === 'refunded')
        .reduce((sum, o) => sum + o.totalTomans, 0);
      const netLtv = Math.max(0, paidSpend - refunds);
      const hasCustom = custOrders.some((o) => o.hasCustomLineItem) ||
        this.state.customDesigns.some((d) => d.customerId === c.id);
      const activeMs = new Date(c.lastActiveAt).getTime();
      const daysSinceActive = isNaN(activeMs) ? 999 : Math.max(0, Math.floor((now - activeMs) / (1000 * 60 * 60 * 24)));

      customerMetrics.set(c.id, {
        totalOrders: custOrders.length,
        paidSpend,
        refunds,
        netLtv,
        hasCustom,
        daysSinceActive,
      });
    }

    // Segments count across all fixture customers
    const segmentsCount = {
      all: this.state.customers.length,
      first_time: 0,
      repeat: 0,
      recently_active: 0,
      inactive: 0,
      custom_design: 0,
      high_spend: 0,
    };

    for (const c of this.state.customers) {
      const m = customerMetrics.get(c.id)!;
      if (m.totalOrders === 1) segmentsCount.first_time++;
      if (m.totalOrders >= 2) segmentsCount.repeat++;
      if (m.daysSinceActive <= 30) segmentsCount.recently_active++;
      if (m.daysSinceActive > 30) segmentsCount.inactive++;
      if (m.hasCustom) segmentsCount.custom_design++;
      if (m.netLtv >= HIGH_SPEND_THRESHOLD_TOMANS) segmentsCount.high_spend++;
    }

    // Filter by search (name, phone, email, id, city, province)
    if (options?.search) {
      const q = options.search.trim().toLowerCase();
      items = items.filter((c) => {
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.city.toLowerCase().includes(q) ||
          c.province.toLowerCase().includes(q)
        );
      });
    }

    // Filter by segment
    if (options?.segment && options.segment !== 'all') {
      items = items.filter((c) => {
        const m = customerMetrics.get(c.id)!;
        switch (options.segment) {
          case 'first_time':
            return m.totalOrders === 1;
          case 'repeat':
            return m.totalOrders >= 2;
          case 'recently_active':
            return m.daysSinceActive <= 30;
          case 'inactive':
            return m.daysSinceActive > 30;
          case 'custom_design':
            return m.hasCustom;
          case 'high_spend':
            return m.netLtv >= HIGH_SPEND_THRESHOLD_TOMANS;
          default:
            return true;
        }
      });
    }

    // Filter by orderType
    if (options?.orderType && options.orderType !== 'all') {
      items = items.filter((c) => {
        const m = customerMetrics.get(c.id)!;
        if (options.orderType === 'has_custom') return m.hasCustom;
        if (options.orderType === 'standard_only') return !m.hasCustom && m.totalOrders > 0;
        return true;
      });
    }

    // Filter by province
    if (options?.province && options.province !== 'all') {
      items = items.filter((c) => c.province === options.province);
    }

    // Filter by status
    if (options?.status && options.status !== 'all') {
      items = items.filter((c) => c.status === options.status);
    }

    // Sorting
    const sort = options?.sortBy || 'ltv_desc';
    items.sort((a, b) => {
      const mA = customerMetrics.get(a.id)!;
      const mB = customerMetrics.get(b.id)!;
      switch (sort) {
        case 'ltv_desc':
          return mB.netLtv - mA.netLtv;
        case 'ltv_asc':
          return mA.netLtv - mB.netLtv;
        case 'orders_desc':
          return mB.totalOrders - mA.totalOrders;
        case 'recent_active':
          return new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime();
        case 'date_desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'name':
          return a.fullName.localeCompare(b.fullName, 'fa');
        default:
          return mB.netLtv - mA.netLtv;
      }
    });

    const activeCount = this.state.customers.filter((c) => c.status !== 'deactivated').length;
    const totalVerifiedLtv = Array.from(customerMetrics.values()).reduce((s, m) => s + m.netLtv, 0);
    const avgLtv = customerMetrics.size > 0 ? Math.round(totalVerifiedLtv / customerMetrics.size) : 0;

    return {
      items,
      customerMetrics,
      summary: {
        totalCount: this.state.customers.length,
        activeCount,
        repeatBuyersCount: segmentsCount.repeat,
        customBuyersCount: segmentsCount.custom_design,
        totalVerifiedLtv,
        avgLtv,
        segments: segmentsCount,
      },
    };
  }

  public getDesigns(filters?: {
    status?: CustomDesign['status'] | 'all';
    search?: string;
  }) {
    let list = [...this.state.customDesigns];

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((d) => d.status === filters.status);
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.id.toLowerCase().includes(q) ||
          d.orderId.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getProductionJobs(stage?: string) {
    if (!stage || stage === 'all') return this.state.productionJobs;
    return this.state.productionJobs.filter((j) => j.stage === stage);
  }

  public getPayments() {
    return [...this.state.payments].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getStaffAndTasks() {
    return {
      staff: this.state.staff,
      tasks: this.state.tasks,
    };
  }

  public getActivityLogs(limit = 20): ActivityLog[] {
    return [...this.state.activities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  // ==========================================
  // MUTATIONS (With Invariant Guards & Logs)
  // ==========================================

  /**
   * Invariant Guard: availableStock = onHand - reserved cannot be negative!
   */
  public updateVariantStock(
    sku: string,
    newOnHand: number,
    staffId: string,
    reason: string
  ): { success: boolean; error?: string } {
    if (newOnHand < 0) {
      return { success: false, error: 'موجودی فیزیکی کالا نمی‌تواند مقداری منفی باشد.' };
    }

    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) {
      return { success: false, error: `کد تنوع انبار (${sku}) یافت نشد.` };
    }

    if (newOnHand < variant.reservedStock) {
      return {
        success: false,
        error: `موجودی فیزیکی (${newOnHand}) نمی‌تواند کمتر از تعداد رزرو شده در سفارشات جاری (${variant.reservedStock}) باشد.`,
      };
    }

    const previousOnHand = variant.onHandStock;
    variant.onHandStock = newOnHand;

    // Also update in product variants list
    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) pVar.onHandStock = newOnHand;
    }

    // Log Activity
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'STOCK_MANUAL_ADJUSTMENT',
      description: `موجودی تنوع ${sku} از ${previousOnHand} به ${newOnHand} اصلاح شد. دلیل: ${reason}`,
      entityType: 'stock',
      entityId: sku,
      metadata: { previousOnHand, newOnHand, reason },
    });

    const delta = newOnHand - previousOnHand;
    this.recordStockMovement({
      sku,
      productId: variant.productId,
      type: delta >= 0 ? 'goods_receipt' : 'manual_adjustment',
      quantityChange: delta,
      fieldAffected: 'onHand',
      previousOnHand,
      newOnHand,
      previousReserved: variant.reservedStock,
      newReserved: variant.reservedStock,
      reason,
      actorId: staff.id,
      actorName: staff.fullName,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public approveCustomDesign(
    designId: string,
    staffId: string,
    notes = 'طرح با موفقیت تایید و جهت چاپ ارسال گردید.'
  ): { success: boolean; error?: string; dispatchedToProduction?: boolean; messageFa: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.', messageFa: 'طرح یافت نشد.' };

    const order = this.state.orders.find((o) => o.id === design.orderId);
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[1];

    const prevStatus = design.status;
    design.status = 'approved';
    design.reviewedAt = new Date().toISOString();
    design.reviewerNotes = notes;
    design.assignedStaffId = staffId;
    design.reviewerName = staff.fullName;

    if (!design.auditTrail) design.auditTrail = [];
    design.auditTrail.push({
      id: `AUD-${designId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: staff.id,
      actorName: staff.fullName,
      action: 'approved',
      notes,
      previousStatus: prevStatus,
      newStatus: 'approved',
    });

    let dispatchedToProduction = false;
    let messageFa = `طرح ${designId} با موفقیت تایید گردید.`;

    if (order) {
      order.designStatus = 'approved';

      // Acceptance: Approval must enforce verified payment for production dispatch
      const isPaid = order.paymentStatus === 'verified_paid';

      if (isPaid) {
        if (order.status === 'paid_processing') {
          order.status = 'in_production';
        }
        order.productionStatus = 'in_progress';
        dispatchedToProduction = true;
        messageFa = `طرح ${designId} تایید شد و با توجه به تسویه فاکتور، سفارش به خط چاپ مستقیم صنعتی DTG منتقل گردید.`;

        let job = this.state.productionJobs.find((j) => j.orderId === order.id && j.customDesignId === design.id);
        if (job) {
          job.stage = 'printing_dtg';
          job.startedAt = new Date().toISOString();
        } else {
          job = {
            id: `JOB-${400 + this.state.productionJobs.length + 1}`,
            orderId: order.id,
            lineItemId: design.lineItemId || order.items[0]?.id || 'ITEM-1',
            variantSku: design.blankSku || order.items[0]?.variantSku || 'SP101-OVR-BLK-L',
            customDesignId: design.id,
            operatorId: staff.id,
            stage: 'printing_dtg',
            priority: order.isRushOrder ? 'rush' : 'normal',
            qcStatus: 'pending',
            reprintCount: 0,
            quantity: order.items[0]?.quantity || 1,
            printingTechnique: 'چاپ دیجیتال مستقیم نساجی (DTG صنعتی Brother GTX Pro)',
            printPlacement: 'سینه مرکزی (A3+ Front Chest)',
            dueDate: new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString(),
            startedAt: new Date().toISOString(),
          };
          this.state.productionJobs.push(job);
        }
      } else {
        dispatchedToProduction = false;
        messageFa = `طرح ${designId} تایید شد؛ اما به دلیل عدم تسویه کامل فاکتور (${order.paymentStatus})، به خط چاپ ارسال نشد.`;
      }
    }

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'DESIGN_APPROVED',
      description: `طرح اختصاصی ${designId} برای سفارش ${design.orderId} توسط ${staff.fullName} تایید شد.`,
      entityType: 'design',
      entityId: designId,
      metadata: { notes, dispatchedToProduction },
    });

    this.saveState({ ...this.state });
    return { success: true, dispatchedToProduction, messageFa };
  }

  public rejectCustomDesign(
    designId: string,
    staffId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[1];
    const prevStatus = design.status;
    design.status = 'rejected';
    design.reviewedAt = new Date().toISOString();
    design.reviewerNotes = reason;
    design.assignedStaffId = staffId;
    design.reviewerName = staff.fullName;

    if (!design.auditTrail) design.auditTrail = [];
    design.auditTrail.push({
      id: `AUD-${designId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: staff.id,
      actorName: staff.fullName,
      action: 'rejected',
      notes: reason,
      previousStatus: prevStatus,
      newStatus: 'rejected',
    });

    const order = this.state.orders.find((o) => o.id === design.orderId);
    if (order) {
      order.designStatus = 'rejected';
      // Invariant: rejected designs do not change payment status!
    }

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'DESIGN_REJECTED',
      description: `طرح اختصاصی ${designId} رد شد. دلیل: ${reason}`,
      entityType: 'design',
      entityId: designId,
      metadata: { reason },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public requestDesignRevision(
    designId: string,
    staffId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[1];
    const prevStatus = design.status;
    design.status = 'revision_requested';
    design.reviewerNotes = reason;
    design.assignedStaffId = staffId;
    design.reviewerName = staff.fullName;

    if (!design.auditTrail) design.auditTrail = [];
    design.auditTrail.push({
      id: `AUD-${designId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: staff.id,
      actorName: staff.fullName,
      action: 'revision_requested',
      notes: reason,
      previousStatus: prevStatus,
      newStatus: 'revision_requested',
    });

    const order = this.state.orders.find((o) => o.id === design.orderId);
    if (order) {
      order.designStatus = 'pending_review';
    }

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'DESIGN_REVISION_REQUESTED',
      description: `درخواست اصلاحیه برای طرح ${designId} ثبت شد. توضیحات: ${reason}`,
      entityType: 'design',
      entityId: designId,
      metadata: { reason },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public submitCustomerRevision(
    designId: string,
    newSettings: Partial<DesignSettings>,
    customerNote?: string
  ): { success: boolean; error?: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.' };

    if (!design.revisions) design.revisions = [];
    if (design.settings) {
      design.revisions.push({
        revisionNumber: design.revisions.length + 1,
        submittedAt: new Date().toISOString(),
        previewUrl: design.previewUrl,
        settings: { ...design.settings },
        changeSummaryFa: 'اصلاحات اعمال شده توسط کاربر',
        customerNote: customerNote || design.customerNote,
      });
    }

    design.settings = {
      ...(design.settings || {
        designMode: 'graphic',
        designScale: 100,
        designPosX: 0,
        designPosY: 0,
        tshirtColorName: 'مشکی',
        tshirtColorHex: '#1C1A1A',
      }),
      ...newSettings,
    };

    design.revisionCount = (design.revisionCount || 1) + 1;
    const prevStatus = design.status;
    design.status = 'under_review';
    if (customerNote) design.customerNote = customerNote;

    if (!design.auditTrail) design.auditTrail = [];
    design.auditTrail.push({
      id: `AUD-${designId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorId: design.customerId,
      actorName: design.customerName || 'کاربر',
      action: 'revision_submitted',
      notes: customerNote || 'ارسال نسخه اصلاحی جدید توسط کاربر',
      previousStatus: prevStatus,
      newStatus: 'under_review',
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public addDesignStaffNote(
    designId: string,
    staffId: string,
    text: string
  ): { success: boolean; error?: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    if (!design.staffNotes) design.staffNotes = [];
    design.staffNotes.push({
      id: `NOTE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorId: staff.id,
      authorName: staff.fullName,
      text,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public getCustomDesignById(id: string) {
    const design = this.state.customDesigns.find((d) => d.id === id);
    if (!design) return null;

    const order = this.state.orders.find((o) => o.id === design.orderId);
    const customer = this.state.customers.find((c) => c.id === design.customerId);
    const blankVariant = design.blankSku ? this.state.variants.find((v) => v.sku === design.blankSku) : undefined;
    const blankProduct = blankVariant ? this.state.products.find((p) => p.id === blankVariant.productId) : undefined;
    const payment = order ? this.state.payments.find((p) => p.orderId === order.id) : undefined;
    const relatedJob = this.state.productionJobs.find((j) => j.customDesignId === design.id || j.orderId === design.orderId);

    return {
      design,
      order,
      customer,
      blankVariant,
      blankProduct,
      payment,
      relatedJob,
    };
  }

  public getArtworkAssets(): ArtworkAsset[] {
    return this.state.artworks || DEFAULT_ARTWORK_ASSETS;
  }

  public getPrintRuleZones(): PrintRuleZone[] {
    return this.state.printRuleZones || DEFAULT_PRINT_RULE_ZONES;
  }

  public getProductionJobById(id: string) {
    const job = this.state.productionJobs.find((j) => j.id === id);
    if (!job) return null;

    const order = this.state.orders.find((o) => o.id === job.orderId);
    const lineItem = order?.items.find((i) => i.id === job.lineItemId) || order?.items[0];
    const design = job.customDesignId
      ? this.state.customDesigns.find((d) => d.id === job.customDesignId)
      : undefined;
    const variant = this.state.variants.find((v) => v.sku === job.variantSku);
    const product = variant ? this.state.products.find((p) => p.id === variant.productId) : undefined;
    const customer = order ? this.state.customers.find((c) => c.id === order.customerId) : undefined;
    const operator = this.state.staff.find((s) => s.id === job.operatorId);

    return {
      job,
      order,
      lineItem,
      design,
      variant,
      product,
      customer,
      operator,
    };
  }

  public getDailyProductionMetrics() {
    const jobs = this.state.productionJobs;
    const nowMs = new Date(this.state.demoClockIso).getTime();

    // Due & Overdue
    const activeJobs = jobs.filter(
      (j) => j.stage !== 'completed' && j.stage !== 'ready_for_fulfillment'
    );
    const overdueCount = activeJobs.filter((j) => new Date(j.dueDate).getTime() < nowMs).length;
    const dueTodayCount = activeJobs.filter((j) => {
      const diffHours = (new Date(j.dueDate).getTime() - nowMs) / (1000 * 3600);
      return diffHours >= 0 && diffHours <= 24;
    }).length;

    // Daily Throughput: jobs completed or moved to fulfillment
    const completedJobs = jobs.filter(
      (j) => j.stage === 'completed' || j.stage === 'ready_for_fulfillment'
    );
    const throughput = completedJobs.length;

    // Average turnaround hours from real startedAt -> finishedAt where real fixture events exist
    const finishedWithTimes = jobs.filter((j) => j.startedAt && j.finishedAt);
    let avgTurnaroundHours = 4.5;
    if (finishedWithTimes.length > 0) {
      const totalHours = finishedWithTimes.reduce((acc, j) => {
        const diffMs = new Date(j.finishedAt!).getTime() - new Date(j.startedAt!).getTime();
        return acc + Math.max(1, diffMs / (1000 * 3600));
      }, 0);
      avgTurnaroundHours = Math.round((totalHours / finishedWithTimes.length) * 10) / 10;
    }

    // Blocked work (on_hold + reprint_needed)
    const blockedCount = jobs.filter(
      (j) => j.stage === 'on_hold' || j.stage === 'reprint_needed'
    ).length;

    // Workshop capacity: Brother GTX rated at 32 garments per shift
    const dailyCapacityUnits = 32;
    const activeLoadUnits = activeJobs.reduce((acc, j) => acc + (j.quantity || 1), 0);
    const availableCapacityUnits = Math.max(0, dailyCapacityUnits - activeLoadUnits);
    const capacityLoadPercent = Math.min(100, Math.round((activeLoadUnits / dailyCapacityUnits) * 100));

    return {
      totalJobs: jobs.length,
      activeJobsCount: activeJobs.length,
      overdueCount,
      dueTodayCount,
      throughput,
      avgTurnaroundHours,
      blockedCount,
      dailyCapacityUnits,
      activeLoadUnits,
      availableCapacityUnits,
      capacityLoadPercent,
    };
  }

  public advanceProductionJob(
    jobId: string,
    targetStage?: ProductionStage,
    staffId = 'STF-04',
    note?: string
  ): { success: boolean; error?: string; messageFa: string } {
    const job = this.state.productionJobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'دستور کار تولید یافت نشد.', messageFa: 'یافت نشد' };

    const order = this.state.orders.find((o) => o.id === job.orderId);
    if (!order) return { success: false, error: 'سفارش متصل به دستور کار یافت نشد.', messageFa: 'یافت نشد' };

    // Guardrail: no production dispatch from unpaid/unapproved orders
    if (order.paymentStatus !== 'verified_paid') {
      return {
        success: false,
        error: `دستور کار مربوط به سفارش تسویه نشده است (وضعیت پرداخت: ${order.paymentStatus}). ارسال به خط تولید مسدود است.`,
        messageFa: 'سفارش پرداخت نشده',
      };
    }
    if (order.hasCustomLineItem && order.designStatus !== 'approved') {
      return {
        success: false,
        error: 'طرح سفارشی این سفارش هنوز توسط آتلیه تایید نشده است. پیشروی خط تولید ممنوع است.',
        messageFa: 'طرح تایید نشده',
      };
    }

    const prevStage = job.stage;
    let nextStage: ProductionStage = targetStage || 'printing_dtg';

    if (!targetStage) {
      if (prevStage === 'ready' || prevStage === 'queued') nextStage = 'printing_dtg';
      else if (prevStage === 'pretreatment') nextStage = 'printing_dtg';
      else if (prevStage === 'printing_dtg') nextStage = 'curing_heatpress';
      else if (prevStage === 'curing_heatpress') nextStage = 'qc_inspection';
      else if (prevStage === 'qc_inspection') nextStage = 'ready_for_fulfillment';
      else if (prevStage === 'ready_for_fulfillment') nextStage = 'completed';
      else if (prevStage === 'reprint_needed') nextStage = 'printing_dtg';
      else if (prevStage === 'on_hold') nextStage = 'queued';
    }

    job.stage = nextStage;
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];

    // Audit Trail
    if (!job.auditTrail) job.auditTrail = [];
    job.auditTrail.unshift({
      id: `ADT-${job.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: staff.fullName,
      action: `تغییر مرحله به ${nextStage}`,
      note: note || `دستور کار به مرحله ${nextStage} منتقل شد`,
      fromStage: prevStage,
      toStage: nextStage,
    });

    // Synchronize Order status
    if (
      nextStage === 'printing_dtg' ||
      nextStage === 'curing_heatpress' ||
      nextStage === 'pretreatment'
    ) {
      if (order.status !== 'in_production') order.status = 'in_production';
      order.productionStatus = 'in_progress';
      if (!job.startedAt) job.startedAt = new Date().toISOString();
    } else if (nextStage === 'qc_inspection') {
      order.status = 'quality_check';
      order.productionStatus = 'qc';
    } else if (nextStage === 'ready_for_fulfillment') {
      job.qcStatus = 'passed';
      job.finishedAt = new Date().toISOString();
      order.status = 'ready_to_ship';
      order.productionStatus = 'ready';
    } else if (nextStage === 'completed') {
      job.qcStatus = 'passed';
      if (!job.finishedAt) job.finishedAt = new Date().toISOString();
    }

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'JOB_STAGE_ADVANCED',
      description: `دستور کار ${job.id} برای سفارش ${job.orderId} به مرحله «${nextStage}» منتقل شد.`,
      entityType: 'production',
      entityId: job.id,
      metadata: { fromStage: prevStage, toStage: nextStage, note },
    });

    this.saveState({ ...this.state });
    return { success: true, messageFa: `دستور کار با موفقیت به مرحله ${nextStage} منتقل گردید.` };
  }

  public holdProductionJob(
    jobId: string,
    reason: string,
    staffId = 'STF-04'
  ): { success: boolean; error?: string } {
    const job = this.state.productionJobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'دستور کار یافت نشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    const prevStage = job.stage;
    job.stage = 'on_hold';
    job.holdReason = reason;

    if (!job.auditTrail) job.auditTrail = [];
    job.auditTrail.unshift({
      id: `ADT-${job.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: staff.fullName,
      action: 'توقف کار (Hold)',
      note: reason,
      fromStage: prevStage,
      toStage: 'on_hold',
    });

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'JOB_HELD',
      description: `دستور کار ${job.id} متوقف شد. دلیل: ${reason}`,
      entityType: 'production',
      entityId: job.id,
      metadata: { reason },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public resumeProductionJob(jobId: string, staffId = 'STF-04'): { success: boolean; error?: string } {
    const job = this.state.productionJobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'دستور کار یافت نشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    job.stage = 'queued';
    job.holdReason = undefined;

    if (!job.auditTrail) job.auditTrail = [];
    job.auditTrail.unshift({
      id: `ADT-${job.id}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: staff.fullName,
      action: 'رفع توقف و ازسرگیری (Resume)',
      note: 'مانع رفع شد و کار به صف چاپ بازگشت',
      fromStage: 'on_hold',
      toStage: 'queued',
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public submitQcInspection(
    jobId: string,
    input: {
      passed: boolean;
      defectReason?: string;
      wastedGarmentCount?: number;
      reprintReworkAssigned?: boolean;
      operatorId?: string;
      notes?: string;
    }
  ): { success: boolean; error?: string; messageFa: string } {
    const job = this.state.productionJobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'دستور کار یافت نشد.', messageFa: 'یافت نشد' };

    const order = this.state.orders.find((o) => o.id === job.orderId);
    const staff =
      this.state.staff.find((s) => s.id === (input.operatorId || 'STF-05')) || this.state.staff[0];

    if (!job.auditTrail) job.auditTrail = [];

    if (input.passed) {
      job.qcStatus = 'passed';
      job.stage = 'ready_for_fulfillment';
      job.qcNotes = input.notes || 'آزمون کنترل کیفی نهایی و ثبات شستشو با موفقیت تایید شد.';
      job.finishedAt = new Date().toISOString();

      if (order) {
        order.status = 'ready_to_ship';
        order.productionStatus = 'ready';
      }

      job.auditTrail.unshift({
        id: `ADT-QC-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: staff.fullName,
        action: 'تایید کنترل کیفیت (QC Passed)',
        note: job.qcNotes,
      });

      this.addActivityLog({
        actorId: staff.id,
        actorName: staff.fullName,
        actorRole: staff.role,
        actionType: 'QC_PASSED',
        description: `محصول دستور کار ${job.id} تایید کیفی شد و به مرحله آماده ارسال رفت.`,
        entityType: 'production',
        entityId: job.id,
      });

      this.saveState({ ...this.state });
      return {
        success: true,
        messageFa: 'آزمون کنترل کیفی با موفقیت تایید و سفارش به واحد بسته‌بندی و ارسال تحویل گردید.',
      };
    } else {
      // QC Failed
      job.qcStatus = 'failed';
      job.defectReason = input.defectReason || 'ایراد در ثبات یا کادر چاپ';
      job.qcNotes = input.notes || job.defectReason;
      const wastedCount = input.wastedGarmentCount || 1;
      job.wastedGarmentCount = (job.wastedGarmentCount || 0) + wastedCount;

      // Invariant Guard: A rejected QC item must not automatically become shippable!
      if (order) {
        order.productionStatus = 'rework';
        if (order.status === 'ready_to_ship' || order.status === 'shipped') {
          order.status = 'quality_check';
        }
      }

      // If rework assigned:
      if (input.reprintReworkAssigned) {
        job.stage = 'reprint_needed';
        job.reprintCount = (job.reprintCount || 0) + 1;
        job.reworkReason = job.defectReason;

        // Consume 1 replacement blank garment without double reducing:
        const variant = this.state.variants.find((v) => v.sku === job.variantSku);
        if (variant && variant.onHandStock >= wastedCount) {
          const prevOnHand = variant.onHandStock;
          variant.onHandStock -= wastedCount;

          if (!this.state.stockMovements) this.state.stockMovements = [];
          this.state.stockMovements.unshift({
            id: `MOV-QC-${Date.now()}`,
            timestamp: new Date().toISOString(),
            sku: variant.sku,
            productId: variant.productId,
            type: 'production_scrap',
            quantityChange: -wastedCount,
            fieldAffected: 'onHand',
            previousOnHand: prevOnHand,
            newOnHand: variant.onHandStock,
            previousReserved: variant.reservedStock,
            newReserved: variant.reservedStock,
            reason: `ضایعات چاپ و بازرسی QC در دستور کار ${job.id}: ${job.defectReason}`,
            actorId: staff.id,
            actorName: staff.fullName,
          });
        }
      }

      job.auditTrail.unshift({
        id: `ADT-QC-${Date.now()}`,
        timestamp: new Date().toISOString(),
        actorName: staff.fullName,
        action: 'رد کنترل کیفی (QC Failed)',
        note: `علت رد: ${job.defectReason} · ثبت ضایعات: ${wastedCount} عدد`,
      });

      this.addActivityLog({
        actorId: staff.id,
        actorName: staff.fullName,
        actorRole: staff.role,
        actionType: 'QC_FAILED',
        description: `کنترل کیفیت دستور کار ${job.id} رد شد. دلیل: ${job.defectReason}`,
        entityType: 'production',
        entityId: job.id,
        metadata: { defectReason: job.defectReason, wastedCount },
      });

      this.saveState({ ...this.state });
      return {
        success: true,
        messageFa: `طرح به علت «${job.defectReason}» در QC رد شد و به بخش بازچاپ/اصلاح ارجاع گردید. سفارش متوقف شد.`,
      };
    }
  }

  public assignProductionJob(
    jobId: string,
    operatorId: string,
    dueDate?: string,
    vendorPartner?: string,
    staffId = 'STF-01'
  ): { success: boolean; error?: string } {
    const job = this.state.productionJobs.find((j) => j.id === jobId);
    if (!job) return { success: false, error: 'دستور کار یافت نشد.' };

    const operator = this.state.staff.find((s) => s.id === operatorId);
    if (operator) {
      job.operatorId = operator.id;
      job.assignedStaffName = operator.fullName;
    }
    if (dueDate) job.dueDate = dueDate;
    if (vendorPartner !== undefined) job.vendorPartner = vendorPartner;

    if (!job.auditTrail) job.auditTrail = [];
    job.auditTrail.unshift({
      id: `ADT-ASN-${Date.now()}`,
      timestamp: new Date().toISOString(),
      actorName: 'مدیر تولید',
      action: 'تخصیص مجدد و زمان‌بندی',
      note: `اپراتور: ${operator?.fullName || operatorId} · مهلت تحویل: ${dueDate || job.dueDate}`,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    staffId: string,
    notes?: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };

    const payment = this.state.payments.find((p) => p.orderId === orderId);
    const designs = this.state.customDesigns.filter((d) => d.orderId === orderId);
    const jobs = this.state.productionJobs.filter((j) => j.orderId === orderId);
    const shipment = this.state.shipments.find((s) => s.orderId === orderId);

    // Validate with Transition Guard
    const guard = canTransitionOrderStatus(newStatus, {
      order,
      payment,
      designs,
      jobs,
      shipment,
      variants: this.state.variants,
    });

    if (!guard.allowed) {
      return { success: false, error: guard.reason || 'تغییر وضعیت مجاز نیست.' };
    }

    const oldStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (notes) order.notes = notes;

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];

    // Status Timeline
    if (!order.statusTimeline) order.statusTimeline = [];
    order.statusTimeline.unshift({
      id: `TL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      fromStatus: oldStatus,
      toStatus: newStatus,
      actorName: staff.fullName,
      note: notes,
    });

    // Handle inventory state changes for cancelled
    if (newStatus === 'cancelled' && oldStatus !== 'cancelled') {
      order.items.forEach((item) => {
        this.restoreStockFromCancellation(
          order.id,
          item.variantSku,
          item.quantity,
          notes || 'لغو سفارش از طریق پنل عملیات',
          oldStatus === 'shipped' || oldStatus === 'delivered'
        );
      });
    }

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'ORDER_STATUS_CHANGED',
      description: `وضعیت سفارش ${orderId} از «${oldStatus}» به «${newStatus}» تغییر یافت.`,
      entityType: 'order',
      entityId: orderId,
      metadata: { oldStatus, newStatus, notes },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public assignOrderOwner(
    orderId: string,
    ownerStaffId: string,
    actingStaffId?: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };
    const owner = this.state.staff.find((s) => s.id === ownerStaffId);
    if (!owner) return { success: false, error: 'همکار مورد نظر یافت نشد.' };

    order.assignedOwnerId = owner.id;
    order.assignedOwnerName = owner.fullName;
    order.updatedAt = new Date().toISOString();

    const actor = this.state.staff.find((s) => s.id === actingStaffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: actor.id,
      actorName: actor.fullName,
      actorRole: actor.role,
      actionType: 'ORDER_OWNER_ASSIGNED',
      description: `مسئولیت پیگیری سفارش ${orderId} به ${owner.fullName} محول شد.`,
      entityType: 'order',
      entityId: orderId,
      metadata: { ownerStaffId, ownerName: owner.fullName },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public updateOrderDeliveryDetails(
    orderId: string,
    updates: { shippingAddress: string; city: string; customerPhone: string; reason: string },
    staffId: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };

    if (!updates.shippingAddress.trim() || !updates.city.trim() || !updates.customerPhone.trim()) {
      return { success: false, error: 'اطلاعات نشانی، شهر و شماره تماس الزامی است.' };
    }
    if (!updates.reason.trim()) {
      return { success: false, error: 'درج دلیل رسمی برای تغییر اطلاعات تحویل مرسوله الزامی است.' };
    }

    const previousAddress = `${order.city} - ${order.shippingAddress} (تلفن: ${order.customerPhone})`;
    const newAddress = `${updates.city} - ${updates.shippingAddress} (تلفن: ${updates.customerPhone})`;

    if (!order.deliveryHistory) order.deliveryHistory = [];
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];

    order.deliveryHistory.unshift({
      timestamp: new Date().toISOString(),
      previousAddress,
      newAddress,
      actorName: staff.fullName,
      reason: updates.reason,
    });

    order.shippingAddress = updates.shippingAddress.trim();
    order.city = updates.city.trim();
    order.customerPhone = updates.customerPhone.trim();
    order.updatedAt = new Date().toISOString();

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'ORDER_DELIVERY_UPDATED',
      description: `نشانی تحویل سفارش ${orderId} اصلاح شد. دلیل: ${updates.reason}`,
      entityType: 'order',
      entityId: orderId,
      metadata: { previousAddress, newAddress, reason: updates.reason },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public cancelOrderWithReason(
    orderId: string,
    reason: string,
    staffId: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };

    if (!reason.trim()) {
      return { success: false, error: 'ثبت علت لغو سفارش در سامانه الزامی است.' };
    }

    const res = this.updateOrderStatus(orderId, 'cancelled', staffId, `لغو سفارش: ${reason}`);
    if (res.success) {
      order.cancellationReason = reason;
      this.saveState({ ...this.state });
    }
    return res;
  }

  public addOrderStaffNote(
    orderId: string,
    text: string,
    staffId: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };
    if (!text.trim()) return { success: false, error: 'متن یادداشت نمی‌تواند خالی باشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    if (!order.staffNotes) order.staffNotes = [];

    order.staffNotes.unshift({
      id: `NOTE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      authorId: staff.id,
      authorName: staff.fullName,
      text: text.trim(),
    });

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'ORDER_NOTE_ADDED',
      description: `یادداشت داخلی برای سفارش ${orderId} توسط ${staff.fullName} ثبت گردید.`,
      entityType: 'order',
      entityId: orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public getOrderExceptions(): Array<{ order: Order; exceptions: OrderException[] }> {
    const results: Array<{ order: Order; exceptions: OrderException[] }> = [];
    const nowIso = this.state.demoClockIso || new Date().toISOString();

    for (const order of this.state.orders) {
      const payment = this.state.payments.find((p) => p.orderId === order.id);
      const designs = this.state.customDesigns.filter((d) => d.orderId === order.id);
      const jobs = this.state.productionJobs.filter((j) => j.orderId === order.id);
      const shipment = this.state.shipments.find((s) => s.orderId === order.id);

      const exceptions = detectOrderExceptions({
        order,
        nowIso,
        payment,
        designs,
        jobs,
        shipment,
        variants: this.state.variants,
      });

      if (exceptions.length > 0) {
        results.push({ order, exceptions });
      }
    }

    return results;
  }

  public createManualOrder(params: {
    customerName: string;
    customerPhone: string;
    shippingAddress: string;
    city: string;
    items: Array<{ variantSku: string; quantity: number }>;
    notes?: string;
    staffId: string;
  }): { success: boolean; data?: Order; error?: string } {
    if (!params.customerName.trim() || !params.customerPhone.trim() || !params.shippingAddress.trim() || !params.city.trim()) {
      return { success: false, error: 'تمامی مشخصات خریدار (نام، شماره تماس، نشانی و شهر) الزامی هستند.' };
    }
    if (!params.items || params.items.length === 0) {
      return { success: false, error: 'حداقل یک قلم کالا باید برای صدور فاکتور انتخاب شود.' };
    }

    // Strictly validate inventory and pricing
    for (const it of params.items) {
      if (it.quantity <= 0) {
        return { success: false, error: 'تعداد هر قلم کالا باید حداقل ۱ واحد باشد.' };
      }
      const v = this.state.variants.find((variant) => variant.sku === it.variantSku);
      if (!v) {
        return { success: false, error: `کد تنوع کالای ${it.variantSku} در کاتالوگ یافت نشد.` };
      }
      const available = v.onHandStock - v.reservedStock;
      if (available < it.quantity) {
        return {
          success: false,
          error: `موجودی آزاد تنوع ${v.sku} (${available} عدد) کافی نیست و نمی‌توان ${it.quantity} عدد رزرو کرد.`,
        };
      }
    }

    const orderId = `SHP-1405-${882000 + this.state.orders.length + 1}`;
    const nowIso = new Date().toISOString();
    let subtotalTomans = 0;

    const lineItems = params.items.map((it, idx) => {
      const v = this.state.variants.find((variant) => variant.sku === it.variantSku)!;
      const p = this.state.products.find((prod) => prod.id === v.productId)!;
      const unitPrice = p.basePriceTomans + v.priceAdjustmentTomans;
      const lineSubtotal = unitPrice * it.quantity;
      subtotalTomans += lineSubtotal;

      // Lock reservation immediately
      this.reserveStockForOrder(orderId, v.sku, it.quantity);

      return {
        id: `ITEM-${orderId}-${idx + 1}`,
        orderId,
        productId: p.id,
        variantSku: v.sku,
        productName: p.name,
        colorName: v.colorName,
        size: v.size,
        fit: v.fit,
        unitPriceTomans: unitPrice,
        quantity: it.quantity,
        subtotalTomans: lineSubtotal,
        isCustomPod: false,
      };
    });

    const shippingFeeTomans = subtotalTomans >= 1000000 ? 0 : 45000;
    const totalTomans = subtotalTomans + shippingFeeTomans;

    const staff = this.state.staff.find((s) => s.id === params.staffId) || this.state.staff[0];

    const newOrder: Order = {
      id: orderId,
      customerId: 'CUST-1001',
      customerName: params.customerName.trim(),
      customerPhone: params.customerPhone.trim(),
      shippingAddress: params.shippingAddress.trim(),
      city: params.city.trim(),
      items: lineItems,
      subtotalTomans,
      shippingFeeTomans,
      discountTomans: 0,
      totalTomans,
      status: 'pending_payment',
      paymentStatus: 'pending',
      designStatus: 'not_applicable',
      hasCustomLineItem: false,
      createdAt: nowIso,
      updatedAt: nowIso,
      notes: params.notes ? `[سفارش دستی توسط ${staff.fullName}]: ${params.notes}` : `ثبت دستی در پنل عملیات توسط ${staff.fullName}`,
      isRushOrder: false,
      orderType: 'standard',
      assignedOwnerId: staff.id,
      assignedOwnerName: staff.fullName,
      statusTimeline: [
        {
          id: `TL-${Date.now()}`,
          timestamp: nowIso,
          fromStatus: 'draft',
          toStatus: 'pending_payment',
          actorName: staff.fullName,
          note: 'ایجاد فاکتور دستی با اعتبارسنجی موجودی انبار',
        },
      ],
    };

    this.state.orders.unshift(newOrder);

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'MANUAL_ORDER_CREATED',
      description: `سفارش دستی ${orderId} برای ${newOrder.customerName} به مبلغ ${totalTomans.toLocaleString()} تومان ایجاد شد.`,
      entityType: 'order',
      entityId: orderId,
    });

    this.saveState({ ...this.state });
    return { success: true, data: newOrder };
  }

  public getFinancialLedgerSummary(): FinancialLedgerSummary {
    return calculateLedgerSummary(this.state);
  }

  public getPaymentById(paymentId: string) {
    const payment = this.state.payments.find((p) => p.id === paymentId);
    if (!payment) return null;

    const order = this.state.orders.find((o) => o.id === payment.orderId);
    const customer = this.state.customers.find((c) => c.id === payment.customerId);
    const refunds = this.getRefunds().filter((r) => r.paymentId === paymentId);
    const retryAttempts = this.state.payments.filter(
      (p) => p.orderId === payment.orderId && p.id !== payment.id
    );

    return {
      payment,
      order,
      customer,
      refunds,
      retryAttempts,
    };
  }

  public getRefunds(): RefundRecord[] {
    if (!this.state.refunds) {
      this.state.refunds = this.state.payments
        .filter((p) => (p.status === 'refunded' || p.status === 'partial_refund') && p.refundedAmountTomans)
        .map((p, idx) => {
          const order = this.state.orders.find((o) => o.id === p.orderId);
          return {
            id: `REF-${8800 + idx + 1}`,
            paymentId: p.id,
            orderId: p.orderId,
            customerId: p.customerId,
            customerName: order?.customerName || 'مشتری شاه‌پوش',
            customerPhone: order?.customerPhone,
            requestedAmountTomans: p.refundedAmountTomans || p.amountTomans,
            processedAmountTomans: p.refundedAmountTomans || p.amountTomans,
            reason: p.refundReason || 'استرداد وجه طبق ضوابط فروشگاه',
            status: 'processed' as const,
            requestedAt: p.createdAt,
            processedAt: p.refundedAt || p.createdAt,
            destinationAccountMasked: 'IR** **** **** **** **۰۸ ۴۳ (بانک سامان)',
            isPartial: (p.refundedAmountTomans || p.amountTomans) < p.amountTomans,
          };
        });
    }
    return this.state.refunds;
  }

  public requestRefund(params: {
    paymentId: string;
    amountTomans: number;
    reason: string;
    destinationIban?: string;
    staffId: string;
  }): { success: boolean; data?: RefundRecord; error?: string } {
    const payment = this.state.payments.find((p) => p.id === params.paymentId);
    if (!payment) return { success: false, error: 'تراکنش پرداخت یافت نشد.' };

    const existingRefunds = this.getRefunds();
    const validation = validateRefundEligibility(payment, params.amountTomans, existingRefunds);
    if (!validation.eligible) {
      return { success: false, error: validation.error };
    }

    const order = this.state.orders.find((o) => o.id === payment.orderId);
    const newId = `REF-${8800 + this.state.refunds.length + 1}`;
    const staff = this.state.staff.find((s) => s.id === params.staffId) || this.state.staff[0];

    const newRefund: RefundRecord = {
      id: newId,
      paymentId: payment.id,
      orderId: payment.orderId,
      customerId: payment.customerId,
      customerName: order?.customerName || 'مشتری محترم',
      customerPhone: order?.customerPhone,
      requestedAmountTomans: params.amountTomans,
      reason: params.reason.trim(),
      status: 'requested',
      requestedAt: new Date().toISOString(),
      destinationAccountMasked: params.destinationIban?.trim() || 'IR** **** **** **** **۰۸ ۴۳ (بانک سامان)',
      isPartial: params.amountTomans < payment.amountTomans,
    };

    this.state.refunds.unshift(newRefund);

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'REFUND_REQUESTED',
      description: `درخواست استرداد وجه ${newId} به مبلغ ${params.amountTomans.toLocaleString()} تومان برای سفارش ${payment.orderId} ثبت شد.`,
      entityType: 'payment',
      entityId: payment.id,
    });

    this.saveState({ ...this.state });
    return { success: true, data: newRefund };
  }

  public approveRefund(refundId: string, staffId: string): { success: boolean; error?: string } {
    const refunds = this.getRefunds();
    const refund = refunds.find((r) => r.id === refundId);
    if (!refund) return { success: false, error: 'پرونده استرداد یافت نشد.' };
    if (refund.status !== 'requested') {
      return { success: false, error: 'این درخواست در وضعیتی نیست که بتوان آن را تایید کرد.' };
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    refund.status = 'approved';
    refund.approvedAt = new Date().toISOString();
    refund.approvedById = staff.id;
    refund.approvedByName = staff.fullName;

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'REFUND_APPROVED',
      description: `درخواست استرداد ${refundId} توسط ${staff.fullName} تایید شد و در نوبت تسویه پایا قرار گرفت.`,
      entityType: 'payment',
      entityId: refund.paymentId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public processRefund(refundId: string, staffId: string): { success: boolean; error?: string } {
    const refunds = this.getRefunds();
    const refund = refunds.find((r) => r.id === refundId);
    if (!refund) return { success: false, error: 'پرونده استرداد یافت نشد.' };
    if (refund.status !== 'approved' && refund.status !== 'requested') {
      return { success: false, error: 'تنها درخواست‌های تاییدشده امکان اجرای تسویه را دارند.' };
    }

    const payment = this.state.payments.find((p) => p.id === refund.paymentId);
    if (!payment) return { success: false, error: 'تراکنش مربوطه یافت نشد.' };

    const order = this.state.orders.find((o) => o.id === refund.orderId);
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];

    refund.status = 'processed';
    refund.processedAt = new Date().toISOString();
    refund.processedAmountTomans = refund.requestedAmountTomans;

    // Update payment
    const isFull = refund.requestedAmountTomans >= payment.amountTomans;
    payment.status = isFull ? 'refunded' : 'partial_refund';
    payment.refundedAmountTomans = (payment.refundedAmountTomans || 0) + refund.requestedAmountTomans;
    payment.refundReason = refund.reason;
    payment.refundedAt = refund.processedAt;

    // Update order
    if (order) {
      if (isFull) {
        order.paymentStatus = 'refunded';
        order.status = 'refunded';
      }
      order.updatedAt = new Date().toISOString();

      // Release stock reservations back to available
      order.items.forEach((item) => {
        this.restoreStockFromCancellation(
          order.id,
          item.variantSku,
          item.quantity,
          `استرداد وجه فاکتور ${refund.id}`,
          order.status === 'shipped' || order.status === 'delivered'
        );
      });
    }

    // Adjust customer totalSpent
    const customer = this.state.customers.find((c) => c.id === payment.customerId);
    if (customer) {
      customer.totalSpentTomans = Math.max(0, customer.totalSpentTomans - refund.requestedAmountTomans);
    }

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'REFUND_PROCESSED',
      description: `تسویه بانکی استرداد ${refundId} به مبلغ ${refund.requestedAmountTomans.toLocaleString()} تومان نهایی شد.`,
      entityType: 'payment',
      entityId: payment.id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public getSettlementBatches(): SettlementBatchItem[] {
    return generateSettlementBatches(this.state.payments);
  }

  public issueSimulatedRefund(
    orderId: string,
    amountTomans: number,
    reason: string,
    staffId: string
  ): { success: boolean; refundId?: string; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };

    const payment = this.state.payments.find((p) => p.orderId === orderId);
    if (!payment) return { success: false, error: 'تراکنش پرداخت مربوط به این سفارش یافت نشد.' };

    const existingRefunds = this.getRefunds();
    const validation = validateRefundEligibility(payment, amountTomans, existingRefunds);
    if (!validation.eligible) {
      return { success: false, error: validation.error };
    }

    const req = this.requestRefund({
      paymentId: payment.id,
      amountTomans,
      reason,
      staffId,
    });

    if (!req.success || !req.data) {
      return { success: false, error: req.error };
    }

    this.approveRefund(req.data.id, staffId);
    const proc = this.processRefund(req.data.id, staffId);
    if (!proc.success) return proc;
    return { success: true, refundId: req.data.id };
  }

  public assignStaffTask(taskId: string, staffId: string): boolean {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    task.assignedStaffId = staffId;
    this.saveState({ ...this.state });
    return true;
  }

  public completeStaffTask(taskId: string, staffId: string): boolean {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return false;
    task.status = 'completed';
    task.completedAt = new Date().toISOString();

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'TASK_COMPLETED',
      description: `وظیفه «${task.title}» توسط ${staff.fullName} با موفقیت به اتمام رسید.`,
      entityType: 'task',
      entityId: taskId,
    });

    this.saveState({ ...this.state });
    return true;
  }

  // ==========================================
  // CATALOG MUTATIONS (Products, Variants, Categories, Collections, Media, CSV)
  // ==========================================

  public createProduct(
    productData: Partial<AdminProduct>,
    staffId?: string
  ): { success: boolean; product?: AdminProduct; error?: string } {
    if (!productData.name || productData.name.trim() === '') {
      return { success: false, error: 'عنوان محصول الزامی است.' };
    }
    const basePrice = Number(productData.basePriceTomans);
    if (!basePrice || basePrice <= 0) {
      return { success: false, error: 'قیمت پایه محصول باید عددی مثبت و بزرگتر از صفر باشد.' };
    }

    const id = productData.id?.trim() || `sp-${100 + this.state.products.length + 1}`;
    if (this.state.products.some((p) => p.id === id)) {
      return { success: false, error: `محصولی با شناسه ${id} از قبل در سیستم وجود دارد.` };
    }

    const skuPrefix = productData.skuPrefix?.trim() || `${id.toUpperCase().replace('-', '')}-TSH`;
    if (this.state.products.some((p) => p.skuPrefix === skuPrefix)) {
      return { success: false, error: `پیش‌وند انبارداری ${skuPrefix} قبلاً برای محصول دیگری ثبت شده است.` };
    }

    const variants: ProductVariant[] = [];
    if (productData.variants && productData.variants.length > 0) {
      const existingSkus = new Set(this.state.variants.map((v) => v.sku));
      for (const v of productData.variants) {
        if (existingSkus.has(v.sku)) {
          return { success: false, error: `کد تنوع انبار (SKU: ${v.sku}) قبلاً در انبار ثبت شده است.` };
        }
        variants.push({
          ...v,
          productId: id,
          material: v.material || productData.fabricSpecs || '۱۰۰٪ پنبه ارگانیک دو نخ',
          onHandStock: Math.max(0, Number(v.onHandStock) || 0),
          reservedStock: 0,
          minStockThreshold: Math.max(0, Number(v.minStockThreshold) || 3),
          priceAdjustmentTomans: Number(v.priceAdjustmentTomans) || 0,
          isEnabled: v.isEnabled !== false,
        });
      }
    } else {
      const defaultSizes: ('S' | 'M' | 'L' | 'XL')[] = ['S', 'M', 'L', 'XL'];
      defaultSizes.forEach((size) => {
        variants.push({
          sku: `${skuPrefix}-BLK-${size}`,
          productId: id,
          size,
          colorName: 'جغرافیای مشکی (ذغالی)',
          colorHex: '#1C1A1A',
          fit: 'oversize',
          material: productData.fabricSpecs || '۱۰۰٪ پنبه ارگانیک دو نخ ۲۴۰ گرم',
          onHandStock: 12,
          reservedStock: 0,
          minStockThreshold: 4,
          priceAdjustmentTomans: 0,
          isEnabled: true,
        });
      });
    }

    const nowIso = new Date().toISOString();
    const newProduct: AdminProduct = {
      id,
      skuPrefix,
      name: productData.name.trim(),
      nameEn: productData.nameEn?.trim(),
      category: productData.category || 'calligraphy',
      collectionIds: productData.collectionIds || [],
      basePriceTomans: basePrice,
      originalPriceTomans: productData.originalPriceTomans ? Number(productData.originalPriceTomans) : undefined,
      discountPercent: productData.discountPercent ? Number(productData.discountPercent) : undefined,
      discountStartDate: productData.discountStartDate,
      discountEndDate: productData.discountEndDate,
      description: productData.description?.trim() || '',
      fabricSpecs: productData.fabricSpecs?.trim() || '۱۰۰٪ پنبه ارگانیک سوپر دو نخ ۲۴۰ گرم',
      cut: productData.cut?.trim() || 'لش فیت خیابانی (Oversized Drop-Shoulder)',
      measurements: productData.measurements?.trim() || 'عرض سینه: ۵۸ سانتی‌متر | قد کل: ۷۶ سانتی‌متر',
      careInstructions: productData.careInstructions?.trim() || 'شستشو با آب سرد ۳۰ درجه و پشت‌ورو | بدون استفاده از سفیدکننده',
      printingMethod: productData.printingMethod?.trim() || 'چاپ دیجیتال مستقیم (DTG)',
      images: productData.images && productData.images.length > 0 ? productData.images : [`https://picsum.photos/seed/${id}/800/800`],
      primaryImage: productData.primaryImage || productData.images?.[0] || `https://picsum.photos/seed/${id}/800/800`,
      imageAlts: productData.imageAlts || {},
      isLive: productData.isLive ?? true,
      status: productData.status || (productData.isLive ? 'active' : 'draft'),
      productType: productData.productType || 'finished',
      isCustomizable: productData.isCustomizable ?? false,
      permittedPrintAreas: productData.permittedPrintAreas || ['front_chest', 'back_full'],
      baseGarmentSku: productData.baseGarmentSku || variants[0]?.sku,
      printingTechnique: productData.printingTechnique || 'DTG',
      slug: productData.slug?.trim() || `${id}-${productData.name.trim().toLowerCase().replace(/\s+/g, '-')}`,
      seoTitle: productData.seoTitle?.trim() || `${productData.name} | پوشاک فاخر شاه‌پوش`,
      seoMetaDescription: productData.seoMetaDescription?.trim() || productData.description?.slice(0, 150) || '',
      variants,
      createdAt: nowIso,
      updatedAt: nowIso,
      tags: productData.tags && productData.tags.length > 0 ? productData.tags : [productData.category || 'تیشرت'],
    };

    this.state.products.unshift(newProduct);
    this.state.variants.push(...variants);

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'PRODUCT_CREATED',
      description: `محصول جدید «${newProduct.name}» (${newProduct.id}) با ${variants.length} تنوع به کاتالوگ افزوده شد.`,
      entityType: 'product',
      entityId: newProduct.id,
      metadata: { basePriceTomans: basePrice, variantsCount: variants.length },
    });

    this.saveState({ ...this.state });
    return { success: true, product: newProduct };
  }

  public updateProduct(
    id: string,
    updates: Partial<AdminProduct>,
    staffId?: string
  ): { success: boolean; product?: AdminProduct; error?: string } {
    const product = this.state.products.find((p) => p.id === id);
    if (!product) {
      return { success: false, error: `محصولی با کد ${id} یافت نشد.` };
    }

    if (updates.basePriceTomans !== undefined) {
      const basePrice = Number(updates.basePriceTomans);
      if (isNaN(basePrice) || basePrice <= 0) {
        return { success: false, error: 'قیمت پایه محصول باید عددی مثبت و بزرگتر از صفر باشد.' };
      }
    }

    if (updates.skuPrefix && updates.skuPrefix !== product.skuPrefix) {
      const conflict = this.state.products.some((p) => p.id !== id && p.skuPrefix === updates.skuPrefix);
      if (conflict) {
        return { success: false, error: `پیش‌وند انبارداری ${updates.skuPrefix} متعلق به محصول دیگری است.` };
      }
    }

    // Preserve historical order snapshot integrity: historical order line items are NOT mutated.
    if (updates.variants) {
      const newVariants = updates.variants;
      const otherVariants = this.state.variants.filter((v) => v.productId !== id);
      const otherSkus = new Set(otherVariants.map((v) => v.sku));

      for (const v of newVariants) {
        if (otherSkus.has(v.sku)) {
          return { success: false, error: `کد تنوع انبار (SKU: ${v.sku}) قبلاً در انبار ثبت شده است.` };
        }
      }

      // Check if any deleted variant is referenced by historical orders
      const currentSkus = new Set(product.variants.map((v) => v.sku));
      const incomingSkus = new Set(newVariants.map((v) => v.sku));
      for (const oldSku of currentSkus) {
        if (!incomingSkus.has(oldSku)) {
          const isReferencedInOrders = this.state.orders.some((o) =>
            o.items.some((i) => i.variantSku === oldSku)
          );
          if (isReferencedInOrders) {
            return {
              success: false,
              error: `کد تنوع ${oldSku} در اقلام سفارش‌های مشتریان ثبت است و نمی‌توان آن را حذف کرد. می‌توانید آن را غیرفعال کنید.`,
            };
          }
        }
      }

      this.state.variants = [
        ...otherVariants,
        ...newVariants.map((v) => ({
          ...v,
          productId: id,
          material: v.material || updates.fabricSpecs || product.fabricSpecs,
          onHandStock: Math.max(0, Number(v.onHandStock) || 0),
          reservedStock: v.reservedStock ?? 0,
          minStockThreshold: Math.max(0, Number(v.minStockThreshold) || 3),
          priceAdjustmentTomans: Number(v.priceAdjustmentTomans) || 0,
          isEnabled: v.isEnabled !== false,
        })),
      ];
      product.variants = this.state.variants.filter((v) => v.productId === id);
    }

    Object.assign(product, {
      ...updates,
      variants: product.variants,
      updatedAt: new Date().toISOString(),
    });

    if (updates.status) {
      product.isLive = updates.status === 'active';
    } else if (updates.isLive !== undefined) {
      product.status = updates.isLive ? 'active' : 'draft';
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'PRODUCT_UPDATED',
      description: `مشخصات و تنظیمات فرم پوشاک «${product.name}» (${product.id}) به‌روزرسانی شد.`,
      entityType: 'product',
      entityId: product.id,
    });

    this.saveState({ ...this.state });
    return { success: true, product };
  }

  public deleteProduct(id: string, staffId?: string): { success: boolean; error?: string } {
    const product = this.state.products.find((p) => p.id === id);
    if (!product) {
      return { success: false, error: 'محصول یافت نشد.' };
    }

    const hasOrderReferences = this.state.orders.some((o) =>
      o.items.some((item) => item.productId === id)
    );

    if (hasOrderReferences) {
      return {
        success: false,
        error: `این محصول در تاریخچه سفارشات ثبت شده است و حذف فیزیکی آن ناوردایی یکپارچگی داده را نقض می‌کند. لطفاً به جای حذف، وضعیت آن را به «بایگانی» تغییر دهید.`,
      };
    }

    const productSkus = new Set(product.variants.map((v) => v.sku));
    const hasJobReferences = this.state.productionJobs.some((j) => productSkus.has(j.variantSku));
    if (hasJobReferences) {
      return {
        success: false,
        error: `این محصول دارای کارهای تولید در کارگاه چاپ است و امکان حذف آن وجود ندارد.`,
      };
    }

    this.state.products = this.state.products.filter((p) => p.id !== id);
    this.state.variants = this.state.variants.filter((v) => v.productId !== id);

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'PRODUCT_DELETED',
      description: `محصول «${product.name}» (${product.id}) و تنوع‌های انبار آن حذف شدند.`,
      entityType: 'product',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public bulkUpdateProductStatus(
    productIds: string[],
    status: 'active' | 'draft' | 'archived',
    staffId?: string
  ): { success: boolean; updatedCount: number } {
    let count = 0;
    this.state.products.forEach((p) => {
      if (productIds.includes(p.id)) {
        p.status = status;
        p.isLive = status === 'active';
        p.updatedAt = new Date().toISOString();
        count++;
      }
    });

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'PRODUCT_BULK_STATUS_CHANGE',
      description: `وضعیت ${count} محصول به «${status === 'active' ? 'عرضه فعال' : status === 'draft' ? 'پیش‌نویس' : 'بایگانی'}» تغییر یافت.`,
      entityType: 'product',
      entityId: 'bulk',
      metadata: { count, status, productIds },
    });

    this.saveState({ ...this.state });
    return { success: true, updatedCount: count };
  }

  public createVariant(
    variant: ProductVariant,
    staffId?: string
  ): { success: boolean; error?: string } {
    if (!variant.sku || variant.sku.trim() === '') {
      return { success: false, error: 'کد تنوع انبار (SKU) الزامی است.' };
    }
    if (this.state.variants.some((v) => v.sku === variant.sku)) {
      return { success: false, error: `کد تنوع ${variant.sku} از قبل در انبار موجود است.` };
    }
    const product = this.state.products.find((p) => p.id === variant.productId);
    if (!product) {
      return { success: false, error: `محصول والد (${variant.productId}) یافت نشد.` };
    }

    const cleanVariant: ProductVariant = {
      ...variant,
      onHandStock: Math.max(0, Number(variant.onHandStock) || 0),
      reservedStock: 0,
      minStockThreshold: Math.max(0, Number(variant.minStockThreshold) || 3),
      priceAdjustmentTomans: Number(variant.priceAdjustmentTomans) || 0,
      isEnabled: variant.isEnabled !== false,
    };

    this.state.variants.push(cleanVariant);
    product.variants.push(cleanVariant);

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'VARIANT_CREATED',
      description: `کد تنوع جدید ${variant.sku} برای محصول ${product.name} تعریف شد.`,
      entityType: 'variant',
      entityId: variant.sku,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public updateVariant(
    sku: string,
    updates: Partial<ProductVariant>,
    staffId?: string
  ): { success: boolean; error?: string } {
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) {
      return { success: false, error: `کد تنوع انبار (${sku}) یافت نشد.` };
    }

    if (updates.onHandStock !== undefined) {
      if (updates.onHandStock < 0) {
        return { success: false, error: 'موجودی فیزیکی نمی‌تواند منفی باشد.' };
      }
      if (updates.onHandStock < variant.reservedStock) {
        return {
          success: false,
          error: `موجودی فیزیکی (${updates.onHandStock}) نمی‌تواند کمتر از تعداد رزرو جاری (${variant.reservedStock}) باشد.`,
        };
      }
    }

    Object.assign(variant, updates);

    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) Object.assign(pVar, updates);
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'VARIANT_UPDATED',
      description: `مشخصات تنوع انبار ${sku} به‌روز شد.`,
      entityType: 'variant',
      entityId: sku,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public deleteVariant(sku: string, staffId?: string): { success: boolean; error?: string } {
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) return { success: false, error: 'تنوع یافت نشد.' };

    const isReferenced = this.state.orders.some((o) =>
      o.items.some((i) => i.variantSku === sku)
    );
    if (isReferenced) {
      return {
        success: false,
        error: `کد تنوع ${sku} در سفارشات پیشین مشتریان وجود دارد و حذف آن ممنوع است. لطفاً به جای حذف، آن را غیرفعال کنید.`,
      };
    }

    this.state.variants = this.state.variants.filter((v) => v.sku !== sku);
    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      product.variants = product.variants.filter((v) => v.sku !== sku);
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'VARIANT_DELETED',
      description: `کد تنوع انبار ${sku} حذف گردید.`,
      entityType: 'variant',
      entityId: sku,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public createCategory(
    cat: Omit<AdminCategory, 'id'>,
    staffId?: string
  ): { success: boolean; category?: AdminCategory; error?: string } {
    if (!cat.nameFa?.trim()) return { success: false, error: 'نام فارسی دسته‌بندی الزامی است.' };
    const slug = cat.slug?.trim() || cat.nameEn?.toLowerCase().replace(/\s+/g, '-') || `cat-${Date.now()}`;
    if (this.state.categories.some((c) => c.slug === slug)) {
      return { success: false, error: `اسلاگ «${slug}» قبلاً ثبت شده است. نامک باید یکتا باشد.` };
    }

    const id = slug;
    const newCat: AdminCategory = {
      ...cat,
      id,
      slug,
      displayOrder: cat.displayOrder ?? (this.state.categories.length + 1),
      isFeatured: cat.isFeatured ?? false,
    };
    this.state.categories.push(newCat);

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'CATEGORY_CREATED',
      description: `دسته‌بندی جدید «${newCat.nameFa}» ایجاد شد.`,
      entityType: 'category',
      entityId: newCat.id,
    });

    this.saveState({ ...this.state });
    return { success: true, category: newCat };
  }

  public updateCategory(
    id: string,
    updates: Partial<AdminCategory>,
    staffId?: string
  ): { success: boolean; category?: AdminCategory; error?: string } {
    const cat = this.state.categories.find((c) => c.id === id);
    if (!cat) return { success: false, error: 'دسته‌بندی یافت نشد.' };

    if (updates.slug && updates.slug !== cat.slug) {
      if (this.state.categories.some((c) => c.id !== id && c.slug === updates.slug)) {
        return { success: false, error: `اسلاگ «${updates.slug}» برای دسته‌بندی دیگری استفاده شده است.` };
      }
    }

    Object.assign(cat, updates);
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'CATEGORY_UPDATED',
      description: `دسته‌بندی «${cat.nameFa}» به‌روزرسانی شد.`,
      entityType: 'category',
      entityId: cat.id,
    });

    this.saveState({ ...this.state });
    return { success: true, category: cat };
  }

  public deleteCategory(id: string, staffId?: string): { success: boolean; error?: string } {
    const cat = this.state.categories.find((c) => c.id === id);
    if (!cat) return { success: false, error: 'دسته‌بندی یافت نشد.' };

    const associatedCount = this.state.products.filter((p) => p.category === id).length;
    if (associatedCount > 0) {
      return {
        success: false,
        error: `تعداد ${associatedCount} محصول به دسته‌بندی «${cat.nameFa}» متصل هستند. جهت جلوگیری از شکستن لینک‌ها، ابتدا دسته‌بندی این محصولات را تغییر دهید.`,
      };
    }

    this.state.categories = this.state.categories.filter((c) => c.id !== id);
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'CATEGORY_DELETED',
      description: `دسته‌بندی «${cat.nameFa}» حذف شد.`,
      entityType: 'category',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public createCollection(
    col: Omit<AdminCollection, 'id'>,
    staffId?: string
  ): { success: boolean; collection?: AdminCollection; error?: string } {
    if (!col.titleFa?.trim()) return { success: false, error: 'عنوان کلکسیون الزامی است.' };
    const slug = col.slug?.trim() || `col-${Date.now()}`;
    if (this.state.collections.some((c) => c.slug === slug)) {
      return { success: false, error: `اسلاگ «${slug}» قبلاً ثبت شده است.` };
    }

    const id = `col-${Date.now()}`;
    const newCol: AdminCollection = {
      ...col,
      id,
      slug,
      displayOrder: col.displayOrder ?? (this.state.collections.length + 1),
      status: col.status || 'active',
      productIds: col.productIds || [],
    };
    this.state.collections.push(newCol);

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'COLLECTION_CREATED',
      description: `کلکسیون «${newCol.titleFa}» ایجاد گردید.`,
      entityType: 'collection',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true, collection: newCol };
  }

  public updateCollection(
    id: string,
    updates: Partial<AdminCollection>,
    staffId?: string
  ): { success: boolean; collection?: AdminCollection; error?: string } {
    const col = this.state.collections.find((c) => c.id === id);
    if (!col) return { success: false, error: 'کلکسیون یافت نشد.' };

    if (updates.slug && updates.slug !== col.slug) {
      if (this.state.collections.some((c) => c.id !== id && c.slug === updates.slug)) {
        return { success: false, error: `اسلاگ «${updates.slug}» برای کلکسیون دیگری ثبت شده است.` };
      }
    }

    Object.assign(col, updates);
    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'COLLECTION_UPDATED',
      description: `کلکسیون «${col.titleFa}» به‌روز شد.`,
      entityType: 'collection',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true, collection: col };
  }

  public deleteCollection(id: string, staffId?: string): { success: boolean; error?: string } {
    const col = this.state.collections.find((c) => c.id === id);
    if (!col) return { success: false, error: 'کلکسیون یافت نشد.' };

    this.state.collections = this.state.collections.filter((c) => c.id !== id);
    this.state.products.forEach((p) => {
      if (p.collectionIds?.includes(id)) {
        p.collectionIds = p.collectionIds.filter((cId) => cId !== id);
      }
    });

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'COLLECTION_DELETED',
      description: `کلکسیون «${col.titleFa}» حذف شد.`,
      entityType: 'collection',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public addMediaAsset(
    asset: Omit<MediaAsset, 'id' | 'uploadedAt'>,
    staffId?: string
  ): MediaAsset {
    const id = `med-${String(this.state.mediaAssets.length + 1).padStart(3, '0')}`;
    const newAsset: MediaAsset = {
      ...asset,
      id,
      uploadedAt: new Date().toISOString(),
    };
    this.state.mediaAssets.unshift(newAsset);
    this.saveState({ ...this.state });
    return newAsset;
  }

  public deleteMediaAsset(id: string): boolean {
    const initialLen = this.state.mediaAssets.length;
    this.state.mediaAssets = this.state.mediaAssets.filter((m) => m.id !== id);
    if (this.state.mediaAssets.length !== initialLen) {
      this.saveState({ ...this.state });
      return true;
    }
    return false;
  }

  public importProductsCsv(
    parsedRows: any[],
    staffId?: string
  ): { success: boolean; importedCount: number; errors: string[] } {
    const errors: string[] = [];
    let importedCount = 0;

    parsedRows.forEach((row, index) => {
      const rowNum = index + 1;
      const name = (row.name || row['نام محصول'] || row.title)?.trim();
      if (!name) {
        errors.push(`ردیف ${rowNum}: عنوان محصول الزامی است.`);
        return;
      }
      const rawPrice = row.basePriceTomans || row['قیمت پایه'] || row.price;
      const price = Number(String(rawPrice).replace(/[^\d]/g, ''));
      if (!price || price <= 0) {
        errors.push(`ردیف ${rowNum}: قیمت پایه «${rawPrice}» نامعتبر است.`);
        return;
      }

      const id = (row.id || row['کد شناسایی'] || `sp-${200 + index}`).trim();
      if (this.state.products.some((p) => p.id === id)) {
        errors.push(`ردیف ${rowNum}: شناسه محصول ${id} از قبل در سیستم موجود است.`);
        return;
      }

      const category = (row.category || row['دسته‌بندی'] || 'calligraphy').trim();
      const res = this.createProduct(
        {
          id,
          name,
          basePriceTomans: price,
          category,
          skuPrefix: (row.skuPrefix || row['پیش‌وند'] || `${id.toUpperCase().replace('-', '')}-TSH`).trim(),
          description: (row.description || row['توضیحات'] || `پوشاک دست‌دوز کالکشن جدید`).trim(),
          fabricSpecs: (row.fabricSpecs || row['جنس پارچه'] || '۱۰۰٪ پنبه ارگانیک سوپر دو نخ').trim(),
        },
        staffId
      );

      if (res.success) {
        importedCount++;
      } else {
        errors.push(`ردیف ${rowNum}: ${res.error}`);
      }
    });

    return {
      success: importedCount > 0,
      importedCount,
      errors,
    };
  }

  // ==========================================
  // INVENTORY & STOCK MOVEMENTS METHODS
  // ==========================================

  public getStockMovements(filterSku?: string): StockMovement[] {
    if (!this.state.stockMovements) this.state.stockMovements = [];
    if (filterSku) {
      return this.state.stockMovements.filter((m) => m.sku === filterSku);
    }
    return this.state.stockMovements;
  }

  public recordStockMovement(movement: Omit<StockMovement, 'id' | 'timestamp'>): StockMovement {
    if (!this.state.stockMovements) this.state.stockMovements = [];
    const newMovement: StockMovement = {
      id: `MOV-${1000 + this.state.stockMovements.length + 1}`,
      timestamp: new Date().toISOString(),
      ...movement,
    };
    this.state.stockMovements.unshift(newMovement);
    return newMovement;
  }

  /**
   * Goods receipt: Add stock from purchase order or supplier delivery
   */
  public goodsReceipt(
    sku: string,
    quantity: number,
    staffId: string,
    supplierName?: string,
    poId?: string,
    notes?: string
  ): { success: boolean; error?: string } {
    if (quantity <= 0) {
      return { success: false, error: 'تعداد کالای دریافتی باید عددی مثبت باشد.' };
    }
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) return { success: false, error: `کد تنوع (${sku}) یافت نشد.` };

    const previousOnHand = variant.onHandStock;
    variant.onHandStock += quantity;

    // Update in parent product
    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) pVar.onHandStock = variant.onHandStock;
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    const reasonText = notes || (poId ? `ورود کالا طبق حواله خرید ${poId}` : `ورود کالا از تامین‌کننده ${supplierName || ''}`);

    this.recordStockMovement({
      sku,
      productId: variant.productId,
      type: 'goods_receipt',
      quantityChange: quantity,
      fieldAffected: 'onHand',
      previousOnHand,
      newOnHand: variant.onHandStock,
      previousReserved: variant.reservedStock,
      newReserved: variant.reservedStock,
      reason: reasonText,
      referenceId: poId,
      actorId: staff.id,
      actorName: staff.fullName,
    });

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'STOCK_GOODS_RECEIPT',
      description: `ورود ${quantity} عدد به موجودی ${sku} ثبت گردید.`,
      entityType: 'stock',
      entityId: sku,
      metadata: { sku, quantity, poId, supplierName },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  /**
   * Record stock adjustment (deduction for scrap, cycle count, or showroom sample)
   */
  public recordStockAdjustment(
    sku: string,
    deltaOnHand: number,
    staffId: string,
    reason: string,
    type: 'manual_adjustment' | 'production_scrap' | 'sample_pull' = 'manual_adjustment'
  ): { success: boolean; error?: string } {
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) return { success: false, error: `کد تنوع (${sku}) یافت نشد.` };

    const newOnHand = variant.onHandStock + deltaOnHand;
    if (newOnHand < 0) {
      return { success: false, error: `کسر ${Math.abs(deltaOnHand)} واحد سبب منفی شدن موجودی فیزیکی (${newOnHand}) می‌شود.` };
    }
    if (newOnHand < variant.reservedStock) {
      return {
        success: false,
        error: `موجودی جدید (${newOnHand}) نمی‌تواند از تعهدات رزرو سفارشات مشتری (${variant.reservedStock}) کمتر باشد.`,
      };
    }

    const previousOnHand = variant.onHandStock;
    variant.onHandStock = newOnHand;

    // Update in product
    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) pVar.onHandStock = newOnHand;
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.recordStockMovement({
      sku,
      productId: variant.productId,
      type,
      quantityChange: deltaOnHand,
      fieldAffected: 'onHand',
      previousOnHand,
      newOnHand,
      previousReserved: variant.reservedStock,
      newReserved: variant.reservedStock,
      reason,
      actorId: staff.id,
      actorName: staff.fullName,
    });

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'STOCK_ADJUSTMENT',
      description: `اصلاح ${deltaOnHand > 0 ? '+' : ''}${deltaOnHand} عدد برای کد ${sku}. دلیل: ${reason}`,
      entityType: 'stock',
      entityId: sku,
      metadata: { deltaOnHand, reason, type },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  /**
   * Reservation logic: Locks available units when order is placed
   * Enforces: available = onHand - reserved >= quantity
   */
  public reserveStockForOrder(
    orderId: string,
    sku: string,
    quantity: number
  ): { success: boolean; error?: string } {
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) return { success: false, error: `کد تنوع ${sku} یافت نشد.` };

    const available = variant.onHandStock - variant.reservedStock;
    if (available < quantity) {
      return {
        success: false,
        error: `موجودی قابل فروش تنوع ${sku} (${available} عدد) برای رزرو ${quantity} عدد کافی نیست.`,
      };
    }

    const previousReserved = variant.reservedStock;
    variant.reservedStock += quantity;

    // Sync in product
    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) pVar.reservedStock = variant.reservedStock;
    }

    this.recordStockMovement({
      sku,
      productId: variant.productId,
      type: 'order_reservation',
      quantityChange: quantity,
      fieldAffected: 'reserved',
      previousOnHand: variant.onHandStock,
      newOnHand: variant.onHandStock,
      previousReserved,
      newReserved: variant.reservedStock,
      reason: `رزرو خودکار به ازای سفارش ${orderId}`,
      referenceId: orderId,
      actorId: 'system',
      actorName: 'موتور ثبت سفارش',
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  /**
   * Release/Fulfill logic: When order is dispatched, reserved and on-hand both decrease
   */
  public releaseStockForOrder(
    orderId: string,
    sku: string,
    quantity: number
  ): { success: boolean; error?: string } {
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) return { success: false, error: `کد تنوع ${sku} یافت نشد.` };

    const previousOnHand = variant.onHandStock;
    const previousReserved = variant.reservedStock;

    variant.onHandStock = Math.max(0, variant.onHandStock - quantity);
    variant.reservedStock = Math.max(0, variant.reservedStock - quantity);

    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) {
        pVar.onHandStock = variant.onHandStock;
        pVar.reservedStock = variant.reservedStock;
      }
    }

    this.recordStockMovement({
      sku,
      productId: variant.productId,
      type: 'order_release',
      quantityChange: -quantity,
      fieldAffected: 'both',
      previousOnHand,
      newOnHand: variant.onHandStock,
      previousReserved,
      newReserved: variant.reservedStock,
      reason: `خروج فیزیکی و ارسال سفارش ${orderId}`,
      referenceId: orderId,
      actorId: 'system',
      actorName: 'واحد لجستیک و انبار',
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  /**
   * Restore logic: Releases reservation upon order cancellation, or adds back to on-hand upon refund
   */
  public restoreStockFromCancellation(
    orderId: string,
    sku: string,
    quantity: number,
    reason: string,
    wasAlreadyShipped = false
  ): { success: boolean; error?: string } {
    const variant = this.state.variants.find((v) => v.sku === sku);
    if (!variant) return { success: false, error: `کد تنوع ${sku} یافت نشد.` };

    const previousOnHand = variant.onHandStock;
    const previousReserved = variant.reservedStock;

    if (!wasAlreadyShipped) {
      // Order cancelled before shipping -> Release reservation back to available
      variant.reservedStock = Math.max(0, variant.reservedStock - quantity);
      this.recordStockMovement({
        sku,
        productId: variant.productId,
        type: 'order_cancellation',
        quantityChange: -quantity,
        fieldAffected: 'reserved',
        previousOnHand,
        newOnHand: variant.onHandStock,
        previousReserved,
        newReserved: variant.reservedStock,
        reason: `لغو سفارش ${orderId} و آزادسازی تعهد رزرو: ${reason}`,
        referenceId: orderId,
        actorId: 'system',
        actorName: 'موتور لغو سفارش',
      });
    } else {
      // Order was shipped and returned/refunded -> Add back to on-hand stock
      variant.onHandStock += quantity;
      this.recordStockMovement({
        sku,
        productId: variant.productId,
        type: 'order_refund',
        quantityChange: quantity,
        fieldAffected: 'onHand',
        previousOnHand,
        newOnHand: variant.onHandStock,
        previousReserved,
        newReserved: variant.reservedStock,
        reason: `مرجوعی سفارش ${orderId} و بازگشت فیزیکی کالا به انبار: ${reason}`,
        referenceId: orderId,
        actorId: 'system',
        actorName: 'واحد بازرسی مرجوعی',
      });
    }

    const product = this.state.products.find((p) => p.id === variant.productId);
    if (product) {
      const pVar = product.variants.find((v) => v.sku === sku);
      if (pVar) {
        pVar.onHandStock = variant.onHandStock;
        pVar.reservedStock = variant.reservedStock;
      }
    }

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // SUPPLIERS CRUD
  // ==========================================

  public getSuppliers(): Supplier[] {
    return this.state.suppliers || [];
  }

  public createSupplier(sup: Omit<Supplier, 'id' | 'createdAt'>): { success: boolean; data?: Supplier; error?: string } {
    if (!this.state.suppliers) this.state.suppliers = [];
    const newId = `SUP-0${this.state.suppliers.length + 1}`;
    const newSupplier: Supplier = {
      id: newId,
      createdAt: new Date().toISOString(),
      ...sup,
    };
    this.state.suppliers.push(newSupplier);

    this.addActivityLog({
      actorId: this.state.staff[0].id,
      actorName: this.state.staff[0].fullName,
      actorRole: this.state.staff[0].role,
      actionType: 'SUPPLIER_CREATED',
      description: `تامین‌کننده جدید ${sup.name} ثبت شد.`,
      entityType: 'general',
      entityId: newId,
    });

    this.saveState({ ...this.state });
    return { success: true, data: newSupplier };
  }

  public updateSupplier(id: string, updates: Partial<Supplier>): { success: boolean; data?: Supplier; error?: string } {
    const sup = this.state.suppliers.find((s) => s.id === id);
    if (!sup) return { success: false, error: 'تامین‌کننده یافت نشد.' };
    Object.assign(sup, updates);

    this.addActivityLog({
      actorId: this.state.staff[0].id,
      actorName: this.state.staff[0].fullName,
      actorRole: this.state.staff[0].role,
      actionType: 'SUPPLIER_UPDATED',
      description: `اطلاعات تامین‌کننده ${sup.name} بروزرسانی گردید.`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true, data: sup };
  }

  public deleteSupplier(id: string): { success: boolean; error?: string } {
    const hasPo = this.state.purchaseOrders.some((po) => po.supplierId === id);
    if (hasPo) {
      return { success: false, error: 'امکان حذف تامین‌کننده‌ای که دارای سابقه سفارش خرید است وجود ندارد.' };
    }
    const sup = this.state.suppliers.find((s) => s.id === id);
    this.state.suppliers = this.state.suppliers.filter((s) => s.id !== id);

    this.addActivityLog({
      actorId: this.state.staff[0].id,
      actorName: this.state.staff[0].fullName,
      actorRole: this.state.staff[0].role,
      actionType: 'SUPPLIER_DELETED',
      description: `تامین‌کننده ${sup?.name || id} حذف شد.`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // PURCHASE ORDERS CRUD & WORKFLOW
  // ==========================================

  public getPurchaseOrders(): PurchaseOrder[] {
    return this.state.purchaseOrders || [];
  }

  public createPurchaseOrder(po: Omit<PurchaseOrder, 'id' | 'createdAt'>): { success: boolean; data?: PurchaseOrder; error?: string } {
    if (!this.state.purchaseOrders) this.state.purchaseOrders = [];
    const newId = `PO-2026-0${38 + this.state.purchaseOrders.length + 1}`;
    const newPo: PurchaseOrder = {
      id: newId,
      createdAt: new Date().toISOString(),
      ...po,
    };
    this.state.purchaseOrders.unshift(newPo);

    this.addActivityLog({
      actorId: po.createdById,
      actorName: po.createdByName,
      actorRole: 'admin',
      actionType: 'PURCHASE_ORDER_CREATED',
      description: `سفارش خرید ${newId} برای تامین‌کننده ${po.supplierName} ثبت شد.`,
      entityType: 'general',
      entityId: newId,
    });

    this.saveState({ ...this.state });
    return { success: true, data: newPo };
  }

  public receivePurchaseOrder(
    poId: string,
    staffId: string,
    receivedItems?: { itemId: string; receivedQty: number }[]
  ): { success: boolean; error?: string } {
    const po = this.state.purchaseOrders.find((p) => p.id === poId);
    if (!po) return { success: false, error: 'سفارش خرید یافت نشد.' };

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];

    po.items.forEach((item) => {
      const targetQty = receivedItems?.find((r) => r.itemId === item.id)?.receivedQty ?? item.orderedQuantity;
      const additionalReceived = Math.max(0, targetQty - item.receivedQuantity);
      item.receivedQuantity = targetQty;

      if (additionalReceived > 0) {
        if (item.itemType === 'variant_sku') {
          // Increase variant onHandStock & record movement
          this.goodsReceipt(item.itemRefId, additionalReceived, staff.id, po.supplierName, po.id, `دریافت اقلام طبق سفارش خرید ${po.id}`);
        } else if (item.itemType === 'raw_material') {
          // Increase material onHandQuantity
          const mat = this.state.workshopMaterials.find((m) => m.id === item.itemRefId);
          if (mat) {
            mat.onHandQuantity += additionalReceived;
          }
        }
      }
    });

    const allReceived = po.items.every((it) => it.receivedQuantity >= it.orderedQuantity);
    po.status = allReceived ? 'received' : 'partially_received';
    po.receivedAt = new Date().toISOString();

    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'PURCHASE_ORDER_RECEIVED',
      description: `رسید انبار برای سفارش خرید ${poId} ثبت شد. وضعیت: ${allReceived ? 'دریافت کامل' : 'دریافت بخشی'}`,
      entityType: 'general',
      entityId: poId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public cancelPurchaseOrder(poId: string, staffId: string, reason: string): { success: boolean; error?: string } {
    const po = this.state.purchaseOrders.find((p) => p.id === poId);
    if (!po) return { success: false, error: 'سفارش خرید یافت نشد.' };
    if (po.status === 'received') {
      return { success: false, error: 'سفارش خریدی که به طور کامل دریافت شده قابل لغو نیست.' };
    }
    po.status = 'cancelled';
    po.notes = `${po.notes || ''} [لغو شده: ${reason}]`;

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'PURCHASE_ORDER_CANCELLED',
      description: `سفارش خرید ${poId} لغو شد. دلیل: ${reason}`,
      entityType: 'general',
      entityId: poId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // WORKSHOP MATERIALS
  // ==========================================

  public getWorkshopMaterials(): WorkshopMaterial[] {
    return this.state.workshopMaterials || [];
  }

  public updateMaterialStock(
    id: string,
    newOnHand: number,
    staffId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const mat = this.state.workshopMaterials.find((m) => m.id === id);
    if (!mat) return { success: false, error: 'ماده مصرفی یافت نشد.' };
    if (newOnHand < 0) return { success: false, error: 'موجودی ماده مصرفی نمی‌تواند منفی باشد.' };

    const prev = mat.onHandQuantity;
    mat.onHandQuantity = newOnHand;

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'STOCK_ADJUSTMENT',
      description: `موجودی ${mat.nameFa} از ${prev} به ${newOnHand} ${mat.unitOfMeasure} اصلاح شد. دلیل: ${reason}`,
      entityType: 'stock',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // CUSTOMER MANAGEMENT MUTATIONS (Prompt 14)
  // ==========================================

  public addCustomerNote(
    customerId: string,
    text: string,
    actorName: string,
    linkedOrderId?: string,
    linkedDesignId?: string
  ): { success: boolean; note?: any; error?: string } {
    if (!text.trim()) {
      return { success: false, error: 'متن یادداشت نمی‌تواند خالی باشد.' };
    }
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) {
      return { success: false, error: 'مشتری مورد نظر یافت نشد.' };
    }

    if (!customer.staffNotes) customer.staffNotes = [];
    if (!customer.auditTrail) customer.auditTrail = [];

    const nowIso = new Date().toISOString();
    const noteId = `NOTE-${customerId}-${customer.staffNotes.length + 1}`;
    const newNote = {
      id: noteId,
      timestamp: nowIso,
      authorId: 'STF-ADMIN',
      authorName: actorName,
      text: text.trim(),
      linkedOrderId: linkedOrderId || undefined,
      linkedDesignId: linkedDesignId || undefined,
    };
    customer.staffNotes.unshift(newNote);

    const auditEntry = {
      id: `AUD-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      action: 'ثبت یادداشت پرسنلی',
      note: text.trim().slice(0, 50) + (text.length > 50 ? '...' : ''),
    };
    customer.auditTrail.unshift(auditEntry);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ثبت یادداشت جدید در پرونده مشتری ${customer.fullName} (${customer.id})`,
      entityType: 'general',
      entityId: customer.id,
    });

    this.saveState({ ...this.state });
    return { success: true, note: newNote };
  }

  public updateCustomer(
    customerId: string,
    updates: {
      fullName?: string;
      phone?: string;
      email?: string;
      city?: string;
      province?: string;
      address?: string;
      postalCode?: string;
      marketingConsent?: boolean;
    },
    actorName: string
  ): { success: boolean; customer?: Customer; error?: string } {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: 'مشتری مورد نظر یافت نشد.' };

    if (updates.phone !== undefined) {
      const cleanPhone = updates.phone.trim();
      const iranPhoneRegex = /^09\d{9}$/;
      if (!iranPhoneRegex.test(cleanPhone)) {
        return { success: false, error: 'شماره تلفن همراه باید با ۰۹ شروع شده و دقیقاً ۱۱ رقم باشد.' };
      }
      // Duplicate detection
      const existing = this.state.customers.find((c) => c.id !== customerId && c.phone === cleanPhone);
      if (existing) {
        return { success: false, error: `شماره تلفن قبلاً برای مشتری دیگر (${existing.fullName} - ${existing.id}) ثبت شده است.` };
      }
      customer.phone = cleanPhone;
    }

    if (updates.email !== undefined) {
      const cleanEmail = updates.email.trim().toLowerCase();
      if (cleanEmail && !cleanEmail.includes('@')) {
        return { success: false, error: 'فرمت پست الکترونیک وارد شده معتبر نمی‌باشد.' };
      }
      // Duplicate detection
      if (cleanEmail) {
        const existingEmail = this.state.customers.find((c) => c.id !== customerId && c.email.toLowerCase() === cleanEmail);
        if (existingEmail) {
          return { success: false, error: `پست الکترونیک قبلاً برای مشتری دیگر (${existingEmail.fullName} - ${existingEmail.id}) ثبت شده است.` };
        }
      }
      customer.email = cleanEmail;
    }

    if (updates.fullName !== undefined) {
      if (!updates.fullName.trim()) return { success: false, error: 'نام و نام‌خانوادگی نمی‌تواند خالی باشد.' };
      customer.fullName = updates.fullName.trim();
    }
    if (updates.city !== undefined) customer.city = updates.city.trim();
    if (updates.province !== undefined) customer.province = updates.province.trim();
    if (updates.address !== undefined) customer.address = updates.address.trim();
    if (updates.postalCode !== undefined) customer.postalCode = updates.postalCode.trim();
    if (updates.marketingConsent !== undefined) customer.marketingConsent = updates.marketingConsent;

    if (!customer.auditTrail) customer.auditTrail = [];
    const nowIso = new Date().toISOString();
    customer.auditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      action: 'ویرایش اطلاعات هویتی و ارتباطی مشتری',
      note: 'به‌روزرسانی با بررسی اعتبار شماره تماس و عدم تکراری بودن',
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ویرایش مشخصات مشتری ${customer.fullName} (${customer.id})`,
      entityType: 'general',
      entityId: customer.id,
    });

    this.saveState({ ...this.state });
    return { success: true, customer };
  }

  public toggleCustomerStatus(
    customerId: string,
    newStatus: 'active' | 'inactive' | 'deactivated',
    reason: string,
    actorName: string
  ): { success: boolean; customer?: Customer; error?: string } {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: 'مشتری مورد نظر یافت نشد.' };

    const prev = customer.status || 'active';
    customer.status = newStatus;

    if (!customer.auditTrail) customer.auditTrail = [];
    const nowIso = new Date().toISOString();
    customer.auditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      action: `تغییر وضعیت از ${prev} به ${newStatus}`,
      note: reason.trim() || undefined,
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `تغییر وضعیت حساب مشتری ${customer.fullName} به ${newStatus}. دلیل: ${reason}`,
      entityType: 'general',
      entityId: customer.id,
    });

    this.saveState({ ...this.state });
    return { success: true, customer };
  }

  public createCustomer(
    data: {
      fullName: string;
      phone: string;
      email: string;
      city: string;
      province: string;
      address: string;
      postalCode: string;
      marketingConsent?: boolean;
      tag?: Customer['tag'];
    },
    actorName: string
  ): { success: boolean; customer?: Customer; error?: string } {
    if (!data.fullName.trim()) return { success: false, error: 'نام و نام‌خانوادگی الزامی است.' };
    const cleanPhone = data.phone.trim();
    if (!/^09\d{9}$/.test(cleanPhone)) {
      return { success: false, error: 'شماره تلفن همراه باید با ۰۹ شروع شده و ۱۱ رقم باشد.' };
    }
    // Duplicate detection
    const existingPhone = this.state.customers.find((c) => c.phone === cleanPhone);
    if (existingPhone) {
      return { success: false, error: `شماره تلفن همراه قبلاً برای مشتری (${existingPhone.fullName} - ${existingPhone.id}) ثبت شده است.` };
    }

    const cleanEmail = data.email.trim().toLowerCase();
    if (cleanEmail) {
      const existingEmail = this.state.customers.find((c) => c.email.toLowerCase() === cleanEmail);
      if (existingEmail) {
        return { success: false, error: `پست الکترونیک قبلاً برای مشتری (${existingEmail.fullName} - ${existingEmail.id}) ثبت شده است.` };
      }
    }

    const nextNum = this.state.customers.length + 1001;
    const newId = `CUST-${nextNum}`;
    const nowIso = new Date().toISOString();

    const newCustomer: Customer = {
      id: newId,
      fullName: data.fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail || `customer${nextNum}@shahpoosh.ir`,
      city: data.city.trim() || 'تهران',
      province: data.province.trim() || 'تهران',
      address: data.address.trim() || 'تهران، خیابان ولیعصر',
      postalCode: data.postalCode.trim() || '۱۹۸۵۷۱۴۲۳۰',
      totalOrdersCount: 0,
      totalSpentTomans: 0,
      tag: data.tag || 'new',
      status: 'active',
      marketingConsent: data.marketingConsent ?? true,
      createdAt: nowIso,
      lastActiveAt: nowIso,
      addresses: [
        {
          id: `ADDR-${nextNum}-1`,
          title: 'نشانی اصلی',
          recipientName: data.fullName.trim(),
          phone: cleanPhone,
          province: data.province.trim() || 'تهران',
          city: data.city.trim() || 'تهران',
          fullAddress: data.address.trim() || 'تهران، خیابان ولیعصر',
          postalCode: data.postalCode.trim() || '۱۹۸۵۷۱۴۲۳۰',
          isDefault: true,
        },
      ],
      auditTrail: [
        {
          id: `AUD-${Date.now()}`,
          timestamp: nowIso,
          actorName,
          action: 'افتتاح پرونده مشتری جدید توسط پرسنل',
          note: 'ثبت دستی مشتری در پنل مدیریت با احراز مشخصات هویتی',
        },
      ],
      staffNotes: [
        {
          id: `NOTE-${newId}-1`,
          timestamp: nowIso,
          authorId: 'STF-ADMIN',
          authorName: actorName,
          text: 'افتتاح پرونده مشتری توسط واحد پشتیبانی شاه‌پوش.',
        },
      ],
      savedFavorites: [],
      cartItems: [],
      supportTickets: [],
      reviews: [],
      browsingEvents: [],
    };

    this.state.customers.unshift(newCustomer);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ایجاد پرونده مشتری جدید ${newCustomer.fullName} با شناسه ${newCustomer.id}`,
      entityType: 'general',
      entityId: newCustomer.id,
    });

    this.saveState({ ...this.state });
    return { success: true, customer: newCustomer };
  }

  public requestCustomerDataExport(
    customerId: string,
    actorName: string
  ): { success: boolean; exportData?: any; error?: string } {
    const details = this.getCustomerDetails(customerId);
    if (!details) return { success: false, error: 'مشتری مورد نظر یافت نشد.' };

    const nowIso = new Date().toISOString();
    if (!details.customer.auditTrail) details.customer.auditTrail = [];
    details.customer.auditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      action: 'صدور بسته استخراج داده‌های شخصی (GDPR Data Portability)',
      note: 'دریافت خروجی استاندارد JSON از سوابق تراکنش‌ها، سفارش‌ها، طرح‌ها و نظرات',
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `صدور خروجی داده‌های شخصی مشتری ${details.customer.fullName} (${details.customer.id})`,
      entityType: 'general',
      entityId: details.customer.id,
    });

    this.saveState({ ...this.state });
    return {
      success: true,
      exportData: {
        exportedAt: nowIso,
        system: 'Shahpoosh Streetwear Data Management',
        customer: details.customer,
        orders: details.orders,
        payments: details.payments,
        customDesigns: details.customDesigns,
        reviews: details.reviews,
        supportTickets: details.supportTickets,
        addresses: details.addresses,
        calculatedLtvTomans: details.netLtvSpendTomans,
      },
    };
  }

  public requestCustomerDeletion(
    customerId: string,
    reason: string,
    actorName: string
  ): { success: boolean; customer?: Customer; error?: string } {
    const customer = this.state.customers.find((c) => c.id === customerId);
    if (!customer) return { success: false, error: 'مشتری مورد نظر یافت نشد.' };

    const nowIso = new Date().toISOString();
    customer.deletionRequested = {
      requestedAt: nowIso,
      reason: reason.trim() || 'درخواست حذف داده و حق فراموشی (Right to be Forgotten)',
      status: 'pending_review',
      requestedBy: actorName,
    };
    customer.status = 'deactivated';

    if (!customer.auditTrail) customer.auditTrail = [];
    customer.auditTrail.unshift({
      id: `AUD-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      action: 'ثبت درخواست امن حذف و تعلیق حساب (Deletion Request)',
      note: `دلیل درخواست: ${reason.trim() || 'درخواست کاربر'}. حساب غیرفعال گردید تا پس از اتمام دوره‌های الزامی مالیاتی آرشیو شود.`,
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ثبت درخواست حذف حساب مشتری ${customer.fullName} (${customer.id}) و غیرفعال‌سازی آن`,
      entityType: 'general',
      entityId: customer.id,
    });

    this.saveState({ ...this.state });
    return { success: true, customer };
  }

  // ==========================================
  // SHIPPING & FULFILLMENT (Prompt 15)
  // ==========================================

  public getShipments(filters?: {
    status?: string;
    carrier?: string;
    search?: string;
  }): Shipment[] {
    let list = [...(this.state.shipments || [])];

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((s) => s.status === filters.status);
    }

    if (filters?.carrier && filters.carrier !== 'all') {
      list = list.filter((s) => s.carrier === filters.carrier);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((s) =>
        s.id.toLowerCase().includes(q) ||
        s.orderId.toLowerCase().includes(q) ||
        (s.trackingCode && s.trackingCode.toLowerCase().includes(q)) ||
        (s.customerName && s.customerName.toLowerCase().includes(q)) ||
        (s.destinationCity && s.destinationCity.toLowerCase().includes(q))
      );
    }

    return list;
  }

  public getShipmentById(id: string): {
    shipment: Shipment;
    order?: any;
    customer?: Customer;
    qcEligibility: {
      eligible: boolean;
      reasonFa?: string;
      hasCustomItems: boolean;
      qcPassed: boolean;
      customJobsCount: number;
      pendingQcJobsCount: number;
    };
  } | null {
    const shipment = (this.state.shipments || []).find((s) => s.id === id);
    if (!shipment) return null;

    const order = this.state.orders.find((o) => o.id === shipment.orderId);
    const customer = this.state.customers.find((c) => c.id === shipment.customerId);
    const qcEligibility = this.canFulfillShipment(shipment.orderId);

    return {
      shipment,
      order,
      customer,
      qcEligibility,
    };
  }

  /**
   * INVARIANT (Prompt 15):
   * Shipment cannot leap over production!
   * Clearly prevent shipment when custom items have not passed QC.
   */
  public canFulfillShipment(orderId: string): {
    eligible: boolean;
    reasonFa?: string;
    hasCustomItems: boolean;
    qcPassed: boolean;
    customJobsCount: number;
    pendingQcJobsCount: number;
  } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) {
      return {
        eligible: false,
        reasonFa: 'سفارش متناظر در سیستم یافت نشد.',
        hasCustomItems: false,
        qcPassed: false,
        customJobsCount: 0,
        pendingQcJobsCount: 0,
      };
    }

    const customJobs = (this.state.productionJobs || []).filter((j) => j.orderId === orderId);
    const hasCustomItems = order.hasCustomLineItem || customJobs.length > 0;

    if (!hasCustomItems) {
      // Standard stock items are ready for packaging without DTG workshop QC
      return {
        eligible: true,
        hasCustomItems: false,
        qcPassed: true,
        customJobsCount: 0,
        pendingQcJobsCount: 0,
      };
    }

    // Check if custom jobs have completed QC
    const pendingQcJobs = customJobs.filter(
      (j) => j.stage !== 'completed' || (j.checklist && !j.checklist.every((c) => c.checked))
    );

    const qcPassed = customJobs.length > 0 && pendingQcJobs.length === 0;

    if (!qcPassed) {
      return {
        eligible: false,
        reasonFa: `این سفارش شامل ${customJobs.length} قطعه چاپ اختصاصی DTG است که ${pendingQcJobs.length} مورد آن هنوز آزمون کنترل کیفیت (QC) و تثبیت حرارتی را سپری نکرده‌اند. ارسال مرسوله نمی‌تواند خط تولید را دور بزند.`,
        hasCustomItems: true,
        qcPassed: false,
        customJobsCount: customJobs.length,
        pendingQcJobsCount: pendingQcJobs.length,
      };
    }

    return {
      eligible: true,
      hasCustomItems: true,
      qcPassed: true,
      customJobsCount: customJobs.length,
      pendingQcJobsCount: 0,
    };
  }

  public packShipment(
    shipmentId: string,
    staffName: string,
    notes?: string
  ): { success: boolean; error?: string } {
    const shipment = (this.state.shipments || []).find((s) => s.id === shipmentId);
    if (!shipment) return { success: false, error: 'مرسوله یافت نشد.' };

    const qc = this.canFulfillShipment(shipment.orderId);
    if (!qc.eligible) {
      return { success: false, error: qc.reasonFa };
    }

    const nowIso = new Date().toISOString();
    shipment.status = 'packed';
    shipment.packedAt = nowIso;
    shipment.packedByStaffName = staffName;

    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.unshift({
      timestamp: nowIso,
      stage: 'packed',
      titleFa: 'بسته‌بندی در جعبه مشکی لوکس شاه‌پوش',
      descriptionFa: notes || `بسته‌بندی و الصاق شناسنامه اصالت توسط ${staffName} تایید شد.`,
      isCompleted: true,
    });

    const order = this.state.orders.find((o) => o.id === shipment.orderId);
    if (order) {
      order.shippingStatus = 'packed';
      order.updatedAt = nowIso;
    }

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'production_operator',
      actionType: 'STAFF_ACTION',
      description: `بسته‌بندی مرسوله ${shipment.id} برای سفارش ${shipment.orderId} ثبت گردید.`,
      entityType: 'order',
      entityId: shipment.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public generateMockShippingLabel(
    shipmentId: string,
    carrier: CarrierName,
    staffName: string,
    customTrackingCode?: string
  ): { success: boolean; trackingCode?: string; error?: string } {
    const shipment = (this.state.shipments || []).find((s) => s.id === shipmentId);
    if (!shipment) return { success: false, error: 'مرسوله یافت نشد.' };

    const nowIso = new Date().toISOString();
    const prefix = carrier === 'tipax' ? 'TPX' : carrier === 'courier_tehran' ? 'TEH' : 'PST';
    const trackingCode = customTrackingCode || `${prefix}-${Math.floor(100000000 + Math.random() * 900000000)}`;

    shipment.carrier = carrier;
    shipment.trackingCode = trackingCode;
    shipment.status = 'label_created';
    shipment.isMockLabel = true;

    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.unshift({
      timestamp: nowIso,
      stage: 'label_created',
      titleFa: 'صدور بارنامه و بارکد رهگیری پستی (شبیه‌ساز)',
      descriptionFa: `بارنامه الکترونیک ${carrier} با کد رهگیری ${trackingCode} صادر شد (وب‌سرویس در حالت دمو).`,
      isCompleted: true,
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'production_operator',
      actionType: 'STAFF_ACTION',
      description: `صدور بارنامه برای مرسوله ${shipment.id} با کد رهگیری ${trackingCode} (${carrier})`,
      entityType: 'order',
      entityId: shipment.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true, trackingCode };
  }

  public dispatchShipment(
    shipmentId: string,
    staffName: string
  ): { success: boolean; error?: string } {
    const shipment = (this.state.shipments || []).find((s) => s.id === shipmentId);
    if (!shipment) return { success: false, error: 'مرسوله یافت نشد.' };

    const qc = this.canFulfillShipment(shipment.orderId);
    if (!qc.eligible) {
      return { success: false, error: qc.reasonFa };
    }

    const nowIso = new Date().toISOString();
    shipment.status = 'in_transit';
    shipment.dispatchedAt = nowIso;

    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.unshift({
      timestamp: nowIso,
      stage: 'dispatched',
      titleFa: 'خروج از مرکز توزیع کارگاه و تحویل به ناوگان حمل',
      descriptionFa: `مرسوله تحویل نماینده جمع‌آوری ${shipment.carrier} شد و به سمت مقصد در حرکت است.`,
      isCompleted: true,
    });

    const order = this.state.orders.find((o) => o.id === shipment.orderId);
    if (order) {
      order.status = 'shipped';
      order.shippingStatus = 'shipped';
      order.updatedAt = nowIso;
    }

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'production_operator',
      actionType: 'STAFF_ACTION',
      description: `ارسال مرسوله ${shipment.id} سفارش ${shipment.orderId} به ناوگان ثبت شد.`,
      entityType: 'order',
      entityId: shipment.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public deliverShipment(
    shipmentId: string,
    staffName: string
  ): { success: boolean; error?: string } {
    const shipment = (this.state.shipments || []).find((s) => s.id === shipmentId);
    if (!shipment) return { success: false, error: 'مرسوله یافت نشد.' };

    const nowIso = new Date().toISOString();
    shipment.status = 'delivered';
    shipment.deliveredAt = nowIso;

    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.unshift({
      timestamp: nowIso,
      stage: 'delivered',
      titleFa: 'تحویل نهایی به گیرنده',
      descriptionFa: `مرسوله در نشانی مقصد با ثبت امضای دیجیتال گیرنده (${shipment.recipientName || 'خریدار'}) تحویل گردید.`,
      isCompleted: true,
    });

    const order = this.state.orders.find((o) => o.id === shipment.orderId);
    if (order) {
      order.status = 'delivered';
      order.shippingStatus = 'delivered';
      order.updatedAt = nowIso;
    }

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `تایید تحویل مرسوله ${shipment.id} به خریدار سفارش ${shipment.orderId}`,
      entityType: 'order',
      entityId: shipment.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public recordShipmentAddressCorrection(
    shipmentId: string,
    newAddress: string,
    reason: string,
    staffName: string
  ): { success: boolean; error?: string } {
    const shipment = (this.state.shipments || []).find((s) => s.id === shipmentId);
    if (!shipment) return { success: false, error: 'مرسوله یافت نشد.' };
    if (!newAddress || !newAddress.trim()) {
      return { success: false, error: 'نشانی جدید نمی‌تواند خالی باشد.' };
    }

    const nowIso = new Date().toISOString();
    const prevAddress = shipment.shippingAddress || 'نشانی پیشین ثبت نشده';
    shipment.shippingAddress = newAddress.trim();

    if (!shipment.addressCorrections) shipment.addressCorrections = [];
    shipment.addressCorrections.unshift({
      id: `AC-${Date.now()}`,
      timestamp: nowIso,
      previousAddress: prevAddress,
      newAddress: newAddress.trim(),
      reason: reason.trim() || 'درخواست تغییر نشانی توسط خریدار',
      actorName: staffName,
    });

    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.unshift({
      timestamp: nowIso,
      stage: 'address_corrected',
      titleFa: 'اصلاح نشانی و بازتوزیع مرسوله',
      descriptionFa: `نشانی گیرنده اصلاح شد: ${newAddress.trim()} (علت: ${reason || 'هماهنگی تلفنی'})`,
      isCompleted: true,
    });

    const order = this.state.orders.find((o) => o.id === shipment.orderId);
    if (order) {
      order.shippingAddress = newAddress.trim();
      order.updatedAt = nowIso;
    }

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `اصلاح نشانی تحویل مرسوله ${shipment.id} (سفارش ${shipment.orderId})`,
      entityType: 'order',
      entityId: shipment.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public recordShipmentException(
    shipmentId: string,
    exceptionReason: string,
    staffName: string
  ): { success: boolean; error?: string } {
    const shipment = (this.state.shipments || []).find((s) => s.id === shipmentId);
    if (!shipment) return { success: false, error: 'مرسوله یافت نشد.' };

    const nowIso = new Date().toISOString();
    shipment.status = 'exception';
    shipment.exceptionReason = exceptionReason.trim();

    if (!shipment.deliveryAttempts) shipment.deliveryAttempts = [];
    shipment.deliveryAttempts.unshift({
      attemptNumber: shipment.deliveryAttempts.length + 1,
      timestamp: nowIso,
      status: 'failed',
      note: exceptionReason.trim(),
    });

    if (!shipment.timeline) shipment.timeline = [];
    shipment.timeline.unshift({
      timestamp: nowIso,
      stage: 'exception',
      titleFa: 'گزارش رخداد استثنا در توزیع پستی',
      descriptionFa: `تحویل ناموفق: ${exceptionReason.trim()}. نیاز به تماس پشتیبانی و بازتوزیع.`,
      isCompleted: true,
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `ثبت رخداد استثنا در ارسال مرسوله ${shipment.id}: ${exceptionReason.trim()}`,
      entityType: 'order',
      entityId: shipment.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public bulkPackEligibleShipments(
    shipmentIds: string[],
    staffName: string
  ): { packedCount: number; skippedCount: number; errors: string[] } {
    let packedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    shipmentIds.forEach((id) => {
      const res = this.packShipment(id, staffName);
      if (res.success) {
        packedCount++;
      } else {
        skippedCount++;
        if (res.error) errors.push(`${id}: ${res.error}`);
      }
    });

    return { packedCount, skippedCount, errors };
  }

  // ==========================================
  // RETURNS & EXCHANGES (Prompt 15)
  // ==========================================

  public getReturnRequests(filters?: {
    status?: string;
    search?: string;
  }): ReturnRequest[] {
    if (!this.state.returnRequests || this.state.returnRequests.length === 0) {
      this.state.returnRequests = [...DEFAULT_RETURN_REQUESTS];
    }

    let list = [...this.state.returnRequests];

    if (filters?.status && filters.status !== 'all') {
      list = list.filter((r) => r.status === filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.orderId.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.reasonFa.toLowerCase().includes(q)
      );
    }

    return list;
  }

  public getReturnRequestById(id: string): {
    returnRequest: ReturnRequest;
    order?: any;
    customer?: Customer;
    linkedRefund?: any;
  } | null {
    if (!this.state.returnRequests) {
      this.state.returnRequests = [...DEFAULT_RETURN_REQUESTS];
    }

    const returnRequest = this.state.returnRequests.find((r) => r.id === id);
    if (!returnRequest) return null;

    const order = this.state.orders.find((o) => o.id === returnRequest.orderId);
    const customer = this.state.customers.find((c) => c.id === returnRequest.customerId);
    const linkedRefund = returnRequest.linkedRefundId
      ? (this.state.refunds || []).find((rf) => rf.id === returnRequest.linkedRefundId)
      : undefined;

    return {
      returnRequest,
      order,
      customer,
      linkedRefund,
    };
  }

  /**
   * INVARIANT (Prompt 15):
   * Refund/stock are NOT falsely mutated by merely requesting return!
   */
  public createReturnRequest(data: {
    orderId: string;
    customerId: string;
    customerName: string;
    customerPhone?: string;
    items: ReturnRequestItem[];
    reason: ReturnReason;
    reasonFa: string;
    isCustomizedGood: boolean;
    policyNotes: string;
    refundAmountTomans?: number;
    staffName: string;
  }): { success: boolean; returnRequest?: ReturnRequest; error?: string } {
    if (!this.state.returnRequests) {
      this.state.returnRequests = [...DEFAULT_RETURN_REQUESTS];
    }

    const nowIso = new Date().toISOString();
    const newId = `RET-${100 + this.state.returnRequests.length + 1}`;

    const newReq: ReturnRequest = {
      id: newId,
      orderId: data.orderId,
      customerId: data.customerId,
      customerName: data.customerName,
      customerPhone: data.customerPhone || '09120000000',
      items: data.items,
      reason: data.reason,
      reasonFa: data.reasonFa,
      status: 'requested',
      requestedAt: nowIso,
      isCustomizedGood: data.isCustomizedGood,
      policyNotes: data.policyNotes,
      refundAmountTomans: data.refundAmountTomans,
      auditTrail: [
        {
          timestamp: nowIso,
          actorName: data.staffName,
          action: 'ثبت درخواست مرجوعی کالا',
          note: `ثبت اولیه پرونده مرجوعی با علت: ${data.reasonFa}. موجودی انبار و استرداد مالی در این مرحله تغییر نکرده است.`,
        },
      ],
    };

    this.state.returnRequests.unshift(newReq);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: data.staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `ثبت درخواست مرجوعی ${newId} برای سفارش ${data.orderId}`,
      entityType: 'order',
      entityId: data.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true, returnRequest: newReq };
  }

  public receiveReturnParcel(
    returnId: string,
    staffName: string,
    note?: string
  ): { success: boolean; error?: string } {
    if (!this.state.returnRequests) this.state.returnRequests = [...DEFAULT_RETURN_REQUESTS];
    const req = this.state.returnRequests.find((r) => r.id === returnId);
    if (!req) return { success: false, error: 'پرونده مرجوعی یافت نشد.' };

    const nowIso = new Date().toISOString();
    req.status = 'received_inspecting';
    req.receivedAt = nowIso;
    req.auditTrail.unshift({
      timestamp: nowIso,
      actorName: staffName,
      action: 'دریافت بسته مرجوعی فیزیکی در انبار مرکزی',
      note: note || 'بسته از پست یا پیک تحویل گرفته شد و در صف کارشناسی فنی قرار گرفت.',
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'production_operator',
      actionType: 'STAFF_ACTION',
      description: `دریافت بسته مرجوعی ${returnId} در انبار`,
      entityType: 'order',
      entityId: req.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public inspectReturnParcel(
    returnId: string,
    outcome: InspectionOutcome,
    restockEligible: boolean,
    notes: string,
    staffName: string
  ): { success: boolean; error?: string } {
    if (!this.state.returnRequests) this.state.returnRequests = [...DEFAULT_RETURN_REQUESTS];
    const req = this.state.returnRequests.find((r) => r.id === returnId);
    if (!req) return { success: false, error: 'پرونده مرجوعی یافت نشد.' };

    const nowIso = new Date().toISOString();
    req.inspectedAt = nowIso;
    req.inspectionOutcome = outcome;
    req.restockEligible = restockEligible;
    req.inspectionNotes = notes.trim();

    req.status = outcome === 'damaged_scrap' ? 'inspection_failed' : 'inspection_passed';

    const outcomeLabels: Record<InspectionOutcome, string> = {
      intact_resellable: 'سالم و پلمپ (قابل عرضه مجدد)',
      minor_defect_reworkable: 'نقص جزئی قابل ریوورک و اصلاح',
      damaged_scrap: 'آسیب‌دیده، غیرقابل استفاده / مصرف شده',
    };

    req.auditTrail.unshift({
      timestamp: nowIso,
      actorName: staffName,
      action: 'کارشناسی فنی و کنترل فیزیکی لباس',
      note: `نتیجه: ${outcomeLabels[outcome]} | قابلیت بازگشت به قفسه انبار: ${restockEligible ? 'بله' : 'خیر'} | توضیحات: ${notes.trim()}`,
    });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'production_operator',
      actionType: 'STAFF_ACTION',
      description: `کارشناسی مرجوعی ${returnId}: ${outcomeLabels[outcome]}`,
      entityType: 'order',
      entityId: req.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public resolveReturnRequest(
    returnId: string,
    resolution: ReturnResolution,
    staffName: string,
    options?: {
      executeRestock?: boolean;
      executeRefund?: boolean;
    }
  ): { success: boolean; error?: string } {
    if (!this.state.returnRequests) this.state.returnRequests = [...DEFAULT_RETURN_REQUESTS];
    const req = this.state.returnRequests.find((r) => r.id === returnId);
    if (!req) return { success: false, error: 'پرونده مرجوعی یافت نشد.' };

    const nowIso = new Date().toISOString();
    req.resolution = resolution;

    if (resolution === 'rejected') {
      req.status = 'rejected';
      req.auditTrail.unshift({
        timestamp: nowIso,
        actorName: staffName,
        action: 'رد درخواست مرجوعی',
        note: 'درخواست طبق نظر کارشناسی و مغایرت با شرایط بازگشت کالا رد گردید.',
      });
    } else if (resolution === 'exchange_replacement') {
      req.status = 'replacement_dispatched';
      req.linkedReplacementOrderId = `SHP-1405-REP-${Math.floor(1000 + Math.random() * 9000)}`;
      req.auditTrail.unshift({
        timestamp: nowIso,
        actorName: staffName,
        action: 'تایید تعویض کالا و صدور سفارش جایگزین',
        note: `سفارش جایگزین ${req.linkedReplacementOrderId} برای تحویل به مشتری ایجاد شد.`,
      });
    } else if (resolution === 'gateway_refund' || resolution === 'store_credit') {
      req.status = 'refund_processed';

      if (options?.executeRefund && req.refundAmountTomans && req.refundAmountTomans > 0) {
        const refRes = this.issueSimulatedRefund(
          req.orderId,
          req.refundAmountTomans,
          `استرداد وجه پرونده مرجوعی ${req.id}`,
          'STF-01'
        );
        if (refRes.success && refRes.refundId) {
          req.linkedRefundId = refRes.refundId;
        }
      }

      req.auditTrail.unshift({
        timestamp: nowIso,
        actorName: staffName,
        action: resolution === 'gateway_refund' ? 'تسویه استرداد مالی به حساب' : 'افزایش اعتبار کیف پول مشتری',
        note: `تسویه مبلغ ${req.refundAmountTomans?.toLocaleString('fa-IR')} تومان ثبت شد.`,
      });
    }

    // Safely increment inventory ONLY if restock eligible and confirmed
    if (options?.executeRestock && req.restockEligible) {
      req.items.forEach((item) => {
        if (!item.isCustomPod) {
          this.goodsReceipt(
            item.sku,
            item.quantity,
            'STF-01',
            'انبار مرجوعی',
            req.id,
            `بازگشت کالای تاییدشده مرجوعی ${req.id} به انبار`
          );
        }
      });
    }

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `تعیین تکلیف پرونده مرجوعی ${returnId} با روش ${resolution}`,
      entityType: 'order',
      entityId: req.orderId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // SUPPORT TICKETS (Prompt 15)
  // ==========================================

  public getSupportTickets(filters?: {
    status?: string;
    priority?: string;
    search?: string;
    assignedStaffId?: string;
  }): Array<CustomerSupportTicket & { customerName: string; customerId: string }> {
    const list: Array<CustomerSupportTicket & { customerName: string; customerId: string }> = [];

    (this.state.customers || []).forEach((c) => {
      (c.supportTickets || []).forEach((t) => {
        list.push({
          ...t,
          customerName: c.fullName,
          customerId: c.id,
        });
      });
    });

    let result = list;

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((t) => t.status === filters.status);
    }

    if (filters?.priority && filters.priority !== 'all') {
      result = result.filter((t) => t.priority === filters.priority);
    }

    if (filters?.assignedStaffId && filters.assignedStaffId !== 'all') {
      result = result.filter((t) => t.assignedStaffId === filters.assignedStaffId);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((t) =>
        t.id.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q) ||
        t.customerName.toLowerCase().includes(q) ||
        (t.linkedOrderId && t.linkedOrderId.toLowerCase().includes(q))
      );
    }

    return result;
  }

  public getSupportTicketById(id: string): {
    ticket: CustomerSupportTicket;
    customer: Customer;
    order?: any;
    design?: any;
    shipment?: Shipment;
  } | null {
    for (const c of this.state.customers || []) {
      const t = (c.supportTickets || []).find((ticket) => ticket.id === id);
      if (t) {
        const order = t.linkedOrderId ? this.state.orders.find((o) => o.id === t.linkedOrderId) : undefined;
        const design = t.linkedDesignId ? this.state.customDesigns.find((d) => d.id === t.linkedDesignId) : undefined;
        const shipment = t.linkedOrderId ? this.state.shipments.find((s) => s.orderId === t.linkedOrderId) : undefined;
        return {
          ticket: t,
          customer: c,
          order,
          design,
          shipment,
        };
      }
    }
    return null;
  }

  public addTicketMessage(
    ticketId: string,
    text: string,
    sender: 'customer' | 'agent',
    senderName: string,
    isInternalNote: boolean
  ): { success: boolean; error?: string } {
    const item = this.getSupportTicketById(ticketId);
    if (!item) return { success: false, error: 'تیکت یافت نشد.' };

    const nowIso = new Date().toISOString();
    if (!item.ticket.conversationTimeline) {
      item.ticket.conversationTimeline = [
        {
          id: `MSG-${Date.now() - 10000}`,
          timestamp: item.ticket.createdAt,
          sender: 'customer',
          senderName: item.customer.fullName,
          text: item.ticket.lastMessage || 'درخواست راهنمایی در سامانه ثبت شد.',
        },
      ];
    }

    item.ticket.conversationTimeline.push({
      id: `MSG-${Date.now()}`,
      timestamp: nowIso,
      sender,
      senderName,
      text: text.trim(),
      isInternalNote,
    });

    if (!isInternalNote) {
      item.ticket.lastMessage = text.trim();
      if (sender === 'agent' && item.ticket.status === 'open') {
        item.ticket.status = 'in_progress';
      }
    }

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: senderName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: isInternalNote
        ? `ثبت یادداشت داخلی روی تیکت ${ticketId}`
        : `پاسخ به تیکت پشتیبانی ${ticketId} (${senderName})`,
      entityType: 'general',
      entityId: ticketId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public updateTicketStatus(
    ticketId: string,
    status: CustomerSupportTicket['status'],
    staffName: string
  ): { success: boolean; error?: string } {
    const item = this.getSupportTicketById(ticketId);
    if (!item) return { success: false, error: 'تیکت یافت نشد.' };

    item.ticket.status = status;

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `تغییر وضعیت تیکت ${ticketId} به ${status}`,
      entityType: 'general',
      entityId: ticketId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public assignTicket(
    ticketId: string,
    staffId: string,
    staffName: string,
    actorName: string
  ): { success: boolean; error?: string } {
    const item = this.getSupportTicketById(ticketId);
    if (!item) return { success: false, error: 'تیکت یافت نشد.' };

    item.ticket.assignedStaffId = staffId;
    item.ticket.assignedStaffName = staffName;

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `ارجاع تیکت ${ticketId} به ${staffName}`,
      entityType: 'general',
      entityId: ticketId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // REVIEW MODERATION (Prompt 15)
  // ==========================================

  public getCustomerReviews(filters?: {
    status?: string;
    search?: string;
  }): Array<CustomerProductReview & { customerName: string; customerId: string }> {
    const list: Array<CustomerProductReview & { customerName: string; customerId: string }> = [];

    (this.state.customers || []).forEach((c) => {
      (c.reviews || []).forEach((r) => {
        // INVARIANT (Prompt 15):
        // Show purchased status ONLY when a verified corresponding order exists
        const verifiedOrder = (this.state.orders || []).find(
          (o) =>
            o.customerId === c.id &&
            (o.paymentStatus === 'verified_paid' || o.status === 'delivered') &&
            o.items.some((it) => it.productId === r.productId)
        );

        list.push({
          ...r,
          customerName: c.fullName,
          customerId: c.id,
          hasVerifiedPurchase: !!verifiedOrder,
          verifiedOrderId: verifiedOrder?.id,
        });
      });
    });

    let result = list;

    if (filters?.status && filters.status !== 'all') {
      result = result.filter((r) => r.status === filters.status);
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      result = result.filter((r) =>
        r.id.toLowerCase().includes(q) ||
        r.productName.toLowerCase().includes(q) ||
        r.customerName.toLowerCase().includes(q) ||
        r.comment.toLowerCase().includes(q)
      );
    }

    return result;
  }

  public moderateReview(
    reviewId: string,
    action: 'approved' | 'rejected',
    staffName: string,
    reason?: string
  ): { success: boolean; error?: string } {
    let found = false;
    const nowIso = new Date().toISOString();

    (this.state.customers || []).forEach((c) => {
      const rev = (c.reviews || []).find((r) => r.id === reviewId);
      if (rev) {
        rev.status = action;
        if (!rev.auditTrail) rev.auditTrail = [];
        rev.auditTrail.unshift({
          timestamp: nowIso,
          actorName: staffName,
          action: action === 'approved' ? 'تایید و انتشار نظر در وب‌سایت' : 'رد دیدگاه خریدار',
          note: reason || (action === 'approved' ? 'انطباق با قوانین محتوایی فروشگاه' : 'محتوای نامرتبط'),
        });
        found = true;
      }
    });

    if (!found) return { success: false, error: 'دیدگاه مورد نظر یافت نشد.' };

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `داوری نظر ${reviewId}: وضعیت ${action}`,
      entityType: 'general',
      entityId: reviewId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public replyToReview(
    reviewId: string,
    replyText: string,
    staffName: string
  ): { success: boolean; error?: string } {
    let found = false;
    const nowIso = new Date().toISOString();

    (this.state.customers || []).forEach((c) => {
      const rev = (c.reviews || []).find((r) => r.id === reviewId);
      if (rev) {
        rev.adminReply = replyText.trim();
        rev.adminRepliedAt = nowIso;
        if (!rev.auditTrail) rev.auditTrail = [];
        rev.auditTrail.unshift({
          timestamp: nowIso,
          actorName: staffName,
          action: 'ثبت پاسخ رسمی پشتیبانی شاه‌پوش',
          note: replyText.trim(),
        });
        found = true;
      }
    });

    if (!found) return { success: false, error: 'دیدگاه مورد نظر یافت نشد.' };

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `ثبت پاسخ به دیدگاه ${reviewId} توسط ${staffName}`,
      entityType: 'general',
      entityId: reviewId,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // NOTIFICATIONS & MESSAGING (Prompt 15)
  // ==========================================

  public getNotificationTemplates(): NotificationTemplate[] {
    return DEFAULT_NOTIFICATION_TEMPLATES;
  }

  public getSimulatedNotificationLogs(): SimulatedNotificationLog[] {
    return this.state.simulatedNotificationLogs || [];
  }

  public sendSimulatedNotification(
    templateId: string,
    recipient: string,
    variableValues: Record<string, string>,
    staffName: string
  ): {
    success: boolean;
    renderedText: string;
    logEntry?: SimulatedNotificationLog;
    error?: string;
  } {
    const tpl = DEFAULT_NOTIFICATION_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return { success: false, renderedText: '', error: 'قالب پیامک یافت نشد.' };

    const rendered = renderNotificationTemplate(tpl, variableValues);
    if (!rendered.isValid) {
      return {
        success: false,
        renderedText: rendered.renderedText,
        error: `متغیرهای الزامی تکمیل نشده است: ${rendered.missingVariables.join(', ')}`,
      };
    }

    const nowIso = new Date().toISOString();
    const logEntry: SimulatedNotificationLog = {
      id: `NOTIF-${Date.now()}`,
      timestamp: nowIso,
      channel: tpl.channel,
      recipient: recipient.trim() || '۰۹۱۲۰۰۰۰۰۰۰',
      trigger: tpl.trigger,
      renderedBody: rendered.renderedText,
      status: 'simulated_success',
      variableValues,
    };

    if (!this.state.simulatedNotificationLogs) {
      this.state.simulatedNotificationLogs = [];
    }
    this.state.simulatedNotificationLogs.unshift(logEntry);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName: staffName,
      actorRole: 'support_finance',
      actionType: 'STAFF_ACTION',
      description: `شبیه‌سازی ارسال اعلان ${tpl.titleFa} به ${recipient}`,
      entityType: 'general',
      entityId: logEntry.id,
    });

    this.saveState({ ...this.state });
    return { success: true, renderedText: rendered.renderedText, logEntry };
  }

  // ==========================================
  // MARKETING & DISCOUNTS DOMAIN (Prompt 16)
  // ==========================================

  public getDiscounts(): DiscountRule[] {
    if (!this.state.discounts || this.state.discounts.length === 0) {
      this.state.discounts = [...DEFAULT_DISCOUNTS];
    }
    return this.state.discounts;
  }

  public getDiscountById(id: string): DiscountRule | undefined {
    return this.getDiscounts().find((d) => d.id === id);
  }

  public createDiscount(
    data: Omit<DiscountRule, 'id' | 'createdAt' | 'usedCount'>,
    actorName: string
  ): { success: boolean; discount?: DiscountRule; error?: string; warnings?: string[] } {
    const existing = this.getDiscounts();
    const validation = validateDiscountConflicts(data, existing);
    if (!validation.isValid) {
      return { success: false, error: validation.errors[0], warnings: validation.warnings };
    }

    const nowIso = new Date().toISOString();
    const newId = `DSC-${100 + existing.length + 1}`;

    const newDiscount: DiscountRule = {
      id: newId,
      ...data,
      usedCount: 0,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.discounts?.unshift(newDiscount);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ایجاد کد تخفیف جدید «${newDiscount.title}» با کد ${newDiscount.code || 'خودکار'}`,
      entityType: 'general',
      entityId: newId,
    });

    this.saveState({ ...this.state });
    return { success: true, discount: newDiscount, warnings: validation.warnings };
  }

  public updateDiscount(
    id: string,
    updates: Partial<DiscountRule>,
    actorName: string
  ): { success: boolean; error?: string; warnings?: string[] } {
    const existing = this.getDiscounts();
    const discount = existing.find((d) => d.id === id);
    if (!discount) return { success: false, error: 'کد تخفیف یافت نشد.' };

    const merged = { ...discount, ...updates };
    const validation = validateDiscountConflicts(merged, existing);
    if (!validation.isValid) {
      return { success: false, error: validation.errors[0], warnings: validation.warnings };
    }

    Object.assign(discount, updates, { updatedAt: new Date().toISOString() });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ویرایش تخفیف ${discount.title} (${discount.id})`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true, warnings: validation.warnings };
  }

  public toggleDiscountStatus(
    id: string,
    status: DiscountRule['status'],
    actorName: string
  ): { success: boolean; error?: string } {
    const discount = this.getDiscountById(id);
    if (!discount) return { success: false, error: 'کد تخفیف یافت نشد.' };

    discount.status = status;
    discount.updatedAt = new Date().toISOString();

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `تغییر وضعیت تخفیف ${discount.id} به ${status}`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public deleteDiscount(id: string, actorName: string): { success: boolean; error?: string } {
    const index = (this.state.discounts || []).findIndex((d) => d.id === id);
    if (index === -1) return { success: false, error: 'کد تخفیف یافت نشد.' };

    const removed = this.state.discounts?.splice(index, 1)[0];

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `حذف کد تخفیف ${removed?.title} (${id})`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // MARKETING CAMPAIGNS (Prompt 16)
  // ==========================================

  public getMarketingCampaigns(): MarketingCampaign[] {
    if (!this.state.marketingCampaigns || this.state.marketingCampaigns.length === 0) {
      this.state.marketingCampaigns = [...DEFAULT_MARKETING_CAMPAIGNS];
    }
    return this.state.marketingCampaigns;
  }

  public createMarketingCampaign(
    data: Omit<
      MarketingCampaign,
      'id' | 'createdAt' | 'trackedVisits' | 'trackedOrders' | 'attributedRevenueTomans'
    >,
    actorName: string
  ): { success: boolean; campaign?: MarketingCampaign; error?: string } {
    const existing = this.getMarketingCampaigns();
    const nowIso = new Date().toISOString();
    const newId = `CMP-0${existing.length + 1}`;

    const newCamp: MarketingCampaign = {
      id: newId,
      ...data,
      trackedVisits: 0,
      trackedOrders: 0,
      attributedRevenueTomans: 0,
      createdAt: nowIso,
    };

    this.state.marketingCampaigns?.unshift(newCamp);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ایجاد کمپین بازاریابی جدید «${newCamp.name}» (UTM: ${newCamp.utmSource}/${newCamp.utmCampaign})`,
      entityType: 'general',
      entityId: newId,
    });

    this.saveState({ ...this.state });
    return { success: true, campaign: newCamp };
  }

  public updateMarketingCampaign(
    id: string,
    updates: Partial<MarketingCampaign>,
    actorName: string
  ): { success: boolean; error?: string } {
    const camp = this.getMarketingCampaigns().find((c) => c.id === id);
    if (!camp) return { success: false, error: 'کمپین یافت نشد.' };

    Object.assign(camp, updates);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `به‌روزرسانی کمپین ${camp.name} (${id})`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // FUNNEL & CONVERSION ANALYSIS (Prompt 16)
  // ==========================================

  public getFunnelAnalysis(): FunnelAnalysis {
    const verifiedPaidOrders = this.state.orders.filter(
      (o) => o.paymentStatus === 'verified_paid'
    );
    const standardOrders = verifiedPaidOrders.filter((o) => !o.hasCustomLineItem);
    const customOrders = verifiedPaidOrders.filter((o) => o.hasCustomLineItem);

    const standardRev = standardOrders.reduce((sum, o) => sum + o.totalTomans, 0);
    const customRev = customOrders.reduce((sum, o) => sum + o.totalTomans, 0);

    // Realistic conversion funnel based on sessions, designs, carts and orders
    const stage1_view = 18360;
    const stage2_designer = 7710;
    const stage3_artwork = 2930;
    const stage4_cart = 1495;
    const stage5_checkout = 1240;
    const stage6_paid = verifiedPaidOrders.length > 0 ? verifiedPaidOrders.length * 28 : 1032;

    const stages = [
      {
        stageId: 'F1_VIEW',
        titleFa: '۱. بازدید از صفحه نخست و ویترین کاتالوگ',
        stepNumber: 1,
        totalVisitors: stage1_view,
        standardGarmentCount: 11200,
        customDesignPodCount: 7160,
        conversionFromPreviousPct: 100,
        dropoffPct: 58,
      },
      {
        stageId: 'F2_DESIGNER',
        titleFa: '۲. ورود به استودیو و طراح سه‌بعدی تیشرت',
        stepNumber: 2,
        totalVisitors: stage2_designer,
        standardGarmentCount: 3200,
        customDesignPodCount: 4510,
        conversionFromPreviousPct: 42,
        dropoffPct: 62,
      },
      {
        stageId: 'F3_ARTWORK',
        titleFa: '۳. ویرایش آرت‌ورک، متن نستعلیق یا فونت دلخواه',
        stepNumber: 3,
        totalVisitors: stage3_artwork,
        standardGarmentCount: 650,
        customDesignPodCount: 2280,
        conversionFromPreviousPct: 38,
        dropoffPct: 49,
      },
      {
        stageId: 'F4_CART',
        titleFa: '۴. افزودن پوشاک اختصاصی/کاتالوگ به سبد خرید',
        stepNumber: 4,
        totalVisitors: stage4_cart,
        standardGarmentCount: 680,
        customDesignPodCount: 815,
        conversionFromPreviousPct: 51,
        dropoffPct: 17,
      },
      {
        stageId: 'F5_CHECKOUT',
        titleFa: '۵. انتقال به درگاه شاپرک و تسویه قطعی فاکتور',
        stepNumber: 5,
        totalVisitors: stage5_checkout,
        standardGarmentCount: 560,
        customDesignPodCount: 680,
        conversionFromPreviousPct: 83,
        dropoffPct: 16.8,
      },
      {
        stageId: 'F6_VERIFIED_PAID',
        titleFa: '۶. پرداخت موفق تاییدشده و ارجاع به چاپخانه/انبار',
        stepNumber: 6,
        totalVisitors: stage6_paid,
        standardGarmentCount: Math.round(stage6_paid * 0.45),
        customDesignPodCount: Math.round(stage6_paid * 0.55),
        conversionFromPreviousPct: 83.2,
        dropoffPct: 0,
      },
    ];

    return {
      timeframe: '۳۰ روز اخیر (داده‌های تجمیعی پایگاه داده محلی)',
      consentNotice:
        'توجه حریم خصوصی: قیف تبدیل بر اساس نشست‌های مستعار بدون ردیابی تهاجمی کاربر تولید شده است. هیچ‌گونه ادعای شناسایی هویتی افراد بدون رضایت وجود ندارد.',
      stages,
      overallConversionRatePct: Math.round((stage6_paid / stage1_view) * 100 * 10) / 10,
      customPodVsStandardSplit: {
        standardRevenueTomans: standardRev,
        customRevenueTomans: customRev,
        standardConversionPct: 5.2,
        customConversionPct: 6.8,
      },
    };
  }

  // ==========================================
  // STOREFRONT CMS HOMEPAGE & BANNERS (Prompt 16)
  // ==========================================

  public getHomepageConfig(): HomepageLayoutConfig {
    if (!this.state.homepageConfig) {
      this.state.homepageConfig = { ...DEFAULT_HOMEPAGE_CONFIG };
    }
    return this.state.homepageConfig;
  }

  public updateHomepageConfig(
    updates: Partial<HomepageLayoutConfig>,
    actorName: string,
    changeSummary: string
  ): { success: boolean } {
    const current = this.getHomepageConfig();
    const nowIso = new Date().toISOString();

    const newRev = {
      id: `REV-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      changeSummary: changeSummary || 'به‌روزرسانی تنظیمات صفحه اصلی',
      status: updates.status || current.status,
    };

    if (!current.revisionHistory) current.revisionHistory = [];
    current.revisionHistory.unshift(newRev);

    this.state.homepageConfig = {
      ...current,
      ...updates,
      updatedAt: nowIso,
      revisionHistory: current.revisionHistory,
    };

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ویرایش و ذخیره چیدمان صفحه اصلی ویترین: ${changeSummary}`,
      entityType: 'general',
      entityId: 'homepage',
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public getStoreBanners(): StoreBanner[] {
    if (!this.state.storeBanners || this.state.storeBanners.length === 0) {
      this.state.storeBanners = [...DEFAULT_STORE_BANNERS];
    }
    return this.state.storeBanners;
  }

  public createStoreBanner(
    banner: Omit<StoreBanner, 'id' | 'createdAt' | 'updatedAt'>,
    actorName: string
  ): { success: boolean; banner?: StoreBanner } {
    const list = this.getStoreBanners();
    const nowIso = new Date().toISOString();
    const newId = `BAN-0${list.length + 1}`;

    const newBanner: StoreBanner = {
      id: newId,
      ...banner,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    this.state.storeBanners?.unshift(newBanner);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ایجاد بنر تبلیغاتی جدید «${newBanner.title}»`,
      entityType: 'general',
      entityId: newId,
    });

    this.saveState({ ...this.state });
    return { success: true, banner: newBanner };
  }

  public updateStoreBanner(
    id: string,
    updates: Partial<StoreBanner>,
    actorName: string
  ): { success: boolean; error?: string } {
    const banner = this.getStoreBanners().find((b) => b.id === id);
    if (!banner) return { success: false, error: 'بنر یافت نشد.' };

    Object.assign(banner, updates, { updatedAt: new Date().toISOString() });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `به‌روزرسانی بنر ${banner.title} (${id})`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public deleteStoreBanner(id: string, actorName: string): { success: boolean; error?: string } {
    const index = (this.state.storeBanners || []).findIndex((b) => b.id === id);
    if (index === -1) return { success: false, error: 'بنر یافت نشد.' };

    const removed = this.state.storeBanners?.splice(index, 1)[0];

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `حذف بنر ${removed?.title} (${id})`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // CMS CUSTOM PAGES (Prompt 16)
  // ==========================================

  public getCmsPages(): CmsCustomPage[] {
    if (!this.state.cmsPages || this.state.cmsPages.length === 0) {
      this.state.cmsPages = [...DEFAULT_CMS_PAGES];
    }
    return this.state.cmsPages;
  }

  public getCmsPageById(id: string): CmsCustomPage | undefined {
    return this.getCmsPages().find((p) => p.id === id || p.slug === id);
  }

  public createCmsPage(
    page: Omit<CmsCustomPage, 'id' | 'createdAt' | 'updatedAt' | 'revisionHistory'>,
    actorName: string
  ): { success: boolean; page?: CmsCustomPage; error?: string } {
    const list = this.getCmsPages();
    if (list.some((p) => p.slug === page.slug)) {
      return { success: false, error: `شناسه نامک (Slug) «${page.slug}» تکراری است.` };
    }

    const nowIso = new Date().toISOString();
    const newPage: CmsCustomPage = {
      id: page.slug,
      ...page,
      createdAt: nowIso,
      updatedAt: nowIso,
      revisionHistory: [
        {
          id: `REV-${Date.now()}`,
          timestamp: nowIso,
          actorName,
          summary: 'ایجاد صفحه استاتیک در سیستم CMS',
        },
      ],
    };

    this.state.cmsPages?.unshift(newPage);

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ایجاد صفحه جدید در CMS: ${newPage.titleFa} (/pages/${newPage.slug})`,
      entityType: 'general',
      entityId: newPage.id,
    });

    this.saveState({ ...this.state });
    return { success: true, page: newPage };
  }

  public updateCmsPage(
    id: string,
    updates: Partial<CmsCustomPage>,
    actorName: string,
    summary: string
  ): { success: boolean; error?: string } {
    const page = this.getCmsPageById(id);
    if (!page) return { success: false, error: 'صفحه یافت نشد.' };

    const nowIso = new Date().toISOString();
    if (!page.revisionHistory) page.revisionHistory = [];
    page.revisionHistory.unshift({
      id: `REV-${Date.now()}`,
      timestamp: nowIso,
      actorName,
      summary: summary || 'ویرایش محتوای صفحه',
    });

    Object.assign(page, updates, { updatedAt: nowIso });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `ویرایش صفحه CMS ${page.titleFa}: ${summary}`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public deleteCmsPage(id: string, actorName: string): { success: boolean; error?: string } {
    const index = (this.state.cmsPages || []).findIndex((p) => p.id === id || p.slug === id);
    if (index === -1) return { success: false, error: 'صفحه یافت نشد.' };

    const removed = this.state.cmsPages?.splice(index, 1)[0];

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `حذف صفحه CMS ${removed?.titleFa} (${id})`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  // ==========================================
  // SEO METADATA RECORDS (Prompt 16)
  // ==========================================

  public getSeoRecords(): SeoMetadataRecord[] {
    if (!this.state.seoRecords || this.state.seoRecords.length === 0) {
      this.state.seoRecords = [...DEFAULT_SEO_RECORDS];
    }
    return this.state.seoRecords;
  }

  public getSeoRecordById(id: string): SeoMetadataRecord | undefined {
    return this.getSeoRecords().find((r) => r.id === id || r.urlPath === id);
  }

  public updateSeoRecord(
    id: string,
    updates: Partial<SeoMetadataRecord>,
    actorName: string
  ): { success: boolean; error?: string } {
    const record = this.getSeoRecordById(id);
    if (!record) return { success: false, error: 'رکورد سئو یافت نشد.' };

    Object.assign(record, updates, { updatedAt: new Date().toISOString() });

    this.addActivityLog({
      actorId: 'STF-ADMIN',
      actorName,
      actorRole: 'super_admin',
      actionType: 'STAFF_ACTION',
      description: `به‌روزرسانی متادیتا و اسکیما سئو برای ${record.urlPath}`,
      entityType: 'general',
      entityId: id,
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const newLog: ActivityLog = {
      id: `LOG-${9900 + this.state.activities.length + 1}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.state.activities.unshift(newLog);
    this.saveState({ ...this.state });
  }
}

// Singleton export
export const adminRepository = new AdminRepository();
export { DATA_CHANGE_EVENT };
