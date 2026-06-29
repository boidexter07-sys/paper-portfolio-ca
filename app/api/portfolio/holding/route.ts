import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { removeHolding } from '@/lib/portfolio';

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const url = req.nextUrl;
  const portfolioId = url.searchParams.get('portfolioId');
  const ticker = url.searchParams.get('ticker');
  if (!portfolioId || !ticker) {
    return NextResponse.json({ ok: false, error: 'portfolioId and ticker are required.' }, { status: 400 });
  }
  const result = removeHolding(user.id, { portfolioId, ticker });
  if (!result.ok) return NextResponse.json(result, { status: 400 });
  // Invalidate the portfolio page (and any stock pages whose holdings changed)
  // so the next navigation shows the fresh data without a client refresh.
  revalidatePath('/portfolio');
  revalidatePath(`/stock/${ticker.toUpperCase()}`, 'page');
  return NextResponse.json(result);
}
