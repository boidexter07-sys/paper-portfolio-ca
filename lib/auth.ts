// Local cookie-based auth. No Supabase, no NextAuth, no OAuth.
// Sessions are tracked by a `pp_session` cookie holding a signed (HMAC) user id.
// Not for production — prototype only.
//
// SECURITY NOTE: the SESSION_SECRET below is a placeholder for the local
// prototype. For any deployment beyond local development, set the
// `SESSION_SECRET` environment variable; lib/auth.ts will read it instead.

import { cookies } from 'next/headers';
import { createHmac, scryptSync, timingSafeEqual } from 'crypto';
import { getDb, uuid } from './db';

const SESSION_COOKIE = 'pp_session';
const SESSION_SECRET = process.env.SESSION_SECRET || 'paper-portfolio-ca-dev-secret-change-me';

function sign(value: string): string {
  return createHmac('sha256', SESSION_SECRET).update(value).digest('hex');
}

function verifyCookie(raw: string): string | null {
  const [value, sig] = raw.split('.');
  if (!value || !sig) return null;
  const sigBuf = Buffer.from(sig, 'hex');
  const expected = Buffer.from(sign(value), 'hex');
  if (sigBuf.length !== expected.length) return null;
  if (timingSafeEqual(sigBuf, expected)) return value;
  return null;
}

export function hashPassword(plain: string): string {
  const salt = process.env.PASSWORD_SALT || 'paper-portfolio-ca-static-salt-v1';
  const derived = scryptSync(plain, salt, 32);
  return `${salt}:${derived.toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const derived = scryptSync(plain, salt, 32);
  const a = Buffer.from(hash, 'hex');
  return a.length === derived.length && timingSafeEqual(a, derived);
}

export type User = {
  id: string;
  email: string;
  investing_style: 'value' | 'growth' | 'balanced';
  created_at: number;
  acknowledged_first_signal: number;
};

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const userId = verifyCookie(raw);
  if (!userId) return null;
  const row = getDb()
    .prepare('SELECT id, email, investing_style, created_at, acknowledged_first_signal FROM users WHERE id = ?')
    .get(userId) as User | undefined;
  return row ?? null;
}

export async function setSession(userId: string) {
  const store = await cookies();
  store.set(SESSION_COOKIE, `${userId}.${sign(userId)}`, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export function createUser(email: string, password: string, investing_style: User['investing_style']): User {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) throw new Error('Email already in use.');
  const id = uuid();
  const created_at = Date.now();
  db.prepare(
    'INSERT INTO users (id, email, password_hash, investing_style, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(id, email.toLowerCase().trim(), hashPassword(password), investing_style, created_at);
  return {
    id,
    email: email.toLowerCase().trim(),
    investing_style,
    created_at,
    acknowledged_first_signal: 0,
  };
}

export function findUserByEmail(email: string): (User & { password_hash: string }) | null {
  const row = getDb()
    .prepare('SELECT id, email, password_hash, investing_style, created_at, acknowledged_first_signal FROM users WHERE email = ?')
    .get(email.toLowerCase().trim()) as (User & { password_hash: string }) | undefined;
  return row ?? null;
}

export function acknowledgeFirstSignal(userId: string) {
  getDb()
    .prepare('UPDATE users SET acknowledged_first_signal = 1 WHERE id = ?')
    .run(userId);
}
