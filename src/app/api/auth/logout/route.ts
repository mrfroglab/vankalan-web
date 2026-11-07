import { NextResponse } from 'next/server';
import { handle } from '@/server/http';
import { SESSION_COOKIE } from '@/server/session';

export const POST = handle(async () => {
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return res;
});
