/**
 * Shahpoosh Luxury Streetwear - Admin Domain Types
 * Prompt 03: Synthetic Domain & UI-Only Repository Layer
 */

export type StaffRole = 'super_admin' | 'designer_reviewer' | 'production_operator' | 'support_finance';

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'all';

export interface Customer {
  id: string; // e.g. "CUST-1001"
  fullName: string;
  phone: string; // Iranian mobile: "09121234567"
  email: string;
  city: string;
  province: string;
  address: string;
  postalCode: string;
  totalOrdersCount: number;
  totalSpentTomans: number;
  tag: 'vip' | 'regular' | 'wholesale' | 'new';
  createdAt: string; // ISO
  lastActiveAt: string; // ISO
  notes?: string;
}

export type GarmentFit = 'oversize' | 'classic' | 'slim';

export interface ProductVariant {
  sku: string; // e.g. "TSH-OVR-BLK-XL"
  productId: string;
  size: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  colorName: string;
  colorHex: string;
  fit: GarmentFit;
  material?: string;
  onHandStock: number; // physical inventory in workshop
  reservedStock: number; // locked by pending/processing orders
  minStockThreshold: number; // warning trigger
  priceAdjustmentTomans: number; // difference from base product price (usually 0)
  isEnabled?: boolean;
  warehouseLocation?: string; // e.g. "انبار مرکزی تهران - ردیف C4"
}

export type ProductCategoryKey = 'calligraphy' | 'graphic' | 'minimalist' | string;
export type ProductStatus = 'active' | 'draft' | 'archived';
export type ProductType = 'finished' | 'customizable_blank';
export type PrintZone = 'front_chest' | 'back_full' | 'sleeve_left' | 'collar_minimal';
export type PrintingTechnique = 'DTG' | 'SilkScreen' | 'Embroidery' | 'Hybrid';

export interface AdminProduct {
  id: string; // e.g. "sp-101"
  skuPrefix: string; // e.g. "TSH-OVR-BLK"
  name: string;
  nameEn?: string;
  category: ProductCategoryKey;
  collectionIds?: string[];
  basePriceTomans: number;
  originalPriceTomans?: number;
  discountPercent?: number;
  discountStartDate?: string;
  discountEndDate?: string;
  description: string;
  fabricSpecs: string;
  cut?: string;
  measurements?: string;
  careInstructions?: string;
  printingMethod?: string;
  images: string[];
  primaryImage?: string;
  imageAlts?: Record<string, string>;
  isLive: boolean; // displayed in storefront
  status?: ProductStatus;
  productType?: ProductType;
  isCustomizable: boolean; // available in POD studio
  permittedPrintAreas?: PrintZone[];
  baseGarmentSku?: string;
  printingTechnique?: PrintingTechnique;
  slug?: string;
  seoTitle?: string;
  seoMetaDescription?: string;
  variants: ProductVariant[];
  createdAt: string;
  updatedAt?: string;
  tags: string[];
}

export interface AdminCategory {
  id: string;
  slug: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  description?: string;
  imageUrl?: string;
  image?: string;
  displayOrder: number;
  isFeatured: boolean;
}

export interface AdminCollection {
  id: string;
  slug: string;
  titleFa: string;
  titleEn: string;
  descriptionFa: string;
  description?: string;
  imageUrl: string;
  coverImage?: string;
  bannerUrl?: string;
  displayOrder: number;
  status: 'active' | 'archived' | 'upcoming';
  startDate?: string;
  endDate?: string;
  productIds: string[];
}

export interface MediaAsset {
  id: string;
  url: string;
  filename: string;
  title: string;
  altText: string;
  fileSizeBytes: number;
  dimensions: string;
  aspectRatio: string;
  format: 'JPEG' | 'PNG' | 'WEBP' | 'SVG' | 'jpeg' | 'png' | 'webp' | 'svg';
  category: 'product_photo' | 'model_shot' | 'fabric_detail' | 'mockup' | 'artwork';
  associatedProductIds: string[];
  uploadedAt: string;
}

