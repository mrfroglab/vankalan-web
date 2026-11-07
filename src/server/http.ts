/**
 * Helper HTTP untuk route handler: respons JSON konsisten, parsing body
 * tervalidasi Zod, dan penanganan error terpusat.
 */

import { NextResponse } from 'next/server';
import { ZodError, type ZodType } from 'zod';

export class HttpError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof HttpError) {
    return NextResponse.json(
      { success: false, error: err.message, details: err.details },
      { status: err.status }
    );
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      {
        success: false,
        error: 'Data yang dikirim tidak valid.',
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
      { status: 400 }
    );
  }
  console.error('[api] Unhandled error:', err);
  return NextResponse.json(
    { success: false, error: 'Terjadi kesalahan pada server.' },
    { status: 500 }
  );
}

export async function parseBody<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw new HttpError(400, 'Body permintaan harus berupa JSON yang valid.');
  }
  return schema.parse(raw);
}

/** Bungkus handler agar semua error lewat errorResponse. */
export function handle<A extends unknown[]>(
  fn: (...args: A) => Promise<NextResponse>
): (...args: A) => Promise<NextResponse> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (err) {
      return errorResponse(err);
    }
  };
}
