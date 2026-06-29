'use server';

import { revalidatePath } from 'next/cache';
import { acknowledgeFirstSignal } from '@/lib/auth';
import { getCurrentUser } from '@/lib/auth';
import { getDb } from '@/lib/db';

export async function ackFirstSignalAction() {
  const u = await getCurrentUser();
  if (!u) return { ok: false };
  acknowledgeFirstSignal(u.id);
  revalidatePath('/');
  return { ok: true };
}

export async function setInvestingStyleAction(formData: FormData) {
  const u = await getCurrentUser();
  if (!u) return;
  const style = String(formData.get('style') || 'balanced');
  if (!['value', 'growth', 'balanced'].includes(style)) return;
  getDb().prepare('UPDATE users SET investing_style = ? WHERE id = ?').run(style, u.id);
  revalidatePath('/account');
}

export async function createTradeAction(formData: FormData) {
  'use server';
  const u = await getCurrentUser();
  if (!u) return { ok: false, error: 'Not signed in.' };
  const { saveTrade } = await import('@/lib/portfolio');
  const portfolioId = String(formData.get('portfolioId') || '');
  const ticker = String(formData.get('ticker') || '').toUpperCase();
  const side = String(formData.get('side') || 'buy') as 'buy' | 'sell';
  const quantity = Number(formData.get('quantity'));
  const price = Number(formData.get('price'));
  if (!portfolioId || !ticker || !quantity || !price || quantity <= 0 || price <= 0) {
    return { ok: false, error: 'Invalid trade details.' };
  }
  return saveTrade(u.id, { portfolioId, ticker, side, quantity, price });
}
