import { Tracer } from '@aws-lambda-powertools/tracer';

const tracer = new Tracer({ serviceName: 'exchange-rate-api' });

interface ExchangeRateApiResponse {
  result: string;
  conversion_rates: Record<string, number>;
}

export class ExchangeRateApiService {
  constructor(private readonly baseUrl: string) {}

  @tracer.captureMethod({ subSegmentName: 'ExchangeRateApi:fetchRates' })
  async fetchRates(apiKey: string): Promise<Record<string, number>> {
    const url = `${this.baseUrl}/v6/${apiKey}/latest/USD`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      throw new Error(
        `ExchangeRate API responded with status ${String(response.status)}`,
      );
    }

    const data = (await response.json()) as ExchangeRateApiResponse;

    if (!data.conversion_rates) {
      throw new Error('ExchangeRate API response missing conversion_rates');
    }

    return data.conversion_rates;
  }
}
