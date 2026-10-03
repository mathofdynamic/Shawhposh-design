import 'dotenv/config';
import { z } from 'zod';

export const config = z.object({
  DATABASE_PATH: z.string().min(1),
  APP_ORIGIN: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3039),
  APP_VERSION: z.string().default('phase1'),
}).parse(process.env);
