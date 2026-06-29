import { NextRequest, NextResponse } from 'next/server';
import { computePrism } from '@/lib/prism';

export async function GET(_req: NextRequest, { params }: { params: { ticker: string } }) {
  const ticker = String(params.ticker || '').toUpperCase();
  if (!ticker || !/^[A-Z0-9.-]{1,8}$/.test(ticker)) {
    return NextResponse.json({ ok: false, error: 'Bad ticker.' }, { status: 400 });
  }
  const result = computePrism(ticker);
  return NextResponse.json({ ok: true, prism: result });
}
