import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { asyncRoute } from '../../lib/errors';
import { addCartItem, cartView, clearCart, migrateLegacyCart, removeCartItem, updateCartItem } from './service';

const cartWriteLimit = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
const itemIdSchema = z.string().uuid();
export const cartRoutes = Router();
cartRoutes.get('/', asyncRoute((req, res) => res.json(cartView(req.principal!.id))));
cartRoutes.post('/items', cartWriteLimit, asyncRoute((req, res) => res.status(200).json(addCartItem(req.principal!.id, req.body))));
cartRoutes.post('/migrations', cartWriteLimit, asyncRoute((req, res) => {
  const key = z.string().uuid().parse(req.get('Idempotency-Key'));
  res.json(migrateLegacyCart(req.principal!.id, key, req.body));
}));
cartRoutes.patch('/items/:id', cartWriteLimit, asyncRoute((req, res) => res.json(updateCartItem(req.principal!.id, itemIdSchema.parse(req.params.id), req.body))));
cartRoutes.delete('/items/:id', cartWriteLimit, asyncRoute((req, res) => res.json(removeCartItem(req.principal!.id, itemIdSchema.parse(req.params.id)))));
cartRoutes.delete('/', cartWriteLimit, asyncRoute((req, res) => res.json(clearCart(req.principal!.id))));
