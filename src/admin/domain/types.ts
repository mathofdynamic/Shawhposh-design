/**
 * Shahpoosh Luxury Streetwear - Admin Domain Types
 * Prompt 03: Synthetic Domain & UI-Only Repository Layer
 */

export type StaffRole =
  | 'owner'
  | 'store_manager'
  | 'finance'
  | 'production'
  | 'inventory'
  | 'support'
  // Legacy aliases for backward compatibility
  | 'super_admin'
  | 'designer_reviewer'
  | 'production_operator'
  | 'support_finance';

export type DateRangePreset = 'today' | '7d' | '30d' | '90d' | 'all';

export interface CustomerAddress {
  id: string;
  title: string;
  recipientName: string;
  phone: string;
  province: string;
  city: string;
  fullAddress: string;
  postalCode: string;
  isDefault: boolean;
}

export interface CustomerSupportTicket {
  id: string; // e.g. "TCK-801"
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high';
  category: string;
  createdAt: string;
  linkedOrderId?: string;
  linkedDesignId?: string;
  linkedRefundId?: string;
  linkedShipmentId?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  slaDueAt?: string;
  isSlaBreached?: boolean;
  lastMessage: string;
  conversationTimeline?: Array<{
    id: string;
    timestamp: string;
    sender: 'customer' | 'agent';
    senderName: string;
    text: string;
    isInternalNote?: boolean;
  }>;
}

export interface CustomerProductReview {
  id: string; // e.g. "REV-901"
  productId: string;
  productName: string;
  customerId?: string;
  customerName?: string;
  rating: number; // 1-5
  comment: string;
  status: 'approved' | 'pending' | 'rejected';
  createdAt: string;
  hasVerifiedPurchase?: boolean;
  verifiedOrderId?: string;
  adminReply?: string;
  adminRepliedAt?: string;
  auditTrail?: Array<{ timestamp: string; actorName: string; action: string; note?: string }>;
}

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
  status?: 'active' | 'inactive' | 'deactivated';
  marketingConsent?: boolean;
  createdAt: string; // ISO
  lastActiveAt: string; // ISO
  notes?: string;
  addresses?: CustomerAddress[];
  savedFavorites?: Array<{ productId: string; productName: string; addedAt: string }>;
  cartItems?: Array<{ productId: string; productName: string; variantSku: string; quantity: number }>;
  supportTickets?: CustomerSupportTicket[];
  reviews?: CustomerProductReview[];
  staffNotes?: Array<{
    id: string;
    timestamp: string;
    authorId: string;
    authorName: string;
    text: string;
    linkedOrderId?: string;
    linkedDesignId?: string;
  }>;
  auditTrail?: Array<{
    id: string;
    timestamp: string;
    actorName: string;
    action: string;
    note?: string;
  }>;
  browsingEvents?: Array<{
    id: string;
    timestamp: string;
    eventType: string;
    pageTitle: string;
    url: string;
    device: string;
    durationSeconds?: number;
  }>;
  deletionRequested?: {
    requestedAt: string;
    reason: string;
    status: 'pending_review' | 'rejected' | 'processed';
    requestedBy: string;
  };
}

export interface CustomerDetailData {
  customer: Customer;
  orders: Order[];
  payments: PaymentAttempt[];
  customDesigns: CustomDesign[];
  shipments: Shipment[];
  supportTickets: CustomerSupportTicket[];
  reviews: CustomerProductReview[];
  staffNotes: NonNullable<Customer['staffNotes']>;
  auditTrail: NonNullable<Customer['auditTrail']>;
  addresses: CustomerAddress[];
  savedFavorites: NonNullable<Customer['savedFavorites']>;
  cartItems: NonNullable<Customer['cartItems']>;
  browsingEvents: NonNullable<Customer['browsingEvents']>;
  // Metrics
  totalOrdersCount: number;
  verifiedPaidOrdersCount: number;
  verifiedPaidSpendTomans: number;
  processedRefundsTomans: number;
  netLtvSpendTomans: number;
  averageOrderValueTomans: number;
  firstOrderDate?: string;
  lastOrderDate?: string;
  hasCustomOrders: boolean;
}

export type GarmentFit = 'oversize' | 'classic' | 'slim' | 'oversized';

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
  barcode?: string;
  priceTomans?: number;
  isCustomPodBlank?: boolean;
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

