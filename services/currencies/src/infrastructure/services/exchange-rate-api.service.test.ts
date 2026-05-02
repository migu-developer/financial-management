import { ExchangeRateApiService } from './exchange-rate-api.service';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function makeJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as Response;
}

describe('ExchangeRateApiService', () => {
  const service = new ExchangeRateApiService('https://api.example.com');

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('parses conversion_rates from successful response', async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({
        result: 'success',
        conversion_rates: { USD: 1, COP: 4150.5, EUR: 0.92 },
      }),
    );

    const rates = await service.fetchRates('test-key');

    expect(rates).toEqual({ USD: 1, COP: 4150.5, EUR: 0.92 });
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.example.com/v6/test-key/latest/USD',
      expect.objectContaining({ signal: expect.any(AbortSignal) as unknown }),
    );
  });

  it('throws on non-200 response', async () => {
    mockFetch.mockResolvedValue(makeJsonResponse({}, 403));

    await expect(service.fetchRates('bad-key')).rejects.toThrow(
      'ExchangeRate API responded with status 403',
    );
  });

  it('throws when conversion_rates is missing', async () => {
    mockFetch.mockResolvedValue(
      makeJsonResponse({ result: 'error', 'error-type': 'invalid-key' }),
    );

    await expect(service.fetchRates('test-key')).rejects.toThrow(
      'ExchangeRate API response missing conversion_rates',
    );
  });
});
