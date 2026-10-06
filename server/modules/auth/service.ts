import { randomBytes, createHash } from 'node:crypto';
import argon2 from 'argon2';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { z } from 'zod';
import type { Request, Response, RequestHandler } from 'express';
import { db } from '../../db/connection';
import { sessions, users, staffUsers } from '../../db/schema';
import { config } from '../../config';
import { ApiError, asyncRoute } from '../../lib/errors';

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export function normalizePhone(value: string) {
  const digits = value.replace(/[۰-۹]/g, c => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c))).replace(/[٠-٩]/g, c => String('٠١٢٣٤٥٦٧٨٩'.indexOf(c))).replace(/[\s()-]/g, '');
  const local = digits.replace(/^(\+98|0098|98)/, '0');
  if (!/^09\d{9}$/.test(local)) throw new ApiError(422, 'VALIDATION_ERROR', 'شماره موبایل ایرانی معتبر وارد کنید.');
  return '+98' + local.slice(1);
}
export const hashPassword = (password: string) => argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
const cookieName = (staff: boolean) => staff ? 'shawhposh_staff' : 'shawhposh_session';
const cookieOptions = { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/' };
export type Principal = { id: string; fullName: string; email: string | null; phone?: string | null; role?: string };
declare global { namespace Express { interface Request { principal?: Principal } } }
export const safeUser = (user: Principal) => ({ id: user.id, name: user.fullName, email: user.email, phone: user.phone, ...(user.role ? { role: user.role } : {}) });
export async function createSession(userId: string, staff: boolean, res: Response) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (staff ? 12 * 3600 : 7 * 86400) * 1000);
  await db.insert(sessions).values({ tokenHash: tokenHash(token), ...(staff ? { staffId: userId } : { userId }), expiresAt });
  res.cookie(cookieName(staff), token, { ...cookieOptions, expires: expiresAt });
}
export async function getPrincipal(req: Request, staff: boolean): Promise<Principal | undefined> {
  const token = req.cookies?.[cookieName(staff)];
  if (typeof token !== 'string' || token.length > 100) return;
  const [session] = await db.select().from(sessions).where(and(eq(sessions.tokenHash, tokenHash(token)), isNull(sessions.revokedAt), gt(sessions.expiresAt, new Date())));
  if (!session || (staff ? !session.staffId : !session.userId)) return;
  const table = staff ? staffUsers : users;
  const [user] = await db.select().from(table).where(and(eq(table.id, (staff ? session.staffId : session.userId)!), eq(table.status, 'active')));
  if (!user) return;
  if (Date.now() - session.lastSeenAt.getTime() > 60000) await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, session.id));
  return user;
}
export const requireStaff = asyncRoute(async (req, _res, next) => {
  req.principal = await getPrincipal(req, true);
  if (!req.principal) throw new ApiError(401, 'UNAUTHENTICATED', 'ورود به حساب کارکنان الزامی است.');
  next();
});
export const requireCustomer = asyncRoute(async (req, _res, next) => {
  req.principal = await getPrincipal(req, false);
  if (!req.principal) throw new ApiError(401, 'UNAUTHENTICATED', 'ÙˆØ±ÙˆØ¯ Ø¨Ù‡ Ø­Ø³Ø§Ø¨ Ú©Ø§Ø±Ø¨Ø±ÛŒ Ø§Ù„Ø²Ø§Ù…ÛŒ Ø§Ø³Øª.');
  next();
});
export const allowRoles = (...roles: string[]): RequestHandler => (req, _res, next) => {
  if (!req.principal?.role || !roles.includes(req.principal.role)) return next(new ApiError(403, 'FORBIDDEN', 'دسترسی لازم را ندارید.'));
  next();
};
export const registrationSchema = z.object({ fullName: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254).transform(normalizeEmail).optional(), phone: z.string().max(30).transform(normalizePhone).optional(), password: z.string().min(12).max(128) }).refine(v => v.email || v.phone);
export async function register(req: Request, res: Response) {
  const body = registrationSchema.parse(req.body);
  const [user] = await db.insert(users).values({ fullName: body.fullName, email: body.email, phone: body.phone, passwordHash: await hashPassword(body.password) }).returning();
  await createSession(user.id, false, res);
  res.status(201).json({ user: safeUser(user) });
}
const loginSchema = z.object({ identifier: z.string().trim().min(3).max(254), password: z.string().min(1).max(128) });
let dummyHash: Promise<string> | undefined;
export async function login(req: Request, res: Response, staff: boolean) {
  const { identifier, password } = loginSchema.parse(req.body);
  let user: (typeof users.$inferSelect | typeof staffUsers.$inferSelect) | undefined;
  if (staff) [user] = await db.select().from(staffUsers).where(eq(staffUsers.email, normalizeEmail(identifier)));
  else {
    const identity = identifier.includes('@') ? eq(users.email, normalizeEmail(identifier)) : eq(users.phone, normalizePhone(identifier));
    [user] = await db.select().from(users).where(identity);
  }
  dummyHash ??= hashPassword(randomBytes(32).toString('hex'));
  const valid = await argon2.verify(user?.passwordHash || await dummyHash, password);
  if (!user || !valid || user.status !== 'active') throw new ApiError(401, 'INVALID_CREDENTIALS', 'شناسه یا رمز عبور نادرست است.');
  await createSession(user.id, staff, res);
  res.json({ user: safeUser(user) });
}
export async function logout(req: Request, res: Response, staff: boolean) {
  const token = req.cookies?.[cookieName(staff)];
  if (typeof token === 'string') await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.tokenHash, tokenHash(token)));
  res.clearCookie(cookieName(staff), cookieOptions).json({ success: true });
}
