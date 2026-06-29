import { NextRequest, NextResponse } from 'next/server';
import { createUser, setSession } from '@/lib/auth';

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
    await setSession(user.id);
    return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'Sign up failed.' }, { status: 400 });
  }
}
