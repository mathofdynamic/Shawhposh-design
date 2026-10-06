import 'dotenv/config';
import { z } from 'zod';

export const shippingCostTomansSchema = z.preprocess(
  value => value === undefined || (typeof value === 'string' && value.trim() === '') ? undefined : value,
  z.coerce.number().int().min(0).max(1000000000).optional(),
);

export const config = z.object({
  DATABASE_PATH: z.string().min(1),
  APP_ORIGIN: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3039),
  APP_VERSION: z.string().default('phase2'),
  SHIPPING_COST_TOMANS: shippingCostTomansSchema,
  CHECKOUT_RESERVATION_MINUTES: z.coerce.number().int().min(1).max(120).default(20),
}).parse(process.env);
