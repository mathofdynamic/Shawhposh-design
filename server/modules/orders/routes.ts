import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { asyncRoute } from '../../lib/errors';
import { allowRoles, requireCustomer } from '../auth/service';
import { listCustomerOrders, getCustomerOrder } from '../account/service';
import { checkoutAvailability } from '../shipping/service';
import { config } from '../../config';
import {
  addOrderNote, adminOrderList, cancelUnpaidOrder, createCheckoutOrder,
  getAdminCustomer, getAdminOrder, listAdminCustomers, orderIdSchema, updateOrderShippingAddress,
} from './service';

const idempotencySchema = z.string().min(8).max(128);
export const checkoutRoutes = Router();
checkoutRoutes.get('/config', (_req, res) => res.json(checkoutAvailability(config.CHECKOUT_RESERVATION_MINUTES)));
checkoutRoutes.post('/orders', requireCustomer, rateLimit({ windowMs: 15 * 60_000, limit: 12, standardHeaders: 'draft-7', legacyHeaders: false }), asyncRoute((req, res) => {
  const result = createCheckoutOrder(req.principal!.id, idempotencySchema.parse(req.get('Idempotency-Key')), req.body);
  res.status(result.replayed ? 200 : 201).json(result);
}));

export const customerOrderRoutes = Router();
const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });
customerOrderRoutes.get('/', asyncRoute((req, res) => {
  const page = pageSchema.parse(req.query);
  res.json(listCustomerOrders(req.principal!.id, page.page, page.pageSize));
}));
customerOrderRoutes.get('/:id', asyncRoute((req, res) => res.json(getCustomerOrder(req.principal!.id, orderIdSchema.parse(req.params.id)))));

export const adminOrderRoutes = Router();
const readOrders = allowRoles('owner', 'store_manager', 'finance', 'production', 'inventory', 'support');
const manageOrders = allowRoles('owner', 'store_manager');
const addNotes = allowRoles('owner', 'store_manager', 'support');
const manageCustomers = allowRoles('owner', 'store_manager', 'support');
adminOrderRoutes.get('/orders', readOrders, asyncRoute((req, res) => res.json(adminOrderList(req.query))));
adminOrderRoutes.get('/orders/:id', readOrders, asyncRoute((req, res) => res.json(getAdminOrder(orderIdSchema.parse(req.params.id)))));
adminOrderRoutes.post('/orders/:id/cancel', manageOrders, asyncRoute((req, res) => res.json(cancelUnpaidOrder(orderIdSchema.parse(req.params.id), req.principal!.id, req.body))));
adminOrderRoutes.post('/orders/:id/notes', addNotes, asyncRoute((req, res) => res.json(addOrderNote(orderIdSchema.parse(req.params.id), req.principal!.id, req.body))));
adminOrderRoutes.patch('/orders/:id/shipping-address', manageOrders, asyncRoute((req, res) => res.json(updateOrderShippingAddress(orderIdSchema.parse(req.params.id), req.principal!.id, req.body))));
adminOrderRoutes.get('/customers', manageCustomers, asyncRoute((req, res) => res.json(listAdminCustomers(req.query))));
adminOrderRoutes.get('/customers/:id', manageCustomers, asyncRoute((req, res) => res.json(getAdminCustomer(orderIdSchema.parse(req.params.id)))));
