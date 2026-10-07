import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { asyncRoute } from '../../lib/errors';
import { allowRoles, requireCustomer } from '../auth/service';
import {
  createShippingMethod, listAdminShippingMethods, listPublicShippingMethods,
  quoteCheckout, updateShippingMethod,
} from './service';

const idSchema = z.string().uuid();
const quoteLimit = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
const shippingManager = allowRoles('owner', 'store_manager');

export const publicShippingRoutes = Router();
publicShippingRoutes.get('/methods', asyncRoute((_req, res) => res.json(listPublicShippingMethods())));

export const checkoutQuoteRoutes = Router();
checkoutQuoteRoutes.post('/quote', requireCustomer, quoteLimit, asyncRoute((req, res) => {
  res.json(quoteCheckout(req.principal!.id, req.body));
}));

export const adminShippingRoutes = Router();
adminShippingRoutes.get('/shipping/methods', shippingManager, asyncRoute((_req, res) => res.json(listAdminShippingMethods())));
adminShippingRoutes.post('/shipping/methods', shippingManager, asyncRoute((req, res) => res.status(201).json(createShippingMethod(req.body))));
adminShippingRoutes.patch('/shipping/methods/:id', shippingManager, asyncRoute((req, res) => {
  res.json(updateShippingMethod(idSchema.parse(req.params.id), req.body));
}));
