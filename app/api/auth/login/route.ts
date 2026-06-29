import { NextRequest, NextResponse } from 'next/server';
import { findUserByEmail, setSession, verifyPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const email = String(body?.email || '').trim();
  const password = String(body?.password || '');
  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'Email and password required.' }, { status: 400 });
  }
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.json({ ok: false, error: 'Email or password is wrong.' }, { status: 401 });
  }
  await setSession(user.id);
  return NextResponse.json({ ok: true, user: { id: user.id, email: user.email } });
}
