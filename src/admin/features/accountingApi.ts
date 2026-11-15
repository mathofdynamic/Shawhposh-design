import { api, post } from '../../api/client';

export interface PurchaseInvoice {
  id: string;
  supplierName: string;
  productId: string | null;
  productNameSnapshot: string;
  quantity: number;
  purchaseUnitPriceTomans: number;
  deliveryCostTomans: number;
  printingCostTomans: number;
  invoiceDate: string;
  notes: string;
  hasImage: boolean;
  createdAt: string;
}

export interface PurchaseSnapshot {
  invoices: PurchaseInvoice[];
  summary: { invoiceCount: number; purchaseCostTomans: number };
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
}

export interface OtherExpense {
  id: string;
  description: string;
  amountTomans: number;
  expenseDate: string;
  notes: string;
}

export interface SalesReport {
  dateFrom: string;
  dateTo: string;
  summary: {
    orderCount: number;
    salesTomans: number;
    materialCostTomans: number;
    uncostedQuantity: number;
    otherCostTomans: number;
    netProfitTomans: number;
  };
  expenses: OtherExpense[];
}

export function listPurchaseInvoices(page = 1, pageSize = 20) {
  const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  return api<PurchaseSnapshot>(`/v1/admin/purchase-invoices?${query.toString()}`);
}

export function createPurchaseInvoice(input: {
  supplierName: string;
  productId: string;
  quantity: number;
  purchaseUnitPriceTomans: number;
  deliveryCostTomans: number;
  printingCostTomans: number;
  invoiceDate: string;
  notes: string;
}) {
  return post<{ invoice: PurchaseInvoice }>('/v1/admin/purchase-invoices', input);
}

export async function uploadPurchaseInvoiceImage(id: string, file: File) {
  const body = new FormData();
  body.append('image', file);
  return api<{ image: { url: string; sizeBytes: number } }>(`/v1/admin/purchase-invoices/${encodeURIComponent(id)}/image`, { method: 'POST', body });
}

export function loadSalesReport(dateFrom: string, dateTo: string) {
  const query = new URLSearchParams({ dateFrom, dateTo });
  return api<SalesReport>(`/v1/admin/sales-report?${query.toString()}`);
}

export function createOtherExpense(input: {
  description: string;
  amountTomans: number;
  expenseDate: string;
  notes: string;
}) {
  return post<{ expense: OtherExpense }>('/v1/admin/expenses', input);
}
