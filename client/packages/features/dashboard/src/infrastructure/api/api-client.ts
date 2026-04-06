import { ExpenseError } from '@features/dashboard/domain/errors/expense-errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';

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

    const response = await fetch(url.toString(), {
      method,
      headers: await this.headers(),
      ...(body !== undefined && { body: JSON.stringify(body) }),
      ...(signal && { signal }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const message =
        (errorBody as { message?: string })?.message ??
        `Request failed with status ${response.status}`;
      throw new ExpenseError(message, response.status);
    }

    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
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
