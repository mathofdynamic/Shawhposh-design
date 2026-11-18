import { Router } from 'express';
import multer from 'multer';
import { and, desc, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { orderItems, orders, otherExpenses, paymentAttempts, products, purchaseInvoices } from '../../db/schema';
import { ApiError, asyncRoute } from '../../lib/errors';
import { tehranCalendarDate } from '../../lib/date';
import { allowRoles } from '../auth/service';
import { readInvoiceImage, removeInvoiceImage, storeInvoiceImage } from './accountingStorage';

export const adminAccountingRoutes = Router();
const manageAccounting = allowRoles('owner', 'store_manager', 'finance');
const idSchema = z.string().uuid();
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'تاریخ معتبر نیست.');
const invoiceUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

function tehranDayStart(date: string) {
  return new Date(`${date}T00:00:00.000+03:30`);
}

function tehranDayNoon(date: string) {
  return new Date(`${date}T12:00:00.000+03:30`);
}

function dateRange(input: unknown) {
  const range = z.object({ dateFrom: dateSchema, dateTo: dateSchema }).superRefine((value, context) => {
    if (value.dateFrom > value.dateTo) context.addIssue({ code: 'custom', path: ['dateTo'], message: 'تاریخ پایان نباید پیش از تاریخ آغاز باشد.' });
  }).parse(input);
  return { ...range, from: tehranDayStart(range.dateFrom), until: new Date(tehranDayStart(range.dateTo).getTime() + 24 * 60 * 60 * 1000) };
}

function invoiceDto(row: typeof purchaseInvoices.$inferSelect) {
  const { invoiceImageStorageKey, saleUnitPriceTomans: _legacySalePrice, netProfitTomans: _legacyProfit, ...invoice } = row;
  return { ...invoice, hasImage: Boolean(invoiceImageStorageKey) };
}

const invoiceInputSchema = z.object({
  supplierName: z.string().trim().min(2, 'نام تأمین‌کننده را وارد کنید.').max(160),
  productId: z.string().uuid('محصول انتخاب‌شده معتبر نیست.'),
  quantity: z.number().int().min(1, 'تعداد باید دست‌کم یک باشد.').max(100000),
  purchaseUnitPriceTomans: z.number().int().min(0).max(2000000000),
  deliveryCostTomans: z.number().int().min(0).max(2000000000).default(0),
  printingCostTomans: z.number().int().min(0).max(2000000000).default(0),
  invoiceDate: dateSchema.optional(),
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
  }).from(purchaseInvoices).get()!;
  const invoices = db.select().from(purchaseInvoices).orderBy(desc(purchaseInvoices.invoiceDate), desc(purchaseInvoices.createdAt))
    .limit(query.pageSize).offset((query.page - 1) * query.pageSize).all().map(invoiceDto);
  res.json({ invoices, summary, pagination: { ...query, total, totalPages: Math.ceil(total / query.pageSize) } });
}));

adminAccountingRoutes.post('/purchase-invoices', manageAccounting, asyncRoute((req, res) => {
  const input = invoiceInputSchema.parse(req.body);
  const invoiceCostTomans = input.purchaseUnitPriceTomans * input.quantity + input.deliveryCostTomans + input.printingCostTomans;
  if (!Number.isSafeInteger(invoiceCostTomans)) throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'مبلغ فاکتور از حد مجاز بیشتر است.');
  const invoiceDate = tehranDayNoon(input.invoiceDate ?? tehranCalendarDate());
  const invoice = db.transaction(tx => {
    const product = tx.select({ id: products.id, name: products.name }).from(products).where(eq(products.id, input.productId)).get();
    if (!product) throw new ApiError(422, 'PRODUCT_NOT_FOUND', 'محصول انتخاب‌شده در کاتالوگ پیدا نشد.');
    const previous = tx.select({
      quantity: sql<number>`coalesce(sum(${purchaseInvoices.quantity}), 0)`,
      cost: sql<number>`coalesce(sum(${purchaseInvoices.purchaseUnitPriceTomans} * ${purchaseInvoices.quantity} + ${purchaseInvoices.deliveryCostTomans} + ${purchaseInvoices.printingCostTomans}), 0)`,
    }).from(purchaseInvoices).where(eq(purchaseInvoices.productId, product.id)).get()!;
    const combinedQuantity = previous.quantity + input.quantity;
    const combinedCost = previous.cost + invoiceCostTomans;
    if (!Number.isSafeInteger(combinedQuantity) || !Number.isSafeInteger(combinedCost)) {
      throw new ApiError(422, 'AMOUNT_TOO_LARGE', 'مجموع هزینه خرید از حد مجاز بیشتر است.');
    }
    const averageMaterialCost = Math.round(combinedCost / combinedQuantity);
    const created = tx.insert(purchaseInvoices).values({
      supplierName: input.supplierName,
      productId: product.id,
      productNameSnapshot: product.name,
      quantity: input.quantity,
      purchaseUnitPriceTomans: input.purchaseUnitPriceTomans,
      saleUnitPriceTomans: 0,
      deliveryCostTomans: input.deliveryCostTomans,
      printingCostTomans: input.printingCostTomans,
      netProfitTomans: 0,
      invoiceDate,
      notes: input.notes,
      createdByStaffId: req.principal!.id,
    }).returning().get();
    tx.update(products).set({ materialCostTomans: averageMaterialCost, updatedAt: new Date() }).where(eq(products.id, product.id)).run();
    return created;
  }, { behavior: 'immediate' });
  res.status(201).json({ invoice: invoiceDto(invoice) });
}));

