import { ApiClient } from './api-client';
import { ExpenseError } from '@features/dashboard/domain/errors/expense-errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';

const BASE_URL = 'https://api.example.com';

function createMockResponse(
  overrides: Partial<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
  }> = {},
): Response {
  return {
    ok: true,
    status: 200,
    json: jest.fn().mockResolvedValue({ data: 'ok' }),
    headers: new Headers(),
    redirected: false,
    statusText: 'OK',
    type: 'basic' as ResponseType,
    url: '',
    clone: jest.fn(),
    body: null,
    bodyUsed: false,
    arrayBuffer: jest.fn(),
    blob: jest.fn(),
    formData: jest.fn(),
    text: jest.fn(),
    bytes: jest.fn(),
    ...overrides,
  } as Response;
}

describe('ApiClient', () => {
  let fetchSpy: jest.SpyInstance;
  let getToken: jest.Mock<Promise<string | null>>;
  let client: ApiClient;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(createMockResponse());
    getToken = jest.fn().mockResolvedValue('Bearer test-token');
    client = new ApiClient(BASE_URL, getToken);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  describe('GET requests', () => {
    it('sends a GET request to the correct URL', async () => {
      await client.get('/expenses');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/expenses`,
        expect.objectContaining({ method: 'GET' }),
      );
    });

    it('appends query params to the URL', async () => {
      await client.get('/expenses', { limit: '10', cursor: 'abc' });

      const calledUrl = fetchSpy.mock.calls[0][0] as string;
      const url = new URL(calledUrl);
      expect(url.searchParams.get('limit')).toBe('10');
      expect(url.searchParams.get('cursor')).toBe('abc');
    });

    it('passes abort signal to fetch', async () => {
      const controller = new AbortController();

      await client.get('/expenses', undefined, controller.signal);

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ signal: controller.signal }),
      );
    });

    it('sets Authorization and Content-Type headers', async () => {
      await client.get('/expenses');

      const options = fetchSpy.mock.calls[0][1] as RequestInit;
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-token');
      expect(headers['Content-Type']).toBe('application/json');
    });

    it('returns parsed JSON body', async () => {
      const responseData = { data: [{ id: '1' }] };
      fetchSpy.mockResolvedValue(
        createMockResponse({
          json: jest.fn().mockResolvedValue(responseData),
        }),
      );

      const result = await client.get('/expenses');

      expect(result).toEqual(responseData);
    });
  });

  describe('POST requests', () => {
    it('sends a POST request with JSON body', async () => {
      const body = { name: 'Coffee', value: 5 };

      await client.post('/expenses', body);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/expenses`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe('PUT requests', () => {
    it('sends a PUT request with JSON body', async () => {
      const body = { name: 'Updated', value: 10 };

      await client.put('/expenses/exp-1', body);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/expenses/exp-1`,
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe('PATCH requests', () => {
    it('sends a PATCH request with JSON body', async () => {
      const body = { value: 15 };

      await client.patch('/expenses/exp-1', body);

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/expenses/exp-1`,
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify(body),
        }),
      );
    });
  });

  describe('DELETE requests', () => {
    it('sends a DELETE request and returns void for 204', async () => {
      fetchSpy.mockResolvedValue(createMockResponse({ status: 204, ok: true }));

      const result = await client.delete('/expenses/exp-1');

      expect(fetchSpy).toHaveBeenCalledWith(
        `${BASE_URL}/expenses/exp-1`,
        expect.objectContaining({ method: 'DELETE' }),
      );
      expect(result).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('throws ExpenseError with UNAUTHORIZED when token is null', async () => {
      getToken.mockResolvedValue(null);

      await expect(client.get('/expenses')).rejects.toThrow(ExpenseError);
      await expect(client.get('/expenses')).rejects.toMatchObject({
        code: HttpCode.UNAUTHORIZED,
      });
    });

    it('throws ExpenseError on 4xx response with error body message', async () => {
      fetchSpy.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 400,
          json: jest
            .fn()
            .mockResolvedValue({ message: 'Invalid expense data' }),
        }),
      );

      await expect(client.get('/expenses')).rejects.toThrow(
        'Invalid expense data',
      );
      await expect(client.get('/expenses')).rejects.toMatchObject({
        code: 400,
      });
    });

    it('throws ExpenseError on 5xx response with fallback message', async () => {
      fetchSpy.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 500,
          json: jest.fn().mockRejectedValue(new Error('parse error')),
        }),
      );

      await expect(client.get('/expenses')).rejects.toThrow(
        'Request failed with status 500',
      );
      await expect(client.get('/expenses')).rejects.toMatchObject({
        code: 500,
      });
    });

    it('throws ExpenseError on 404 response', async () => {
      fetchSpy.mockResolvedValue(
        createMockResponse({
          ok: false,
          status: 404,
          json: jest.fn().mockResolvedValue({ message: 'Resource not found' }),
        }),
      );

      await expect(client.get('/expenses/missing')).rejects.toThrow(
        'Resource not found',
      );
      await expect(client.get('/expenses/missing')).rejects.toMatchObject({
        code: 404,
      });
    });
  });
});
