import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { asyncRoute } from '../../lib/errors';
import { getPrincipal, login, logout, register, safeUser } from './service';
export function authRoutes(staff = false) {
  const router = Router();
  const limiter = rateLimit({ windowMs: 15 * 60000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false, message: { error: { code: 'RATE_LIMITED', message: 'تعداد تلاش‌ها زیاد است. بعداً تلاش کنید.' } } });
  if (!staff) router.post('/register', limiter, asyncRoute(register));
  router.post('/login', limiter, asyncRoute((req, res) => login(req, res, staff)));
  router.post('/logout', asyncRoute((req, res) => logout(req, res, staff)));
  router.get('/me', asyncRoute(async (req, res) => { const user = await getPrincipal(req, staff); res.json({ user: user ? safeUser(user) : null }); }));
  return router;
}
