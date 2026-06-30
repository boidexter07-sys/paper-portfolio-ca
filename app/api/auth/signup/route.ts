import { NextRequest, NextResponse } from 'next/server';
import { createUser, setSession } from '@/lib/auth';
import { createInitialPortfolio } from '@/lib/portfolio';
import { validateStartingCash } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');
  const style = body?.investing_style;
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'Please enter a valid email.' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ ok: false, error: 'Password must be at least 8 characters.' }, { status: 400 });
  }
  if (!['value', 'growth', 'balanced'].includes(style)) {
    return NextResponse.json({ ok: false, error: 'Pick a style.' }, { status: 400 });
  }
  // T41: optional starting cash from the signup slider. Validate range +
  // step here so the API is the source of truth. If omitted, the default
  // applies inside createInitialPortfolio.
  let startingCash: number | undefined;
  if (body?.startingCash !== undefined && body?.startingCash !== null) {
    const v = validateStartingCash(body.startingCash);
    if (!v.ok) {
      return NextResponse.json({ ok: false, error: v.error }, { status: 400 });
    }
    startingCash = v.value;
  }
  try {
    const user = createUser(email, password, style);
    // T40/T41: every new account starts with one paper portfolio. The
    // starting cash comes from the slider (or the default if skipped).
    createInitialPortfolio(user.id, {
      name: 'My paper portfolio',
      style: style as 'value' | 'growth' | 'balanced',
      ...(startingCash !== undefined ? { startingCash } : {}),
    });
    await setSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Sign up failed.' }, { status: 400 });
  }
}