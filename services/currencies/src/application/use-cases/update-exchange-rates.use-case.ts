import type { CurrencyRepository } from '@services/currencies/domain/repositories/currency.repository';
import type {
  ExchangeRateRepository,
  UpsertRateInput,
} from '@services/currencies/domain/repositories/exchange-rate.repository';
import type { ExchangeRateApiService } from '@services/currencies/infrastructure/services/exchange-rate-api.service';

export class UpdateExchangeRatesUseCase {
  constructor(
    private readonly currencyRepository: CurrencyRepository,
    private readonly exchangeRateRepository: ExchangeRateRepository,
    private readonly apiService: ExchangeRateApiService,
    private readonly apiKey: string,
  ) {}

  async execute(): Promise<number> {
    const currencies = await this.currencyRepository.findAll();
    const apiRates = await this.apiService.fetchRates(this.apiKey);

    const today = new Date().toISOString().split('T')[0]!;
    const upperCaseRates = new Map<string, number>();
    for (const [code, rate] of Object.entries(apiRates)) {
      upperCaseRates.set(code.toUpperCase(), rate);
    }

    const ratesToUpsert: UpsertRateInput[] = [];

    for (const currency of currencies) {
      const rate = upperCaseRates.get(currency.code.toUpperCase());
      if (rate === undefined) continue;

      ratesToUpsert.push({
        currency_id: currency.id,
        rate_to_usd: rate,
        rate_date: today,
        source: 'exchangerate-api.com',
      });
    }

    if (ratesToUpsert.length > 0) {
      await this.exchangeRateRepository.upsertRates(ratesToUpsert);
    }

    return ratesToUpsert.length;
  }
}
