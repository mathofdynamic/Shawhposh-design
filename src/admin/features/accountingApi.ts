import { api, post } from '../../api/client';

export interface PurchaseInvoice {
  id: string;
  supplierName: string;
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  purchaseUnitPriceTomans: number;
  saleUnitPriceTomans: number;
  deliveryCostTomans: number;
  printingCostTomans: number;
  netProfitTomans: number;
  invoiceDate: string;
  notes: string;
  createdAt: string;
}

export interface AccountingSnapshot {
  invoices: PurchaseInvoice[];
  summary: { invoiceCount: number; purchaseCostTomans: number; projectedProfitTomans: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export function listPurchaseInvoices() {
  return api<AccountingSnapshot>('/v1/admin/purchase-invoices?page=1&pageSize=100');
}

export function createPurchaseInvoice(input: {
  supplierName: string;
  productId: string;
  quantity: number;
  purchaseUnitPriceTomans: number;
  saleUnitPriceTomans: number;
  deliveryCostTomans: number;
  printingCostTomans: number;
  invoiceDate: string;
  notes: string;
}) {
  return post<{ invoice: PurchaseInvoice }>('/v1/admin/purchase-invoices', input);
}