export type DesignReviewStatus = 'submitted' | 'under_review' | 'approved' | 'rejected' | 'revision_requested';

export interface CustomDesign {
  id: string; // e.g. "DSG-9021"
  orderId: string;
  customerId: string;
  title: string;
  previewUrl: string;
  format: 'SVG' | 'PNG' | 'PDF';
  resolutionDpi: number; // e.g. 300
  colorProfile: 'CMYK' | 'RGB';
  dimensionsMm: string; // e.g. "280 x 380 mm"
  printZone: 'front_chest' | 'back_full' | 'sleeve_left' | 'collar_minimal';
  status: DesignReviewStatus;
  reviewerNotes?: string;
  assignedStaffId?: string;
  submittedAt: string;
  reviewedAt?: string;
  revisionCount: number;
}

export interface OrderLineItem {
  id: string; // e.g. "ITEM-1001-1"
  orderId: string;
  productId: string;
  variantSku: string;
  productName: string;
  colorName: string;
  size: string;
  fit: GarmentFit;
  unitPriceTomans: number;
  quantity: number;
  subtotalTomans: number;
  customDesignId?: string; // set if POD item
  isCustomPod: boolean;
}

export type PaymentMethod = 'saman_gateway' | 'zarinpal' | 'card_to_card' | 'wallet';

export type PaymentStatus = 'verified_paid' | 'pending' | 'failed' | 'refunded';

export interface PaymentAttempt {
  id: string; // e.g. "PAY-7701"
  orderId: string;
  customerId: string;
  amountTomans: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayRefId: string;
  traceNumber: string;
  errorMessage?: string;
  // Documentation-range fake IP (RFC 5737: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
  maskedIpAddress: string;
  createdAt: string;
  refundedAmountTomans?: number;
  refundReason?: string;
  refundedAt?: string;
}

export type ProductionStage = 
  | 'queued'
  | 'pretreatment'
  | 'printing_dtg'
  | 'curing_heatpress'
  | 'qc_inspection'
  | 'packaging'
  | 'completed'
  | 'reprint_needed';

export interface ProductionJob {
  id: string; // e.g. "JOB-401"
  orderId: string;
  lineItemId: string;
  variantSku: string;
  customDesignId?: string;
  operatorId?: string;
  stage: ProductionStage;
  priority: 'normal' | 'rush' | 'sample';
  qcStatus: 'pending' | 'passed' | 'failed';
  qcNotes?: string;
  reprintCount: number;
  startedAt?: string;
  finishedAt?: string;
}

export type CarrierName = 'tipax' | 'post_pishtaz' | 'chapar' | 'courier_tehran';

export type ShipmentStatus = 'label_created' | 'dispatched' | 'in_transit' | 'delivered' | 'returned';

export interface Shipment {
  id: string; // e.g. "SHP-PKG-3310"
  orderId: string;
  customerId: string;
  carrier: CarrierName;
  trackingCode: string;
  status: ShipmentStatus;
  destinationCity: string;
  shippingFeeTomans: number;
  dispatchedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryDate: string;
}

export type OrderStatus =
  | 'pending_payment'
  | 'paid_processing'
  | 'in_production'
  | 'quality_check'
  | 'ready_to_ship'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface Order {
  id: string; // e.g. "SHP-1405-882101"
  customerId: string;
  customerName: string;
  customerPhone: string;
  shippingAddress: string;
  city: string;
  items: OrderLineItem[];
  subtotalTomans: number;
  shippingFeeTomans: number;
  discountTomans: number;
  totalTomans: number; // subtotal + shipping - discount
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  designStatus: 'not_applicable' | 'pending_review' | 'approved' | 'rejected';
  hasCustomLineItem: boolean;
  createdAt: string;
  updatedAt: string;
  notes?: string;
  isRushOrder: boolean;
}

export interface StaffMember {
  id: string; // e.g. "STF-01"
  fullName: string;
  role: StaffRole;
  email: string;
  phone: string;
  avatarUrl?: string;
  isOnline: boolean;
  activeTasksCount: number;
}

