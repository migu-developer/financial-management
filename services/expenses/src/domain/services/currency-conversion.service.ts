export interface CurrencyConversionService {
  convert(currencyId: string, value: number): Promise<number | null>;
}
