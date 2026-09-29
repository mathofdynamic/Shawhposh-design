/**
 * React Hook for Shahpoosh Admin Repository
 * Provides reactive subscriptions to data mutations, typed selectors, and mutation triggers.
 */

import { useState, useEffect, useCallback } from 'react';
import { adminRepository, DATA_CHANGE_EVENT } from './repository';
import {
  AdminDatabaseState,
  DateRangePreset,
  OrderStatus,
  CustomDesign,
  AdminProduct,
  ProductVariant,
  AdminCategory,
  AdminCollection,
  MediaAsset,
} from './types';
import { InvariantSuiteReport } from './invariants';

export function useAdminRepository() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const handleMutation = () => {
      setTick((t) => t + 1);
    };

    window.addEventListener(DATA_CHANGE_EVENT, handleMutation);
    return () => {
      window.removeEventListener(DATA_CHANGE_EVENT, handleMutation);
    };
  }, []);

  const resetData = useCallback(() => {
    return adminRepository.resetToDefaults();
  }, []);

  const runInvariantChecks = useCallback((): InvariantSuiteReport => {
    return adminRepository.runInvariantSuite();
  }, []);

  return {
    state: adminRepository.getStateSnapshot() as AdminDatabaseState,
    demoClock: adminRepository.getDemoClock(),
    resetData,
    resetToFixtures: resetData,
    runInvariantChecks,
    // Selectors
    getDashboardKPIs: (tf: DateRangePreset) => adminRepository.getDashboardKPIs(tf),
    getActionQueue: () => adminRepository.getActionQueue(),
    getTrafficAnalytics: (tf?: DateRangePreset, customStart?: string, customEnd?: string) =>
      adminRepository.getTrafficAnalytics(tf, customStart, customEnd),
    getGeographyAnalytics: (tf?: DateRangePreset) =>
      adminRepository.getGeographyAnalytics(tf),
    getAcquisitionAnalytics: (tf?: DateRangePreset) =>
      adminRepository.getAcquisitionAnalytics(tf),
    getSalesAnalytics: (tf?: DateRangePreset, customStart?: string, customEnd?: string) =>
      adminRepository.getSalesAnalytics(tf, customStart, customEnd),
    getOrders: (filters?: Parameters<typeof adminRepository.getOrders>[0]) =>
      adminRepository.getOrders(filters),
    getOrderById: (id: string) => adminRepository.getOrderById(id),
    getProducts: (filters?: Parameters<typeof adminRepository.getProducts>[0]) =>
      adminRepository.getProducts(filters),
    getProductById: (id: string) => adminRepository.getProductById(id),
    getVariants: (filters?: Parameters<typeof adminRepository.getVariants>[0]) =>
      adminRepository.getVariants(filters),
    getCategories: () => adminRepository.getCategories(),
    getCollections: () => adminRepository.getCollections(),
    getMediaAssets: () => adminRepository.getMediaAssets(),
    getCustomers: (filters?: Parameters<typeof adminRepository.getCustomers>[0]) =>
      adminRepository.getCustomers(filters),
    getDesigns: (filters?: Parameters<typeof adminRepository.getDesigns>[0]) =>
      adminRepository.getDesigns(filters),
    getProductionJobs: (stage?: string) => adminRepository.getProductionJobs(stage),
    getProductionJobById: (id: string) => adminRepository.getProductionJobById(id),
    getDailyProductionMetrics: () => adminRepository.getDailyProductionMetrics(),
    getPayments: () => adminRepository.getPayments(),
    getPaymentById: (id: string) => adminRepository.getPaymentById(id),
    getFinancialLedgerSummary: () => adminRepository.getFinancialLedgerSummary(),
    getRefunds: () => adminRepository.getRefunds(),
    getSettlementBatches: () => adminRepository.getSettlementBatches(),
    getStaffAndTasks: () => adminRepository.getStaffAndTasks(),
    getActivityLogs: (limit?: number) => adminRepository.getActivityLogs(limit),
    // Mutations
    updateVariantStock: (sku: string, newOnHand: number, staffId: string, reason: string) =>
      adminRepository.updateVariantStock(sku, newOnHand, staffId, reason),
    approveCustomDesign: (designId: string, staffId: string, notes?: string) =>
      adminRepository.approveCustomDesign(designId, staffId, notes),
    rejectCustomDesign: (designId: string, staffId: string, reason: string) =>
      adminRepository.rejectCustomDesign(designId, staffId, reason),
    updateOrderStatus: (orderId: string, newStatus: OrderStatus, staffId: string, notes?: string) =>
      adminRepository.updateOrderStatus(orderId, newStatus, staffId, notes),
    assignOrderOwner: (orderId: string, ownerStaffId: string, actingStaffId?: string) =>
      adminRepository.assignOrderOwner(orderId, ownerStaffId, actingStaffId),
    updateOrderDeliveryDetails: (
      orderId: string,
      updates: { shippingAddress: string; city: string; customerPhone: string; reason: string },
      staffId: string
    ) => adminRepository.updateOrderDeliveryDetails(orderId, updates, staffId),
    cancelOrderWithReason: (orderId: string, reason: string, staffId: string) =>
      adminRepository.cancelOrderWithReason(orderId, reason, staffId),
    addOrderStaffNote: (orderId: string, text: string, staffId: string) =>
      adminRepository.addOrderStaffNote(orderId, text, staffId),
    getOrderExceptions: () => adminRepository.getOrderExceptions(),
    createManualOrder: (params: Parameters<typeof adminRepository.createManualOrder>[0]) =>
      adminRepository.createManualOrder(params),
    requestRefund: (params: Parameters<typeof adminRepository.requestRefund>[0]) =>
      adminRepository.requestRefund(params),
    approveRefund: (refundId: string, staffId: string) =>
      adminRepository.approveRefund(refundId, staffId),
    processRefund: (refundId: string, staffId: string) =>
      adminRepository.processRefund(refundId, staffId),
    issueSimulatedRefund: (orderId: string, amountTomans: number, reason: string, staffId: string) =>
      adminRepository.issueSimulatedRefund(orderId, amountTomans, reason, staffId),
    assignStaffTask: (taskId: string, staffId: string) =>
      adminRepository.assignStaffTask(taskId, staffId),
    completeStaffTask: (taskId: string, staffId: string) =>
      adminRepository.completeStaffTask(taskId, staffId),
    // Catalog Mutations
    createProduct: (productData: Partial<AdminProduct>, staffId?: string) =>
      adminRepository.createProduct(productData, staffId),
    updateProduct: (id: string, updates: Partial<AdminProduct>, staffId?: string) =>
      adminRepository.updateProduct(id, updates, staffId),
    deleteProduct: (id: string, staffId?: string) =>
      adminRepository.deleteProduct(id, staffId),
    bulkUpdateProductStatus: (productIds: string[], status: 'active' | 'draft' | 'archived', staffId?: string) =>
      adminRepository.bulkUpdateProductStatus(productIds, status, staffId),
    createVariant: (variant: ProductVariant, staffId?: string) =>
      adminRepository.createVariant(variant, staffId),
    updateVariant: (sku: string, updates: Partial<ProductVariant>, staffId?: string) =>
      adminRepository.updateVariant(sku, updates, staffId),
    deleteVariant: (sku: string, staffId?: string) =>
      adminRepository.deleteVariant(sku, staffId),
    createCategory: (cat: Omit<AdminCategory, 'id'>, staffId?: string) =>
      adminRepository.createCategory(cat, staffId),
    updateCategory: (id: string, updates: Partial<AdminCategory>, staffId?: string) =>
      adminRepository.updateCategory(id, updates, staffId),
    deleteCategory: (id: string, staffId?: string) =>
      adminRepository.deleteCategory(id, staffId),
    createCollection: (col: Omit<AdminCollection, 'id'>, staffId?: string) =>
      adminRepository.createCollection(col, staffId),
    updateCollection: (id: string, updates: Partial<AdminCollection>, staffId?: string) =>
      adminRepository.updateCollection(id, updates, staffId),
    deleteCollection: (id: string, staffId?: string) =>
      adminRepository.deleteCollection(id, staffId),
    addMediaAsset: (asset: Omit<MediaAsset, 'id' | 'uploadedAt'>, staffId?: string) =>
      adminRepository.addMediaAsset(asset, staffId),
    deleteMediaAsset: (id: string) =>
      adminRepository.deleteMediaAsset(id),
    importProductsCsv: (parsedRows: any[], staffId?: string) =>
      adminRepository.importProductsCsv(parsedRows, staffId),
    // Inventory, Suppliers & Purchase Orders
    getStockMovements: (filterSku?: string) => adminRepository.getStockMovements(filterSku),
    recordStockMovement: (m: Parameters<typeof adminRepository.recordStockMovement>[0]) =>
      adminRepository.recordStockMovement(m),
    goodsReceipt: (sku: string, quantity: number, staffId: string, supplierName?: string, poId?: string, notes?: string) =>
      adminRepository.goodsReceipt(sku, quantity, staffId, supplierName, poId, notes),
    recordStockAdjustment: (sku: string, deltaOnHand: number, staffId: string, reason: string, type?: 'manual_adjustment' | 'production_scrap' | 'sample_pull') =>
      adminRepository.recordStockAdjustment(sku, deltaOnHand, staffId, reason, type),
    reserveStockForOrder: (orderId: string, sku: string, quantity: number) =>
      adminRepository.reserveStockForOrder(orderId, sku, quantity),
    releaseStockForOrder: (orderId: string, sku: string, quantity: number) =>
      adminRepository.releaseStockForOrder(orderId, sku, quantity),
    restoreStockFromCancellation: (orderId: string, sku: string, quantity: number, reason: string, wasAlreadyShipped?: boolean) =>
      adminRepository.restoreStockFromCancellation(orderId, sku, quantity, reason, wasAlreadyShipped),
    getSuppliers: () => adminRepository.getSuppliers(),
    createSupplier: (sup: Parameters<typeof adminRepository.createSupplier>[0]) =>
      adminRepository.createSupplier(sup),
    updateSupplier: (id: string, updates: Parameters<typeof adminRepository.updateSupplier>[1]) =>
      adminRepository.updateSupplier(id, updates),
    deleteSupplier: (id: string) =>
      adminRepository.deleteSupplier(id),
    getPurchaseOrders: () => adminRepository.getPurchaseOrders(),
    createPurchaseOrder: (po: Parameters<typeof adminRepository.createPurchaseOrder>[0]) =>
      adminRepository.createPurchaseOrder(po),
    receivePurchaseOrder: (poId: string, staffId: string, receivedItems?: Parameters<typeof adminRepository.receivePurchaseOrder>[2]) =>
      adminRepository.receivePurchaseOrder(poId, staffId, receivedItems),
    cancelPurchaseOrder: (poId: string, staffId: string, reason: string) =>
      adminRepository.cancelPurchaseOrder(poId, staffId, reason),
    getWorkshopMaterials: () => adminRepository.getWorkshopMaterials(),
    updateMaterialStock: (id: string, newOnHand: number, staffId: string, reason: string) =>
      adminRepository.updateMaterialStock(id, newOnHand, staffId, reason),
    // Custom Studio
    getCustomDesignById: (id: string) => adminRepository.getCustomDesignById(id),
    requestDesignRevision: (designId: string, staffId: string, reason: string) =>
      adminRepository.requestDesignRevision(designId, staffId, reason),
    submitCustomerRevision: (designId: string, newSettings: Parameters<typeof adminRepository.submitCustomerRevision>[1], customerNote?: string) =>
      adminRepository.submitCustomerRevision(designId, newSettings, customerNote),
    addDesignStaffNote: (designId: string, staffId: string, text: string) =>
      adminRepository.addDesignStaffNote(designId, staffId, text),
    getArtworkAssets: () => adminRepository.getArtworkAssets(),
    getPrintRuleZones: () => adminRepository.getPrintRuleZones(),
    // Production Workflows & QC
    advanceProductionJob: (
      jobId: string,
      targetStage?: Parameters<typeof adminRepository.advanceProductionJob>[1],
      staffId?: string,
      note?: string
    ) => adminRepository.advanceProductionJob(jobId, targetStage, staffId, note),
    holdProductionJob: (jobId: string, reason: string, staffId?: string) =>
      adminRepository.holdProductionJob(jobId, reason, staffId),
    resumeProductionJob: (jobId: string, staffId?: string) =>
      adminRepository.resumeProductionJob(jobId, staffId),
    submitQcInspection: (
      jobId: string,
      input: Parameters<typeof adminRepository.submitQcInspection>[1]
    ) => adminRepository.submitQcInspection(jobId, input),
    assignProductionJob: (
      jobId: string,
      operatorId: string,
      dueDate?: string,
      vendorPartner?: string,
      staffId?: string
    ) => adminRepository.assignProductionJob(jobId, operatorId, dueDate, vendorPartner, staffId),
    // Customers Management (Prompt 14)
    getCustomerDetails: (customerId: string) => adminRepository.getCustomerDetails(customerId),
    getCustomersList: (options?: Parameters<typeof adminRepository.getCustomersList>[0]) =>
      adminRepository.getCustomersList(options),
    addCustomerNote: (
      customerId: string,
      text: string,
      authorName: string,
      linkedOrderId?: string,
      linkedDesignId?: string
    ) => adminRepository.addCustomerNote(customerId, text, authorName, linkedOrderId, linkedDesignId),
    updateCustomer: (
      customerId: string,
      updates: Parameters<typeof adminRepository.updateCustomer>[1],
      authorName: string
    ) => adminRepository.updateCustomer(customerId, updates, authorName),
    toggleCustomerStatus: (
      customerId: string,
      status: 'active' | 'inactive' | 'deactivated',
      reason: string,
      authorName: string
    ) => adminRepository.toggleCustomerStatus(customerId, status, reason, authorName),
    createCustomer: (
      data: Parameters<typeof adminRepository.createCustomer>[0],
      authorName: string
    ) => adminRepository.createCustomer(data, authorName),
    requestCustomerDataExport: (customerId: string, authorName: string) =>
      adminRepository.requestCustomerDataExport(customerId, authorName),
    requestCustomerDeletion: (customerId: string, reason: string, authorName: string) =>
      adminRepository.requestCustomerDeletion(customerId, reason, authorName),
    // Shipping & Fulfillment (Prompt 15)
    getShipments: (filters?: Parameters<typeof adminRepository.getShipments>[0]) =>
      adminRepository.getShipments(filters),
    getShipmentById: (id: string) => adminRepository.getShipmentById(id),
    canFulfillShipment: (orderId: string) => adminRepository.canFulfillShipment(orderId),
    packShipment: (shipmentId: string, staffName: string, notes?: string) =>
      adminRepository.packShipment(shipmentId, staffName, notes),
    generateMockShippingLabel: (
      shipmentId: string,
      carrier: Parameters<typeof adminRepository.generateMockShippingLabel>[1],
      staffName: string,
      customTrackingCode?: string
    ) => adminRepository.generateMockShippingLabel(shipmentId, carrier, staffName, customTrackingCode),
    dispatchShipment: (shipmentId: string, staffName: string) =>
      adminRepository.dispatchShipment(shipmentId, staffName),
    deliverShipment: (shipmentId: string, staffName: string) =>
      adminRepository.deliverShipment(shipmentId, staffName),
    recordShipmentAddressCorrection: (
      shipmentId: string,
      newAddress: string,
      reason: string,
      staffName: string
    ) => adminRepository.recordShipmentAddressCorrection(shipmentId, newAddress, reason, staffName),
    recordShipmentException: (shipmentId: string, exceptionReason: string, staffName: string) =>
      adminRepository.recordShipmentException(shipmentId, exceptionReason, staffName),
    bulkPackEligibleShipments: (shipmentIds: string[], staffName: string) =>
      adminRepository.bulkPackEligibleShipments(shipmentIds, staffName),
    // Returns & Exchanges (Prompt 15)
    getReturnRequests: (filters?: Parameters<typeof adminRepository.getReturnRequests>[0]) =>
      adminRepository.getReturnRequests(filters),
    getReturnRequestById: (id: string) => adminRepository.getReturnRequestById(id),
    createReturnRequest: (data: Parameters<typeof adminRepository.createReturnRequest>[0]) =>
      adminRepository.createReturnRequest(data),
    receiveReturnParcel: (returnId: string, staffName: string, note?: string) =>
      adminRepository.receiveReturnParcel(returnId, staffName, note),
    inspectReturnParcel: (
      returnId: string,
      outcome: Parameters<typeof adminRepository.inspectReturnParcel>[1],
      restockEligible: boolean,
      notes: string,
      staffName: string
    ) => adminRepository.inspectReturnParcel(returnId, outcome, restockEligible, notes, staffName),
    resolveReturnRequest: (
      returnId: string,
      resolution: Parameters<typeof adminRepository.resolveReturnRequest>[1],
      staffName: string,
      options?: Parameters<typeof adminRepository.resolveReturnRequest>[3]
    ) => adminRepository.resolveReturnRequest(returnId, resolution, staffName, options),
    // Support Tickets (Prompt 15)
    getSupportTickets: (filters?: Parameters<typeof adminRepository.getSupportTickets>[0]) =>
      adminRepository.getSupportTickets(filters),
    getSupportTicketById: (id: string) => adminRepository.getSupportTicketById(id),
    addTicketMessage: (
      ticketId: string,
      text: string,
      sender: 'customer' | 'agent',
      senderName: string,
      isInternalNote: boolean
    ) => adminRepository.addTicketMessage(ticketId, text, sender, senderName, isInternalNote),
    updateTicketStatus: (
      ticketId: string,
      status: Parameters<typeof adminRepository.updateTicketStatus>[1],
      staffName: string
    ) => adminRepository.updateTicketStatus(ticketId, status, staffName),
    assignTicket: (ticketId: string, staffId: string, staffName: string, actorName: string) =>
      adminRepository.assignTicket(ticketId, staffId, staffName, actorName),
    // Reviews Moderation (Prompt 15)
    getCustomerReviews: (filters?: Parameters<typeof adminRepository.getCustomerReviews>[0]) =>
      adminRepository.getCustomerReviews(filters),
    moderateReview: (
      reviewId: string,
      action: 'approved' | 'rejected',
      staffName: string,
      reason?: string
    ) => adminRepository.moderateReview(reviewId, action, staffName, reason),
    replyToReview: (reviewId: string, replyText: string, staffName: string) =>
      adminRepository.replyToReview(reviewId, replyText, staffName),
    // Notifications & Messaging (Prompt 15)
    getNotificationTemplates: () => adminRepository.getNotificationTemplates(),
    getSimulatedNotificationLogs: () => adminRepository.getSimulatedNotificationLogs(),
    sendSimulatedNotification: (
      templateId: string,
      recipient: string,
      variableValues: Record<string, string>,
      staffName: string
    ) => adminRepository.sendSimulatedNotification(templateId, recipient, variableValues, staffName),
    // Marketing & Discounts (Prompt 16)
    getDiscounts: () => adminRepository.getDiscounts(),
    getDiscountById: (id: string) => adminRepository.getDiscountById(id),
    createDiscount: (
      data: Parameters<typeof adminRepository.createDiscount>[0],
      actorName: string
    ) => adminRepository.createDiscount(data, actorName),
    updateDiscount: (
      id: string,
      updates: Parameters<typeof adminRepository.updateDiscount>[1],
      actorName: string
    ) => adminRepository.updateDiscount(id, updates, actorName),
    toggleDiscountStatus: (
      id: string,
      status: Parameters<typeof adminRepository.toggleDiscountStatus>[1],
      actorName: string
    ) => adminRepository.toggleDiscountStatus(id, status, actorName),
    deleteDiscount: (id: string, actorName: string) => adminRepository.deleteDiscount(id, actorName),
    // Marketing Campaigns (Prompt 16)
    getMarketingCampaigns: () => adminRepository.getMarketingCampaigns(),
    createMarketingCampaign: (
      data: Parameters<typeof adminRepository.createMarketingCampaign>[0],
      actorName: string
    ) => adminRepository.createMarketingCampaign(data, actorName),
    updateMarketingCampaign: (
      id: string,
      updates: Parameters<typeof adminRepository.updateMarketingCampaign>[1],
      actorName: string
    ) => adminRepository.updateMarketingCampaign(id, updates, actorName),
    // Funnel & Conversion (Prompt 16)
    getFunnelAnalysis: () => adminRepository.getFunnelAnalysis(),
    // Storefront CMS & Homepage (Prompt 16)
    getHomepageConfig: () => adminRepository.getHomepageConfig(),
    updateHomepageConfig: (
      updates: Parameters<typeof adminRepository.updateHomepageConfig>[0],
      actorName: string,
      changeSummary: string
    ) => adminRepository.updateHomepageConfig(updates, actorName, changeSummary),
    // Banners (Prompt 16)
    getStoreBanners: () => adminRepository.getStoreBanners(),
    createStoreBanner: (
      banner: Parameters<typeof adminRepository.createStoreBanner>[0],
      actorName: string
    ) => adminRepository.createStoreBanner(banner, actorName),
    updateStoreBanner: (
      id: string,
      updates: Parameters<typeof adminRepository.updateStoreBanner>[1],
      actorName: string
    ) => adminRepository.updateStoreBanner(id, updates, actorName),
    deleteStoreBanner: (id: string, actorName: string) => adminRepository.deleteStoreBanner(id, actorName),
    // CMS Custom Pages (Prompt 16)
    getCmsPages: () => adminRepository.getCmsPages(),
    getCmsPageById: (id: string) => adminRepository.getCmsPageById(id),
    createCmsPage: (
      page: Parameters<typeof adminRepository.createCmsPage>[0],
      actorName: string
    ) => adminRepository.createCmsPage(page, actorName),
    updateCmsPage: (
      id: string,
      updates: Parameters<typeof adminRepository.updateCmsPage>[1],
      actorName: string,
      summary: string
    ) => adminRepository.updateCmsPage(id, updates, actorName, summary),
    deleteCmsPage: (id: string, actorName: string) => adminRepository.deleteCmsPage(id, actorName),
    // SEO Records (Prompt 16)
    getSeoRecords: () => adminRepository.getSeoRecords(),
    getSeoRecordById: (id: string) => adminRepository.getSeoRecordById(id),
    updateSeoRecord: (
      id: string,
      updates: Parameters<typeof adminRepository.updateSeoRecord>[1],
      actorName: string
    ) => adminRepository.updateSeoRecord(id, updates, actorName),
  };
}