export interface StaffTask {
  id: string; // e.g. "TSK-501"
  title: string;
  description: string;
  assignedStaffId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  relatedEntityType?: 'order' | 'design' | 'job';
  relatedEntityId?: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
}

export interface ActivityLog {
  id: string; // e.g. "LOG-9921"
  actorId: string;
  actorName: string;
  actorRole: StaffRole | 'system' | 'customer';
  actionType: string;
  description: string;
  entityType:
    | 'order'
    | 'stock'
    | 'design'
    | 'payment'
    | 'production'
    | 'staff'
    | 'task'
    | 'product'
    | 'variant'
    | 'category'
    | 'collection'
    | 'media';
  entityId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DailyMetricSnapshot {
  date: string; // "YYYY-MM-DD"
  visitors: number;
  sessions: number;
  pageviews: number;
  bounceRatePercent?: number;
  avgSessionDurationSec?: number;
  ordersCount: number;
  grossSalesTomans: number;
  netSalesTomans: number;
  refundsTomans: number;
}

export interface TrafficChannelAttribution {
  channel: 'instagram' | 'direct' | 'organic_google' | 'telegram' | 'torob_referral';
  label: string;
  sessionsCount: number;
  conversionRatePercent: number;
  revenueTomans: number;
}

export interface AdminAnalyticsAggregates {
  visitors: {
    today: number;
    last7d: number;
    last30d: number;
    last90d: number;
  };
  sessions: {
    today: number;
    last7d: number;
    last30d: number;
    last90d: number;
  };
  pageviews: {
    today: number;
    last7d: number;
    last30d: number;
    last90d: number;
  };
  channelAttribution: TrafficChannelAttribution[];
  dailySnapshots: DailyMetricSnapshot[];
}

export type ActionSeverity = 'critical' | 'high' | 'medium' | 'low';
export type ActionModule = 'custom_studio' | 'inventory' | 'sales' | 'payments' | 'production' | 'tasks';

export interface ActionQueueItem {
  id: string;
  module: ActionModule;
  title: string;
  description: string;
  severity: ActionSeverity;
  ageText: string;
  ageMs: number;
  assignedRole: string;
  requiredRoleKey: StaffRole | 'all';
  linkedEntityType: 'design' | 'variant' | 'order' | 'payment' | 'job' | 'task';
  linkedEntityId: string;
  primaryActionLabel: string;
  secondaryActionLabel?: string;
  targetRoute: string;
  canDirectResolve: boolean;
  directActionType?: 'approve_design' | 'restock_variant' | 'advance_order' | 'complete_task';
}

export interface PseudonymousSession {
  id: string;
  visitorId: string;
  timestamp: string;
  rfcDocumentationIp: string;
  deviceType: 'mobile' | 'desktop' | 'tablet';
  deviceModel: string;
  browser: string;
  landingPage: string;
  exitPage: string;
  durationSeconds: number;
  pageviewsCount: number;
  converted: boolean;
  orderId?: string;
  journeySteps: string[];
}

export type SecurityThreatCategory =
  | 'bot_crawler'
  | 'rate_limit_exceeded'
  | 'brute_force_login'
  | 'suspicious_payment_flood'
  | 'sql_injection_attempt';

export interface SecurityAuditIncident {
  id: string;
  timestamp: string;
  rfcDocumentationIp: string;
  threatCategory: SecurityThreatCategory;
  severity: 'critical' | 'high' | 'medium';
  actionTaken: 'rate_limited' | 'captcha_enforced' | 'firewall_blocked';
  notes: string;
}

export interface ProvinceGeoStat {
  province: string;
  majorHub: string;
  ordersCount: number;
  percentageShare: number;
  revenueTomans: number;
  averageLeadDays: number;
  preferredCarrier: string;
  isUnknownOrProxy?: boolean;
}

export interface UtmCampaignStat {
  source: string;
  medium: string;
  campaign: string;
  content: string;
  channelCategory: string;
  sessions: number;
  orders: number;
  conversionRatePercent: number;
  attributedRevenueTomans: number;
}

export interface SalesTimelinePoint {
  date: string; // ISO date e.g. "2026-09-01"
  dateLabelFa: string;
  grossSalesTomans: number;
  refundsTomans: number;
  netSalesTomans: number;
  ordersCount: number;
  aovTomans: number;
}

export interface CategorySalesStat {
  category: string;
  categoryLabelFa: string;
  ordersCount: number;
  itemsSoldCount: number;
  revenueTomans: number;
  sharePercent: number;
  estimatedMarginPercent: number;
}

export interface SkuSalesStat {
  sku: string;
  productId: string;
  productName: string;
  category: string;
  size: string;
  colorName: string;
  unitPriceTomans: number;
  quantitySold: number;
  totalRevenueTomans: number;
  sharePercent: number;
  estimatedCostTomans: number;
  estimatedProfitTomans: number;
  marginPercent: number;
}

export interface UnitEconomicsItem {
  id: string;
  title: string;
  type: 'catalog_standard' | 'custom_pod';
  sellingPriceTomans: number;
  rawGarmentCostTomans: number;
  printCostTomans: number;
  packagingCostTomans: number;
  gatewayFeeTomans: number;
  totalDirectCostTomans: number;
  grossContributionTomans: number;
  grossMarginPercent: number;
  notes: string;
}

export interface SalesAnalyticsData {
  timeframe: DateRangePreset;
  timeframeDays: number;
  startDateIso: string;
  endDateIso: string;

