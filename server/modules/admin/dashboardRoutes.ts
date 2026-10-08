import { Router } from 'express';
import { sqlite } from '../../db/connection';
import { asyncRoute } from '../../lib/errors';
import { allowRoles } from '../auth/service';

export const adminDashboardRoutes = Router();

const dashboardRead = allowRoles('owner', 'store_manager', 'finance', 'production', 'inventory', 'support');

adminDashboardRoutes.get('/dashboard/summary', dashboardRead, asyncRoute((_req, res) => {
  const productCounts = sqlite.prepare(`
    select count(*) as total,
      sum(case when p.status = 'active' and c.status = 'active' then 1 else 0 end) as active
    from products p join categories c on c.id = p.category_id
  `).get() as { total: number; active: number | null };
  const variantCounts = sqlite.prepare(`
    select count(*) as total,
      sum(case when pv.status = 'active' then 1 else 0 end) as active,
      sum(case when pv.status = 'active' and i.on_hand - i.reserved <= pv.low_stock_threshold then 1 else 0 end) as lowStock
    from product_variants pv join inventory i on i.variant_id = pv.id
  `).get() as { total: number; active: number | null; lowStock: number | null };
  const stock = sqlite.prepare('select coalesce(sum(on_hand), 0) as onHand, coalesce(sum(reserved), 0) as reserved from inventory').get() as { onHand: number; reserved: number };
  const customers = sqlite.prepare('select count(*) as total from users').get() as { total: number };
  const orders = sqlite.prepare(`
    select count(*) as total,
      sum(case when order_status = 'awaiting_payment' and payment_status = 'unpaid' then 1 else 0 end) as awaitingPayment
    from orders
  `).get() as { total: number; awaitingPayment: number | null };

  res.json({
    products: { total: productCounts.total, active: productCounts.active ?? 0 },
    variants: { total: variantCounts.total, active: variantCounts.active ?? 0, lowStock: variantCounts.lowStock ?? 0 },
    inventory: { onHand: stock.onHand, reserved: stock.reserved, available: stock.onHand - stock.reserved },
    customers: customers.total,
    orders: { total: orders.total, awaitingPayment: orders.awaitingPayment ?? 0 },
    generatedAt: new Date().toISOString(),
  });
}));
