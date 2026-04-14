import { ExpenseError } from '@features/dashboard/domain/errors/expense-errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';

const MAX_RETRIES = 3;
const BASE_DELAY_MS = 500;
const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

function isRetryable(status: number): boolean {
  return RETRYABLE_STATUS_CODES.has(status);
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof TypeError && error.message.includes('network')) {
    return true;
  }
  if (error instanceof DOMException && error.name === 'TimeoutError') {
    return true;
  }
  return false;
}

function delay(attempt: number): Promise<void> {
  const backoff = BASE_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * backoff * 0.5;
  return new Promise((resolve) => setTimeout(resolve, backoff + jitter));
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly getToken: () => Promise<string | null>,
  ) {}

  private async headers(): Promise<HeadersInit> {
    const token = await this.getToken();
    if (!token) {
      throw new ExpenseError(
        'Authentication token expired or missing',
        HttpCode.UNAUTHORIZED,
      );
    }
    return {
      'Content-Type': 'application/json',
      Authorization: token,
    };
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) =>
        url.searchParams.set(key, value),
      );
    }

    const requestHeaders = await this.headers();
    const fetchOptions: RequestInit = {
      method,
      headers: requestHeaders,
      ...(body !== undefined && { body: JSON.stringify(body) }),
      ...(signal && { signal }),
    };

    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(url.toString(), fetchOptions);

        if (response.ok) {
          if (response.status === 204) return undefined as T;
          return response.json() as Promise<T>;
        }

        if (isRetryable(response.status) && attempt < MAX_RETRIES) {
          await delay(attempt);
          continue;
        }

        const errorBody = await response.json().catch(() => null);
        const message =
          (errorBody as { message?: string })?.message ??
          `Request failed with status ${response.status}`;
        throw new ExpenseError(message, response.status);
      } catch (error) {
        if (signal?.aborted) throw error;

        if (error instanceof ExpenseError) throw error;

        if (isTimeoutError(error) && attempt < MAX_RETRIES) {
          lastError = error;
          await delay(attempt);
          continue;
        }

        throw error;
      }
    }

    throw lastError;
  }

  async get<T>(
    path: string,
    params?: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, params, signal);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  async patch<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  async delete(path: string): Promise<void> {
    return this.request<void>('DELETE', path);
  }
}
