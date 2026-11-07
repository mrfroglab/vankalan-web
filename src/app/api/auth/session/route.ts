import { connection } from 'next/server';
import { handle, json } from '@/server/http';
import { SESSION_COOKIE, isAuthConfigured, readCookie, verifySessionToken } from '@/server/session';

export const GET = handle(async (request: Request) => {
  await connection();
  const configured = isAuthConfigured();
  const authenticated =
    configured && verifySessionToken(readCookie(request.headers.get('cookie'), SESSION_COOKIE));
  return json({ configured, authenticated });
});