adminAccountingRoutes.post('/purchase-invoices/:id/image', manageAccounting, invoiceUpload.single('image'), asyncRoute(async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const invoice = db.select().from(purchaseInvoices).where(eq(purchaseInvoices.id, id)).get();
  if (!invoice) throw new ApiError(404, 'NOT_FOUND', 'فاکتور خرید پیدا نشد.');
  if (!req.file) throw new ApiError(422, 'INVOICE_IMAGE_REQUIRED', 'یک تصویر برای فاکتور انتخاب کنید.');
  const stored = await storeInvoiceImage(req.file.buffer, req.file.mimetype);
  try {
    db.update(purchaseInvoices).set({ invoiceImageStorageKey: stored.storageKey, updatedAt: new Date() }).where(eq(purchaseInvoices.id, id)).run();
  } catch (error) {
    removeInvoiceImage(stored.storageKey);
    throw error;
  }
  if (invoice.invoiceImageStorageKey) removeInvoiceImage(invoice.invoiceImageStorageKey);
  res.status(201).json({ image: { url: `/v1/admin/purchase-invoices/${id}/image`, sizeBytes: stored.sizeBytes } });
}));

adminAccountingRoutes.get('/purchase-invoices/:id/image', manageAccounting, asyncRoute((req, res) => {
  const id = idSchema.parse(req.params.id);
  const invoice = db.select({ storageKey: purchaseInvoices.invoiceImageStorageKey }).from(purchaseInvoices).where(eq(purchaseInvoices.id, id)).get();
  if (!invoice?.storageKey) throw new ApiError(404, 'NOT_FOUND', 'تصویر فاکتور پیدا نشد.');
  res.type('image/webp').set('Cache-Control', 'private, no-store').send(readInvoiceImage(invoice.storageKey));
}));

const expenseInputSchema = z.object({
  description: z.string().trim().min(2, 'شرح هزینه را وارد کنید.').max(160),
  amountTomans: z.number().int().min(0).max(2000000000),
  expenseDate: dateSchema,
  notes: z.string().trim().max(2000).default(''),
});

adminAccountingRoutes.post('/expenses', manageAccounting, asyncRoute((req, res) => {
  const input = expenseInputSchema.parse(req.body);
  const expense = db.insert(otherExpenses).values({
    description: input.description,
    amountTomans: input.amountTomans,
    expenseDate: tehranDayNoon(input.expenseDate),
    notes: input.notes,
    createdByStaffId: req.principal!.id,
  }).returning().get();
  res.status(201).json({ expense });
}));

adminAccountingRoutes.get('/sales-report', manageAccounting, asyncRoute((req, res) => {
  const range = dateRange(req.query);
  const paidOrders = db.select({
    id: orders.id,
    subtotalTomans: orders.subtotalTomans,
    discountTomans: orders.discountTomans,
    paidAt: sql<number>`min(${paymentAttempts.paidAt})`.as('paid_at'),
  }).from(orders).innerJoin(paymentAttempts, eq(paymentAttempts.orderId, orders.id)).where(and(
    eq(orders.paymentStatus, 'paid'),
    ne(orders.orderStatus, 'cancelled'),
    eq(paymentAttempts.status, 'verified'),
  )).groupBy(orders.id).as('paid_orders');
  const paidFilter = and(gte(paidOrders.paidAt, range.from.getTime()), lt(paidOrders.paidAt, range.until.getTime()));
  const sales = db.select({
    orderCount: sql<number>`count(*)`,
    salesTomans: sql<number>`coalesce(sum(${paidOrders.subtotalTomans} - ${paidOrders.discountTomans}), 0)`,
  }).from(paidOrders).where(paidFilter).get()!;
  const material = db.select({
    materialCostTomans: sql<number>`coalesce(sum(coalesce(${orderItems.materialCostUnitTomans}, 0) * ${orderItems.quantity}), 0)`,
    uncostedQuantity: sql<number>`coalesce(sum(case when ${orderItems.materialCostUnitTomans} is null then ${orderItems.quantity} else 0 end), 0)`,
  }).from(orderItems).innerJoin(paidOrders, eq(orderItems.orderId, paidOrders.id)).where(paidFilter).get()!;
  const expenseSummary = db.select({
    otherCostTomans: sql<number>`coalesce(sum(${otherExpenses.amountTomans}), 0)`,
  }).from(otherExpenses).where(and(gte(otherExpenses.expenseDate, range.from), lt(otherExpenses.expenseDate, range.until))).get()!;
  const expenses = db.select({ id: otherExpenses.id, description: otherExpenses.description, amountTomans: otherExpenses.amountTomans, expenseDate: otherExpenses.expenseDate, notes: otherExpenses.notes })
    .from(otherExpenses).where(and(gte(otherExpenses.expenseDate, range.from), lt(otherExpenses.expenseDate, range.until)))
    .orderBy(desc(otherExpenses.expenseDate), desc(otherExpenses.createdAt)).all();
  const netProfitTomans = sales.salesTomans - material.materialCostTomans - expenseSummary.otherCostTomans;
  res.json({
    dateFrom: range.dateFrom,
    dateTo: range.dateTo,
    summary: { ...sales, ...material, ...expenseSummary, netProfitTomans },
    expenses,
  });
}));
