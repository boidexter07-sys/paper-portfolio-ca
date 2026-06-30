import { NextRequest, NextResponse } from 'next/server';
import { createUser, setSession } from '@/lib/auth';
import { createInitialPortfolio } from '@/lib/portfolio';

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
  try {
    const user = createUser(email, password, style);
    // T40: every new account starts with one paper portfolio pre-loaded
    // with STARTING_CASH_CAD. This is what makes the "paper money" feel
    // real — they don't have to set anything up to see numbers on the
    // home page right after signup.
    createInitialPortfolio(user.id, {
      name: 'My paper portfolio',
      style: style as 'value' | 'growth' | 'balanced',
    });
    await setSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Sign up failed.' }, { status: 400 });
  }
}
