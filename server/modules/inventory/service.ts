import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../../db/connection';
import { inventory, productVariants, stockMovements } from '../../db/schema';
import { ApiError } from '../../lib/errors';
export const adjustmentSchema = z.object({ newQuantity: z.number().int().min(0).max(1000000).optional(), delta: z.number().int().min(-1000000).max(1000000).optional(), reason: z.string().trim().min(3).max(1000) }).refine(v => (v.newQuantity === undefined) !== (v.delta === undefined));
export function adjustStock(sku: string, input: unknown, actorId: string) {
  const body = adjustmentSchema.parse(input);
  return db.transaction(tx => {
    const variant = tx.select().from(productVariants).where(eq(productVariants.sku, sku)).get();
    if (!variant) throw new ApiError(404, 'NOT_FOUND', 'کد کالا یافت نشد.');
    const stock = tx.select().from(inventory).where(eq(inventory.variantId, variant.id)).get();
    if (!stock) throw new ApiError(404, 'NOT_FOUND', 'موجودی یافت نشد.');
    const after = body.newQuantity ?? stock.onHand + body.delta!;
    if (after < stock.reserved || after < 0 || after > 1000000) throw new ApiError(409, 'STOCK_CONFLICT', 'موجودی نمی‌تواند منفی یا کمتر از رزرو باشد.');
    tx.update(inventory).set({ onHand: after, updatedAt: new Date() }).where(eq(inventory.variantId, variant.id)).run();
    const [movement] = tx.insert(stockMovements).values({ variantId: variant.id, movementType: 'manual_adjustment', quantityDelta: after - stock.onHand, onHandBefore: stock.onHand, onHandAfter: after, reason: body.reason, actorStaffId: actorId }).returning().all();
    return { inventory: { ...stock, onHand: after, available: after - stock.reserved }, movement };
  }, { behavior: 'immediate' });
}
