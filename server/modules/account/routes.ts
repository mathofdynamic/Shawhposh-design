import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { asyncRoute } from '../../lib/errors';
import {
  accountProfile, addressIdSchema, createAddress, deleteAddress, getCustomerOrder,
  listAddresses, listCustomerOrders, updateAccount, updateAddress,
} from './service';

const idempotentWriteLimit = rateLimit({ windowMs: 15 * 60_000, limit: 60, standardHeaders: 'draft-7', legacyHeaders: false });
const pageSchema = z.object({ page: z.coerce.number().int().min(1).max(100000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) });

export const accountRoutes = Router();
accountRoutes.get('/', asyncRoute((req, res) => res.json(accountProfile(req.principal!.id))));
accountRoutes.patch('/', idempotentWriteLimit, asyncRoute((req, res) => res.json(updateAccount(req.principal!.id, req.body))));
accountRoutes.get('/addresses', asyncRoute((req, res) => res.json(listAddresses(req.principal!.id))));
accountRoutes.post('/addresses', idempotentWriteLimit, asyncRoute((req, res) => res.status(201).json(createAddress(req.principal!.id, req.body))));
accountRoutes.patch('/addresses/:id', idempotentWriteLimit, asyncRoute((req, res) => res.json(updateAddress(req.principal!.id, addressIdSchema.parse(req.params.id), req.body))));
accountRoutes.delete('/addresses/:id', idempotentWriteLimit, asyncRoute((req, res) => res.json(deleteAddress(req.principal!.id, addressIdSchema.parse(req.params.id)))));
accountRoutes.get('/orders', asyncRoute((req, res) => {
  const query = pageSchema.parse(req.query);
  res.json(listCustomerOrders(req.principal!.id, query.page, query.pageSize));
}));
accountRoutes.get('/orders/:id', asyncRoute((req, res) => res.json(getCustomerOrder(req.principal!.id, addressIdSchema.parse(req.params.id)))));
