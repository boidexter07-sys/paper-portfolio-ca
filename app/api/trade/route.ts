import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { saveTrade } from '@/lib/portfolio';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json();
  const { portfolioId, ticker, side, quantity, price } = body || {};
  if (!portfolioId || !ticker || !['buy', 'sell'].includes(side) || !(quantity > 0) || !(price > 0)) {
    return NextResponse.json({ ok: false, error: 'Invalid trade details.' }, { status: 400 });
  }
  const upperTicker = String(ticker).toUpperCase();
  const result = saveTrade(user.id, {
    portfolioId,
    ticker: upperTicker,
    side: side as 'buy' | 'sell',
    quantity: Number(quantity),
    price: Number(price),
  });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  // Invalidate the affected routes so the next navigation shows the fresh
  // portfolio & stock-profile data without the client having to call
  // router.refresh() — which would re-trigger the slow server render and
  // freeze the modal in its "submitting" state.
  revalidatePath('/portfolio');
  revalidatePath(`/stock/${upperTicker}`, 'page');
  return NextResponse.json(result);
}
