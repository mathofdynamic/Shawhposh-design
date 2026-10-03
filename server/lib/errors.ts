import { z } from 'zod';
import type { ErrorRequestHandler, RequestHandler } from 'express';
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
export const asyncRoute = (handler: RequestHandler): RequestHandler => (req, res, next) => { Promise.resolve(handler(req, res, next)).catch(next); };
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) { res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'اطلاعات واردشده معتبر نیست.', fields: err.flatten().fieldErrors } }); return; }
  if (err instanceof ApiError) { res.status(err.status).json({ error: { code: err.code, message: err.message } }); return; }
  if (String(err?.code).startsWith('SQLITE_CONSTRAINT_UNIQUE')) { res.status(409).json({ error: { code: 'CONFLICT', message: 'این شناسه قبلاً ثبت شده است.' } }); return; }
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') { res.status(400).json({ error: { code: 'INVALID_BODY', message: 'درخواست معتبر نیست.' } }); return; }
  console.error(JSON.stringify({ event: 'request_error', type: err?.name || 'Error' }));
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'خطای سرور. دوباره تلاش کنید.' } });
};
