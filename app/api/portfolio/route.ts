import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import { createAdditionalPortfolio } from '@/lib/portfolio';

/**
 * T41: POST /api/portfolio — create an additional paper portfolio for the
 * signed-in user. Used by the "Create new portfolio" button on /portfolio.
 * Each portfolio can have its own starting cash, set via the slider in
 * PortfolioCreateModal. Validation is server-side (range + step).
 *
 * Body: { name?: string, style?: 'value'|'growth'|'balanced', startingCash: number }
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ ok: false, error: 'Not signed in.' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const startingCash = body?.startingCash;
  const name = typeof body?.name === 'string' ? body.name : undefined;
  const style = body?.style;
  if (style !== undefined && !['value', 'growth', 'balanced'].includes(style)) {
    return NextResponse.json({ ok: false, error: 'Pick a valid style.' }, { status: 400 });
  }
  if (startingCash === undefined || startingCash === null) {
    return NextResponse.json({ ok: false, error: 'Pick a starting cash amount.' }, { status: 400 });
  }
  const result = createAdditionalPortfolio(user.id, {
    name,
    style: style as 'value' | 'growth' | 'balanced' | undefined,
    startingCash: Number(startingCash),
  });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }
  revalidatePath('/portfolio');
  return NextResponse.json({
    ok: true,
    portfolio: {
      id: result.id,
      name: result.name,
      style: result.style,
      starting_cash: result.starting_cash,
    },
  });
}