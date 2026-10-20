import 'dotenv/config';
import { z } from 'zod';

export function isAllowedBaleApiBase(value: string, nodeEnv: string) {
  return nodeEnv !== 'production' || value.replace(/\/+$/, '') === 'https://tapi.bale.ai';
}

const baleApiBaseSchema = z.string().url().refine(value => isAllowedBaleApiBase(value, process.env.NODE_ENV ?? 'development'), {
  message: 'نشانی پایهٔ API بله در محیط تولید باید https://tapi.bale.ai باشد.',
});

export const config = z.object({
  DATABASE_PATH: z.string().min(1),
  APP_ORIGIN: z.string().url(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1024).max(65535).default(3039),
  APP_VERSION: z.string().default('phase2'),
  CHECKOUT_RESERVATION_MINUTES: z.coerce.number().int().min(1).max(120).default(20),
  PAYMENT_RECEIPT_DIR: z.string().min(1).default('./data/private/payment-receipts'),
  BALE_BOT_TOKEN: z.string().default(''),
  BALE_BOT_USERNAME: z.string().default(''),
  BALE_PAYMENT_PROVIDER_TOKEN: z.string().default(''),
  BALE_WEBHOOK_SECRET: z.string().default(''),
  BALE_API_BASE: baleApiBaseSchema.default('https://tapi.bale.ai'),
}).parse(process.env);

export function isBalePaymentConfigured() {
  return Boolean(config.BALE_BOT_TOKEN && config.BALE_BOT_USERNAME && config.BALE_PAYMENT_PROVIDER_TOKEN
    && config.BALE_WEBHOOK_SECRET.length >= 32
    && !(config.NODE_ENV === 'production' && config.BALE_PAYMENT_PROVIDER_TOKEN === 'WALLET-TEST-1111111111111111'));
}
