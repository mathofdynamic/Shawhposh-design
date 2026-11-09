import { Router } from 'express';
import { and, desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { products, purchaseInvoices } from '../../db/schema';
import { ApiError, asyncRoute } from '../../lib/errors';
import { allowRoles } from '../auth/service';

export const adminAccountingRoutes = Router();
const manageAccounting = allowRoles('owner', 'store_manager', 'finance');

const invoiceInputSchema = z.object({
  supplierName: z.string().trim().min(2, 'نام تأمین‌کننده را وارد کنید.').max(160),
  productId: z.string().uuid('محصول انتخاب‌شده معتبر نیست.'),
  quantity: z.number().int().min(1, 'تعداد باید دست‌کم یک باشد.').max(100000),
  purchaseUnitPriceTomans: z.number().int().min(0).max(2000000000),
  saleUnitPriceTomans: z.number().int().min(0).max(2000000000),
  deliveryCostTomans: z.number().int().min(0).max(2000000000).default(0),
  printingCostTomans: z.number().int().min(0).max(2000000000).default(0),
  invoiceDate: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).default(''),
});

adminAccountingRoutes.get('/purchase-invoices', manageAccounting, asyncRoute((req, res) => {
  const query = z.object({
    page: z.coerce.number().int().min(1).max(100000).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }).parse(req.query);
  const total = db.select({ total: sql<number>`count(*)` }).from(purchaseInvoices).get()!.total;
  const summary = db.select({
    invoiceCount: sql<number>`count(*)`,
    purchaseCostTomans: sql<number>`coalesce(sum(${purchaseInvoices.purchaseUnitPriceTomans} * ${purchaseInvoices.quantity} + ${purchaseInvoices.deliveryCostTomans} + ${purchaseInvoices.printingCostTomans}), 0)`,
    projectedProfitTomans: sql<number>`coalesce(sum(${purchaseInvoices.netProfitTomans}), 0)`,
  }).from(purchaseInvoices).get()!;
  const invoices = db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.invoiceDate), desc(purchaseInvoices.createdAt))
    .limit(query.pageSize).offset((query.page - 1) * query.pageSize).all();
  res.json({ invoices, summary, pagination: { ...query, total, totalPages: Math.ceil(total / query.pageSize) } });
}));

adminAccountingRoutes.post('/purchase-invoices', manageAccounting, asyncRoute((req, res) => {
  const input = invoiceInputSchema.parse(req.body);
  const product = db.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, input.productId)).get();
  if (!product) throw new ApiError(422, 'PRODUCT_NOT_FOUND', 'محصول انتخاب‌شده در کاتالوگ پیدا نشد.');
  const netProfitTomans = input.saleUnitPriceTomans * input.quantity
    - input.purchaseUnitPriceTomans * input.quantity
    - input.deliveryCostTomans
    - input.printingCostTomans;
  if (!Number.isSafeInteger(netProfitTomans)) throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'مبلغ فاکتور از حد مجاز بیشتر است.');
  const invoice = db.insert(purchaseInvoices).values({
    supplierName: input.supplierName,
    productId: product.id,
    productNameSnapshot: product.name,
    quantity: input.quantity,
    purchaseUnitPriceTomans: input.purchaseUnitPriceTomans,
    saleUnitPriceTomans: input.saleUnitPriceTomans,
    deliveryCostTomans: input.deliveryCostTomans,
    printingCostTomans: input.printingCostTomans,
    netProfitTomans,
    invoiceDate: input.invoiceDate ? new Date(input.invoiceDate) : new Date(),
    notes: input.notes,
    createdByStaffId: req.principal!.id,
  }).returning().get();
  res.status(201).json({ invoice });
}));
