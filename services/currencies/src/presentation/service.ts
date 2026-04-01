import { Service } from '@services/currencies/types/service';
import type { Application } from '@services/currencies/presentation/application';
import { GetCurrenciesUseCase } from '@services/currencies/application/use-cases/get-currencies.use-case';
import { PostgresCurrencyRepository } from '@services/currencies/infrastructure/repositories/postgres-currency.repository';
import { HttpCode } from '@packages/models/shared/utils/http-code';

export class CurrenciesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing currencies GET request',
      CurrenciesService.name,
    );

    const repository = new PostgresCurrencyRepository(this.app.dbService);
    const useCase = new GetCurrenciesUseCase(repository);
    const currencies = await useCase.execute();

    return new Response(JSON.stringify({ success: true, data: currencies }), {
      status: HttpCode.SUCCESS,
    });
  }
}