export interface DesignSettings {
  designMode: 'graphic' | 'text' | 'mixed';
  selectedGraphicId?: string;
  graphicName?: string;
  customText?: string;
  fontName?: string;
  textColorHex?: string;
  designScale: number; // 50 to 150 %
  designPosX: number; // -20 to 20 %
  designPosY: number; // -20 to 20 %
  tshirtColorName: string;
  tshirtColorHex: string;
}

export interface DesignRevisionSnapshot {
  revisionNumber: number;
  submittedAt: string;
  previewUrl: string;
  settings: DesignSettings;
  changeSummaryFa?: string;
  customerNote?: string;
}

export interface DesignAuditEntry {
  id: string;
  timestamp: string;
  actorId: string;
  actorName: string;
  action: 'submitted' | 'assigned' | 'approved' | 'rejected' | 'revision_requested' | 'revision_submitted' | 'note_added';
  notes?: string;
  previousStatus?: DesignReviewStatus;
  newStatus?: DesignReviewStatus;
}

export interface CustomDesign {
  id: string; // e.g. "DSG-9021"
  orderId: string;
  lineItemId?: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  title: string;
  previewUrl: string;
  format: 'SVG' | 'PNG' | 'PDF';
  resolutionDpi: number; // e.g. 300
  colorProfile: 'CMYK' | 'RGB';
  dimensionsMm: string; // e.g. "280 x 380 mm"
  printZone: 'front_chest' | 'back_full' | 'sleeve_left' | 'collar_minimal';
  status: DesignReviewStatus;
  designType?: 'graphic' | 'text' | 'mixed';
  blankSku?: string;
  blankProductName?: string;
  blankColorName?: string;
  blankSize?: string;
  reviewerNotes?: string;
  assignedStaffId?: string;
  reviewerName?: string;
  submittedAt: string;
  reviewedAt?: string;
  slaDueAt?: string;
  slaStatus?: 'on_track' | 'at_risk' | 'breached';
  revisionCount: number;
  settings?: DesignSettings;
  revisions?: DesignRevisionSnapshot[];
  customerNote?: string;
  auditTrail?: DesignAuditEntry[];
  staffNotes?: Array<{ id: string; timestamp: string; authorId: string; authorName: string; text: string }>;
}

export interface ArtworkAsset {
  id: string; // e.g. "ART-01"
  title: string;
  artist: string;
  attributionFa: string;
  license: string;
  category: 'calligraphy' | 'classic_ornament' | 'contemporary_typography' | 'street_miniature';
  categoryLabelFa: string;
  format: string;
  status: 'active' | 'archived';
  previewUrl: string;
  downloadsCount: number;
  usageCount: number;
  isCustomerUploadSample?: boolean;
}

