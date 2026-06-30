// POST /api/arena/portfolios/buy — buy a stock inside a challenge
// portfolio. Refuses if the challenge has ended (read-only).
//
// Body: { portfolioId, ticker, quantity }

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { buyStock } from '@/lib/arena/portfolios';
import { getChallengePortfolio } from '@/lib/arena/portfolios';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const portfolioId = body?.portfolioId as string | undefined;
  const ticker = body?.ticker as string | undefined;
  const quantity = Number(body?.quantity);
  if (!portfolioId || !ticker || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ ok: false, error: 'portfolioId, ticker, and positive quantity are required.' }, { status: 400 });
  }
  // Ownership check.
  const portfolio = getChallengePortfolio(portfolioId);
  if (!portfolio) return NextResponse.json({ ok: false, error: 'Portfolio not found.' }, { status: 404 });
  if (portfolio.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: 'Not your portfolio.' }, { status: 403 });
  }
  const result = buyStock({ portfolioId, ticker: ticker.toUpperCase(), quantity });
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true, portfolio: result.portfolio });
}