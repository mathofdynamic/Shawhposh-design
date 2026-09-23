/**
 * Shahpoosh Admin UI-Only Repository Layer
 * Manages versioned local state, typed selectors, mutations with invariant guards, and activity emission.
 */

import {
  AdminDatabaseState,
  DateRangePreset,
  OrderStatus,
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
} from './types';
import { generateSyntheticDatabase, SCHEMA_VERSION, DEMO_CLOCK_ISO } from './generator';
import { runInvariantVerification, InvariantSuiteReport } from './invariants';

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
          targetRoute: '/admin/production/jobs',
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
  ): { success: boolean; error?: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.' };

    design.status = 'approved';
    design.reviewedAt = new Date().toISOString();
    design.reviewerNotes = notes;
    design.assignedStaffId = staffId;

    // Update associated order designStatus
    const order = this.state.orders.find((o) => o.id === design.orderId);
    if (order) {
      order.designStatus = 'approved';
      if (order.status === 'paid_processing') {
        order.status = 'in_production';
      }
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[1];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'DESIGN_APPROVED',
      description: `طرح اختصاصی ${designId} برای سفارش ${design.orderId} توسط ${staff.fullName} تایید شد.`,
      entityType: 'design',
      entityId: designId,
      metadata: { notes },
    });

    this.saveState({ ...this.state });
    return { success: true };
  }

  public rejectCustomDesign(
    designId: string,
    staffId: string,
    reason: string
  ): { success: boolean; error?: string } {
    const design = this.state.customDesigns.find((d) => d.id === designId);
    if (!design) return { success: false, error: 'طرح یافت نشد.' };

    design.status = 'rejected';
    design.reviewedAt = new Date().toISOString();
    design.reviewerNotes = reason;
    design.assignedStaffId = staffId;

    const order = this.state.orders.find((o) => o.id === design.orderId);
    if (order) {
      order.designStatus = 'rejected';
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[1];
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

  public updateOrderStatus(
    orderId: string,
    newStatus: OrderStatus,
    staffId: string,
    notes?: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };

    const oldStatus = order.status;
    order.status = newStatus;
    order.updatedAt = new Date().toISOString();
    if (notes) order.notes = notes;

    // Handle inventory state changes for cancelled/refunded
    if ((newStatus === 'cancelled' || newStatus === 'refunded') && oldStatus !== 'cancelled' && oldStatus !== 'refunded') {
      order.items.forEach((item) => {
        const v = this.state.variants.find((variant) => variant.sku === item.variantSku);
        if (v && v.reservedStock >= item.quantity) {
          v.reservedStock -= item.quantity;
        }
      });
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[0];
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

  public issueSimulatedRefund(
    orderId: string,
    amountTomans: number,
    reason: string,
    staffId: string
  ): { success: boolean; error?: string } {
    const order = this.state.orders.find((o) => o.id === orderId);
    if (!order) return { success: false, error: 'سفارش یافت نشد.' };

    const payment = this.state.payments.find((p) => p.orderId === orderId);
    if (!payment) return { success: false, error: 'تراکنش پرداخت مربوط به این سفارش یافت نشد.' };

    payment.status = 'refunded';
    payment.refundedAmountTomans = amountTomans;
    payment.refundReason = reason;
    payment.refundedAt = new Date().toISOString();

    order.paymentStatus = 'refunded';
    order.status = 'refunded';
    order.updatedAt = new Date().toISOString();

    // Release reservations
    order.items.forEach((item) => {
      const v = this.state.variants.find((variant) => variant.sku === item.variantSku);
      if (v && v.reservedStock >= item.quantity) {
        v.reservedStock -= item.quantity;
      }
    });

    // Update customer totalSpent
    const customer = this.state.customers.find((c) => c.id === order.customerId);
    if (customer) {
      customer.totalSpentTomans = Math.max(0, customer.totalSpentTomans - amountTomans);
    }

    const staff = this.state.staff.find((s) => s.id === staffId) || this.state.staff[5];
    this.addActivityLog({
      actorId: staff.id,
      actorName: staff.fullName,
      actorRole: staff.role,
      actionType: 'REFUND_ISSUED',
      description: `استرداد مبلغ ${amountTomans.toLocaleString()} تومان برای سفارش ${orderId} ثبت شد. دلیل: ${reason}`,
      entityType: 'payment',
      entityId: payment.id,
      metadata: { amountTomans, reason, orderId },
    });

    this.saveState({ ...this.state });
    return { success: true };
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

  private addActivityLog(log: Omit<ActivityLog, 'id' | 'timestamp'>) {
    const newLog: ActivityLog = {
      id: `LOG-${9900 + this.state.activities.length + 1}`,
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.state.activities.unshift(newLog);
  }
}

// Singleton export
export const adminRepository = new AdminRepository();
export { DATA_CHANGE_EVENT };