  // Primary Financial Metrics
  grossOrderValueTomans: number;
  grossOrderValueDeltaPercent: number;

  discountsTomans: number;
  discountedOrdersCount: number;
  discountsDeltaPercent: number;

  capturedPaymentsTomans: number; // Verified paid total
  capturedPaymentsCount: number;
  capturedPaymentsDeltaPercent: number;

  processedRefundsTomans: number; // Processed/completed refunds
  processedRefundsCount: number;
  requestedRefundsTomans: number; // Pending authorization
  requestedRefundsCount: number;
  refundRatePercent: number; // Based on paid orders
  refundRateDeltaPercent: number;

  netSalesTomans: number; // Captured - Processed refunds
  netSalesDeltaPercent: number;

  shippingCollectedTomans: number;
  shippingCollectedDeltaPercent: number;

  // Initiated / Pending / Failed (Strictly NOT revenue)
  initiatedPendingPaymentsTomans: number;
  initiatedPendingPaymentsCount: number;
  failedPaymentsTomans: number;
  failedPaymentsCount: number;

  // Cost & Margin (Only when fixture data permits)
  estimatedRawCogsTomans: number;
  estimatedPrintingCostTomans: number;
  estimatedPackagingCostTomans: number;
  estimatedGatewayFeesTomans: number;
  totalEstimatedDirectCostsTomans: number;
  estimatedGrossMarginTomans: number;
  estimatedGrossMarginPercent: number;
  marginDeltaPercent: number;

  // AOV & Volumes
  verifiedOrdersCount: number;
  verifiedOrdersDeltaPercent: number;
  averageOrderValueTomans: number;
  aovDeltaPercent: number;
  itemsSoldCount: number;
  avgItemsPerOrder: number;

  // Product Type Split
  standardRevenueTomans: number;
  standardRevenuePercent: number;
  standardOrdersCount: number;
  customRevenueTomans: number;
  customRevenuePercent: number;
  customOrdersCount: number;

  // Timeline Snapshots
  timeline: SalesTimelinePoint[];