export interface PrintRuleZone {
  id: 'front_chest' | 'back_full' | 'sleeve_left' | 'collar_minimal';
  nameFa: string;
  maxDimensionsMm: string;
  recommendedDimensionsMm: string;
  primaryTechnique: string;
  alternativeTechnique?: string;
  minResolutionDpi: number;
  allowedFormats: string[];
  transparencyRequired: boolean;
  colorProfile: 'CMYK' | 'RGB';
  safetyMarginMm: number;
  restrictions: string[];
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

export type PaymentStatus =
  | 'initiated'
  | 'pending'
  | 'verified_paid'
  | 'failed'
  | 'partial_refund'
  | 'refunded';

export interface PaymentLifecycleStep {
  step: 'token_requested' | 'redirected_to_shaparak' | 'callback_received' | 'verified_with_bank' | 'settled' | 'refunded' | 'failed';
  timestamp: string;
  status: 'success' | 'pending' | 'failed';
  titleFa: string;
  descriptionFa: string;
}

export interface PaymentAttempt {
  id: string; // e.g. "PAY-7701"
  orderId: string;
  customerId: string;
  customerName?: string;
  customerPhone?: string;
  amountTomans: number;
  method: PaymentMethod;
  status: PaymentStatus;
  gatewayRefId: string;
  traceNumber: string;
  errorMessage?: string;
  gatewayErrorCode?: string;
  // Documentation-range fake IP (RFC 5737: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
  maskedIpAddress: string;
  cardPanMasked?: string;
  terminalId?: string;
  settlementBatchId?: string;
  settledAt?: string;
  isReconciled?: boolean;
  retryAttemptNumber?: number;
  parentFailedPaymentId?: string;
  createdAt: string;
  verifiedAt?: string;
  refundedAmountTomans?: number;
  refundReason?: string;
  refundedAt?: string;
  lifecycleTimeline?: PaymentLifecycleStep[];
  staffNotes?: Array<{ id: string; timestamp: string; authorName: string; text: string }>;
}

export type RefundStatus = 'requested' | 'approved' | 'processed' | 'rejected';

export interface RefundRecord {
  id: string; // e.g. "REF-8801"
  paymentId: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  requestedAmountTomans: number;
  processedAmountTomans?: number;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  approvedAt?: string;
  processedAt?: string;
  rejectedAt?: string;
  approvedById?: string;
  approvedByName?: string;
  rejectionReason?: string;
  destinationAccountMasked: string; // e.g. "IR** **** **** **** **۰۸ ۴۳ (بانک سامان)"
  isPartial: boolean;
  notes?: string;
}

export interface SettlementBatchItem {
  id: string; // e.g. "STL-2026-09-22"
  bankName: string;
  settlementDate: string;
  totalCapturedTomans: number;
  feeTomans: number;
  netSettledTomans: number;
  transactionsCount: number;
  status: 'matched' | 'discrepancy' | 'in_progress';
  unmatchedPaymentIds?: string[];
  depositReferenceNumber: string;
}

export type ProductionStage = 
  | 'ready'
  | 'queued'
  | 'pretreatment'
  | 'printing_dtg'
  | 'curing_heatpress'
  | 'qc_inspection'
  | 'ready_for_fulfillment'
  | 'packaging'
  | 'completed'
  | 'reprint_needed'
  | 'on_hold';

export interface ProductionAuditItem {
  id: string;
  timestamp: string;
  actorName: string;
  action: string;
  note?: string;
  fromStage?: string;
  toStage?: string;
}

export interface ProductionMaterialRequirement {
  name: string;
  quantityNeeded: string;
  available: boolean;
  consumed: boolean;
}

export interface ProductionQcPhoto {
  id: string;
  label: string;
  url: string;
  timestamp: string;
}

export interface ProductionJob {
  id: string; // e.g. "JOB-401"
  orderId: string;
  lineItemId: string;
  variantSku: string;
  customDesignId?: string;
  operatorId?: string;
  assignedStaffName?: string;
  vendorPartner?: string; // Optional future external partner field
  stage: ProductionStage;
  priority: 'normal' | 'rush' | 'sample';
  quantity: number;
  printingTechnique: string;
  printPlacement: string;
  dueDate: string;
  qcStatus: 'pending' | 'passed' | 'failed';
  qcNotes?: string;
  reprintCount: number;
  holdReason?: string;
  reworkReason?: string;
  defectReason?: string;
  wastedGarmentCount?: number;
  qcDefectPhotos?: ProductionQcPhoto[];
  materialRequirements?: ProductionMaterialRequirement[];
  checklist?: Array<{ id: string; title: string; checked: boolean }>;
  auditTrail?: ProductionAuditItem[];
  startedAt?: string;
  finishedAt?: string;
}

export type CarrierName = 'tipax' | 'post_pishtaz' | 'chapar' | 'courier_tehran' | 'snapp_box';

export type ShipmentStatus =
  | 'packed'
  | 'ready'
  | 'label_created'
  | 'dispatched'
  | 'in_transit'
  | 'delivered'
  | 'exception'
  | 'returned';

export interface ShipmentItem {
  sku: string;
  productName: string;
  quantity: number;
  isCustomPod?: boolean;
  designId?: string;
  designTitle?: string;
}

export interface ShipmentTimelineEvent {
  timestamp: string;
  stage: string;
  titleFa: string;
  descriptionFa: string;
  location?: string;
  isCompleted: boolean;
}

export interface ShipmentAddressCorrection {
  id: string;
  timestamp: string;
  previousAddress: string;
  newAddress: string;
  reason: string;
  actorName: string;
}

export interface ShipmentDeliveryAttempt {
  attemptNumber: number;
  timestamp: string;
  status: 'failed' | 'successful' | 'rescheduled';
  note: string;
}

export interface Shipment {
  id: string; // e.g. "SHP-PKG-3310"
  orderId: string;
  customerId: string;
  customerName?: string;
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  carrier: CarrierName;
  trackingCode: string;
  status: ShipmentStatus;
  destinationCity: string;
  shippingFeeTomans: number;
  dispatchedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryDate: string;
  items?: ShipmentItem[];
  timeline?: ShipmentTimelineEvent[];
  addressCorrections?: ShipmentAddressCorrection[];
  deliveryAttempts?: ShipmentDeliveryAttempt[];
  exceptionReason?: string;
  isMockLabel?: boolean;
  packedAt?: string;
  packedByStaffId?: string;
  packedByStaffName?: string;
}

// Return / Exchange Domain Models (Prompt 15)
export type ReturnReason =
  | 'size_mismatch'
  | 'defective_stitching'
  | 'print_color_drift'
  | 'customer_remorse'
  | 'wrong_item_shipped';

export type ReturnStatus =
  | 'requested'
  | 'approved_pending_receipt'
  | 'received_inspecting'
  | 'inspection_passed'
  | 'inspection_failed'
  | 'replacement_dispatched'
  | 'refund_processed'
  | 'rejected';

export type InspectionOutcome =
  | 'intact_resellable'
  | 'minor_defect_reworkable'
  | 'damaged_scrap';

export type ReturnResolution =
  | 'exchange_replacement'
  | 'store_credit'
  | 'gateway_refund'
  | 'rejected';

export interface ReturnRequestItem {
  sku: string;
  productName: string;
  quantity: number;
  unitPriceTomans: number;
  isCustomPod: boolean;
  reason?: string;
}

export interface ReturnRequest {
  id: string; // e.g. "RET-101"
  orderId: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  items: ReturnRequestItem[];
  reason: ReturnReason;
  reasonFa: string;
  status: ReturnStatus;
  requestedAt: string;
  receivedAt?: string;
  inspectedAt?: string;
  inspectionOutcome?: InspectionOutcome;
  restockEligible?: boolean;
  inspectionNotes?: string;
  resolution?: ReturnResolution;
  linkedRefundId?: string;
  linkedReplacementOrderId?: string;
  isCustomizedGood: boolean;
  policyNotes: string;
  refundAmountTomans?: number;
  auditTrail: Array<{
    timestamp: string;
    actorName: string;
    action: string;
    note?: string;
  }>;
}

// Notification & Messaging Domain Models (Prompt 15)
export interface NotificationTemplate {
  id: string;
  trigger:
    | 'order_confirmed'
    | 'payment_verified'
    | 'design_approved'
    | 'production_started'
    | 'qc_passed'
    | 'shipment_dispatched'
    | 'out_for_delivery'
    | 'refund_processed';
  titleFa: string;
  channel: 'sms' | 'email';
  templateText: string;
  variables: string[];
  samplePreview: string;
  mockServiceNotice: string;
}

export interface SimulatedNotificationLog {
  id: string;
  timestamp: string;
  channel: 'sms' | 'email';
  recipient: string;
  trigger: string;
  renderedBody: string;
  status: 'simulated_success' | 'demo_blocked';
  variableValues: Record<string, string>;
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
  orderType?: 'standard' | 'custom' | 'mixed';
  assignedOwnerId?: string;
  assignedOwnerName?: string;
  productionStatus?: 'none' | 'queued' | 'in_progress' | 'qc' | 'ready' | 'rework';
  shippingStatus?: 'unfulfilled' | 'packed' | 'shipped' | 'delivered' | 'exception' | 'returned';
  cancellationReason?: string;
  statusTimeline?: Array<{
    id: string;
    timestamp: string;
    fromStatus: string;
    toStatus: string;
    actorName: string;
    note?: string;
  }>;
  deliveryHistory?: Array<{
    timestamp: string;
    previousAddress: string;
    newAddress: string;
    actorName: string;
    reason: string;
  }>;
  staffNotes?: Array<{
    id: string;
    timestamp: string;
    authorId: string;
    authorName: string;
    text: string;
  }>;
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

export interface StaffTaskChecklistItem {
  id: string;
  title: string;
  isDone: boolean;
}

export interface StaffTaskComment {
  id: string;
  authorStaffId: string;
  authorName: string;
  text: string;
  createdAt: string;
}

export interface StaffTask {
  id: string; // e.g. "TSK-501"
  title: string;
  description: string;
  assignedStaffId: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'todo' | 'in_progress' | 'completed';
  relatedEntityType?: 'order' | 'design' | 'job' | 'product' | 'ticket';
  relatedEntityId?: string;
  dueDate: string;
  createdAt: string;
  completedAt?: string;
  checklist?: StaffTaskChecklistItem[];
  comments?: StaffTaskComment[];
  resolutionNotes?: string;
}

export interface ActivityLog {
  id: string; // e.g. "LOG-9921"
  actorId: string;
  actorName: string;
  actorRole: StaffRole | 'system' | 'customer' | 'admin';
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
    | 'media'
    | 'supplier'
    | 'purchase_order'
    | 'work_report'
    | 'rbac_permission'
    | 'general';
  entityId: string;
  timestamp: string;
  sourceMode?: 'web_admin' | 'api' | 'automated_cron' | 'studio_hook';
  conciseBefore?: string; // Masked before snapshot
  conciseAfter?: string; // Masked after snapshot
  relatedLink?: string; // Deep link e.g. /admin/sales/orders/SHP-1405-882101
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

// ==========================================
// MARKETING & DISCOUNTS DOMAIN (Prompt 16)
// ==========================================

export type DiscountType = 'percentage' | 'fixed_amount';
export type DiscountApplyType = 'code' | 'automatic';
export type StackingPolicy = 'standalone' | 'stackable_with_promotions';

export interface DiscountRule {
  id: string; // e.g. "DSC-101"
  title: string;
  code?: string; // empty if automatic
  applyType: DiscountApplyType;
  discountType: DiscountType;
  discountValue: number; // percentage (e.g. 15 for 15%) or Tomans (e.g. 100000)
  maxDiscountCapTomans?: number; // max cap for percentage discounts
  minOrderAmountTomans: number; // 0 if none
  eligibleProductIds: string[]; // empty means all catalog products
  eligibleCategoryIds: string[];
  eligibleSkus: string[];
  perCustomerLimit: number; // 0 for unlimited, 1 for once per customer
  globalUsageLimit: number; // 0 for unlimited
  usedCount: number;
  startDate: string; // ISO
  endDate: string; // ISO
  status: 'active' | 'scheduled' | 'expired' | 'disabled';
  stackingPolicy: StackingPolicy;
  isFirstOrderOnly?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MarketingCampaign {
  id: string; // e.g. "CMP-FALL-2026"
  name: string;
  utmSource: string; // e.g. "instagram", "google", "telegram"
  utmMedium: string; // e.g. "influencer_story", "cpc", "channel_post"
  utmCampaign: string; // e.g. "shahneshin_launch"
  utmContent?: string; // e.g. "black_box_teaser"
  utmTerm?: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'scheduled' | 'completed' | 'paused';
  adSpendCostTomans?: number; // actual instrumented cost or undefined
  hasInstrumentedCost: boolean;
  targetUrl: string;
  linkedDiscountCode?: string;
  trackedVisits: number;
  trackedOrders: number;
  attributedRevenueTomans: number;
  notes?: string;
  createdAt: string;
}

export interface FunnelStageData {
  stageId: string;
  titleFa: string;
  stepNumber: number;
  totalVisitors: number;
  standardGarmentCount: number;
  customDesignPodCount: number;
  conversionFromPreviousPct: number;
  dropoffPct: number;
}

export interface FunnelAnalysis {
  timeframe: string;
  consentNotice: string;
  stages: FunnelStageData[];
  overallConversionRatePct: number;
  customPodVsStandardSplit: {
    standardRevenueTomans: number;
    customRevenueTomans: number;
    standardConversionPct: number;
    customConversionPct: number;
  };
}

// ==========================================
// STOREFRONT CMS & SEO DOMAIN (Prompt 16)
// ==========================================

export type PublishingStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface HeroSlide {
  id: string;
  titleFa: string;
  titleEn?: string;
  subtitleFa: string;
  subtitleEn?: string;
  ctaTextFa: string;
  ctaLink: string;
  secondaryCtaTextFa?: string;
  secondaryCtaLink?: string;
  imageUrl: string;
  badgeFa?: string;
  displayOrder: number;
  isActive: boolean;
}

export interface StoreBanner {
  id: string;
  title: string;
  slot: 'top_announcement' | 'hero_secondary' | 'middle_collection' | 'footer_vip';
  contentFa: string;
  contentEn?: string;
  imageUrl?: string;
  linkUrl: string;
  backgroundColorHex?: string;
  textColorHex?: string;
  status: PublishingStatus;
  publishAt?: string;
  expireAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HomepageLayoutConfig {
  announcementBar: {
    enabled: boolean;
    textFa: string;
    textEn?: string;
    linkUrl: string;
    bgColor: string;
  };
  heroSlides: HeroSlide[];
  featuredProductIds: string[]; // Pick from shared catalog!
  featuredCollectionIds: string[]; // Pick from collections!
  studioTeaserBlock: {
    enabled: boolean;
    titleFa: string;
    descriptionFa: string;
    ctaTextFa: string;
    ctaLink: string;
    previewMockupUrl: string;
  };
  storySection: {
    enabled: boolean;
    titleFa: string;
    bodyFa: string;
    craftFeatures: Array<{ id: string; titleFa: string; descFa: string; iconName: string }>;
  };
  status: PublishingStatus;
  updatedAt: string;
  revisionHistory: Array<{
    id: string;
    timestamp: string;
    actorName: string;
    changeSummary: string;
    status: PublishingStatus;
  }>;
}

export interface CmsCustomPage {
  id: string; // e.g. "about-us", "size-guide", "terms", "washing-instructions"
  slug: string;
  titleFa: string;
  titleEn?: string;
  summaryFa: string;
  blocks: Array<{
    id: string;
    type: 'rich_text' | 'hero_image' | 'features_grid' | 'faq_accordion' | 'call_to_action';
    contentJson: Record<string, any>;
  }>;
  status: PublishingStatus;
  publishAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
  revisionHistory: Array<{
    id: string;
    timestamp: string;
    actorName: string;
    summary: string;
  }>;
}

export interface SeoMetadataRecord {
  id: string;
  pageType: 'home' | 'catalog' | 'product' | 'collection' | 'studio' | 'page';
  entityId?: string; // e.g. productId if product SEO
  urlPath: string;
  slug: string;
  titleFa: string;
  titleEn?: string;
  metaDescriptionFa: string;
  metaDescriptionEn?: string;
  canonicalUrl: string;
  ogImageUrl?: string;
  robotsDirective: 'index, follow' | 'noindex, nofollow' | 'noindex, follow';
  structuredDataJsonLd: Record<string, any>; // BreadcrumbList, Product, Organization
  updatedAt: string;
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
  category: SupplierCategory | string;
  categoryLabelFa?: string;
  contactPerson: string;
  phone: string; // unmasked
  maskedPhone?: string; // e.g. "۰۹۱۲***۴۵۶۷"
  email: string;
  maskedEmail?: string; // e.g. "m***@tarpood.ir"
  city: string;
  address: string;
  leadTimeDays: number;
  minimumOrderQuantity?: number;
  minOrderQty?: number;
  ratingScore?: number; // e.g. 4.9
  qualityRating?: string; // e.g. "درجه یک (A+)"
  status: 'active' | 'under_review' | 'inactive';
  activePurchaseOrdersCount?: number;
  suppliedMaterialIds?: string[];
  suppliedMaterials?: string[];
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
  title?: string;
  nameFa?: string;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCostTomans: number;
  subtotalCostTomans?: number;
  totalCostTomans?: number;
}

export interface PurchaseOrder {
  id: string; // e.g. "PO-2026-041"
  supplierId: string;
  supplierName: string;
  supplierCategory?: string;
  status: PurchaseOrderStatus;
  createdAt: string;
  expectedDeliveryDate: string;
  receivedAt?: string;
  items: PurchaseOrderLineItem[];
  totalCostTomans: number;
  shippingCostTomans?: number;
  currency?: string;
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
  refunds?: RefundRecord[];
  settlementBatches?: SettlementBatchItem[];
  artworks?: ArtworkAsset[];
  printRuleZones?: PrintRuleZone[];
  returnRequests?: ReturnRequest[];
  simulatedNotificationLogs?: SimulatedNotificationLog[];
  discounts?: DiscountRule[];
  marketingCampaigns?: MarketingCampaign[];
  homepageConfig?: HomepageLayoutConfig;
  storeBanners?: StoreBanner[];
  cmsPages?: CmsCustomPage[];
  seoRecords?: SeoMetadataRecord[];
}
