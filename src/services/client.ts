/**
 * Centralized API client base for Web Warmindo Putra Vangkalan.
 * Inspects NEXT_PUBLIC_API_URL and provides unified HTTP fetch abstraction
 * with structured error handling and response unwrapping.
 */

export function isBackendConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  return Boolean(url && url.length > 0);
}

export function getBaseApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim() || '';
  return url.replace(/\/+$/, '');
}

export class ApiError extends Error {
  statusCode: number;
  endpoint: string;
  responseData?: unknown;

  constructor(
    message: string,
    statusCode: number = 500,
    endpoint: string = '',
    responseData?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.responseData = responseData;
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = getBaseApiUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const fullUrl = `${baseUrl}${normalizedPath}`;

  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      ...options,
      headers,
    });
  } catch (networkError) {
    const errorMsg =
      networkError instanceof Error ? networkError.message : 'Network request failed';
    throw new ApiError(errorMsg, 0, normalizedPath, networkError);
  }

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
    let errorData: unknown = null;
    try {
      errorData = await response.json();
      if (
        errorData &&
        typeof errorData === 'object' &&
        ('message' in errorData || 'error' in errorData)
      ) {
        const payload = errorData as { message?: string; error?: string };
        errorMessage = payload.message || payload.error || errorMessage;
      }
    } catch {
      // Non-JSON response body
    }
    throw new ApiError(errorMessage, response.status, normalizedPath, errorData);
  }

  if (response.status === 204) {
    return {} as T;
  }

  const data = await response.json();
  return data as T;
}