  // Drill-down breakdown tables
  categoryStats: CategorySalesStat[];
  topSkus: SkuSalesStat[];
  unitEconomics: UnitEconomicsItem[];
}

export type StockMovementType =
  | 'goods_receipt' // دریافت از تامین‌کننده (خرید)
  | 'order_reservation' // رزرو برای سفارش جدید مشتری
  | 'order_release' // کسر فیزیکی هنگام ارسال سفارش (Fulfill)
  | 'order_cancellation' // لغو سفارش و آزادسازی تعهد رزرو
  | 'order_refund' // مرجوعی کالا و بازگشت به انبار
  | 'manual_adjustment' // اصلاح فیزیکی دستی / انبارگردانی
  | 'production_scrap' // ضایعات چاپ و تولید
  | 'sample_pull'; // خروج نمونه شوروم یا عکاسی

export interface StockMovement {
  id: string; // e.g. "MOV-8801"
  timestamp: string; // ISO
  sku: string;
  productId: string;
  type: StockMovementType;
  quantityChange: number; // positive for addition, negative for reduction
  fieldAffected: 'onHand' | 'reserved' | 'both';
  previousOnHand: number;
  newOnHand: number;
  previousReserved: number;
  newReserved: number;
  reason: string;
  referenceId?: string; // orderId or poId
  actorId: string;
  actorName: string;
}

export type SupplierCategory =
  | 'blank_apparel' // البسه خام پنبه و پارچه
  | 'printing_consumables' // جوهر DTG، مایع زیرلایه و فویل
  | 'luxury_packaging' // هاردباکس، کاغذ پوستی، جعبه‌های ارسال
  | 'trims_labels'; // لیبل ساتن، اتیکت چرمی، دکمه و زیپ

export interface Supplier {
  id: string; // e.g. "SUP-01"
  name: string;
  category: SupplierCategory;
  categoryLabelFa: string;
  contactPerson: string;
  phone: string; // unmasked
  maskedPhone: string; // e.g. "۰۹۱۲***۴۵۶۷"
  email: string;
  maskedEmail: string; // e.g. "m***@tarpood.ir"
  city: string;
  address: string;
  leadTimeDays: number;
  minimumOrderQuantity: number;
  ratingScore: number; // e.g. 4.9
  qualityRating: string; // e.g. "درجه یک (A+)"
  status: 'active' | 'under_review' | 'inactive';
  suppliedMaterialIds: string[];
  notes?: string;
  createdAt: string;
}

export type PurchaseOrderStatus =
  | 'draft'
  | 'ordered'
  | 'partially_received'
  | 'received'
  | 'cancelled';

export interface PurchaseOrderLineItem {
  id: string; // e.g. "POLI-1"
  itemType: 'variant_sku' | 'raw_material';
  itemRefId: string; // SKU or Material ID
  title: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCostTomans: number;
  subtotalCostTomans: number;
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-2026-041"
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  expectedDeliveryDate: string;
  receivedAt?: string;
  items: PurchaseOrderLineItem[];
  totalCostTomans: number;
  shippingCostTomans: number;
  notes?: string;
  createdById: string;
  createdByName: string;
}

export type MaterialCategory = 'ink_dtg' | 'pretreatment' | 'packaging_box' | 'wrapping_paper' | 'label_trim';

export interface WorkshopMaterial {
  id: string; // e.g. "MAT-INK-WHT"
  nameFa: string;
  nameEn: string;
  category: MaterialCategory;
  unitOfMeasure: 'لیتر' | 'کیلوگرم' | 'عدد' | 'متر' | 'قوطی';
  onHandQuantity: number;
  reservedQuantity: number;
  minThreshold: number;
  unitCostTomans: number;
  supplierId: string;
  supplierName: string;
  shelfLocation: string; // e.g. "قفسه مواد شیمیایی B1"
  linkedProductionStage?: string;
}

export interface AdminDatabaseState {
  schemaVersion: number;
  demoClockIso: string; // Configured deterministic clock: "2026-09-23T12:00:00.000Z"
  isSyntheticDemo: true;
  customers: Customer[];
  products: AdminProduct[];
  variants: ProductVariant[];
  categories: AdminCategory[];
  collections: AdminCollection[];
  mediaAssets: MediaAsset[];
  orders: Order[];
  customDesigns: CustomDesign[];
  payments: PaymentAttempt[];
  productionJobs: ProductionJob[];
  shipments: Shipment[];
  staff: StaffMember[];
  tasks: StaffTask[];
  activities: ActivityLog[];
  analytics: AdminAnalyticsAggregates;
  stockMovements: StockMovement[];
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  workshopMaterials: WorkshopMaterial[];
}
