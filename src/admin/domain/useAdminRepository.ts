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
    getPayments: () => adminRepository.getPayments(),
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
  };
}
