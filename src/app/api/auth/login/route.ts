import { NextResponse } from 'next/server';
import { z } from 'zod';
import { HttpError, handle, parseBody } from '@/server/http';
import { clientIp, loginRetryAfter, recordLoginFailure, resetLoginFailures } from '@/server/rateLimit';
import {
  SESSION_COOKIE,
  SESSION_TTL_SECONDS,
  createSessionToken,
  isAuthConfigured,
  verifyPassword,
} from '@/server/session';

const bodySchema = z.object({ password: z.string().min(1).max(200) });

export const POST = handle(async (request: Request) => {
  if (!isAuthConfigured()) {
    throw new HttpError(
      503,
      'Login admin belum dikonfigurasi (ADMIN_PASSWORD dan SESSION_SECRET minimal 32 karakter).'
    );
  }

  const ip = clientIp(request);
  const wait = loginRetryAfter(ip);
  if (wait > 0) {
    const res = NextResponse.json(
      { success: false, error: `Terlalu banyak percobaan. Coba lagi dalam ${Math.ceil(wait / 60)} menit.` },
      { status: 429 }
    );
    res.headers.set('Retry-After', String(wait));
    return res;
  }

  const { password } = await parseBody(request, bodySchema);
  if (!verifyPassword(password)) {
    recordLoginFailure(ip);
    throw new HttpError(401, 'Kata sandi salah.');
  }

  resetLoginFailures(ip);
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
});
