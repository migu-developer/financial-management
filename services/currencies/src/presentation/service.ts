import { Service } from '@services/currencies/types/service';
import type { Application } from '@services/currencies/presentation/application';
import { HttpCode } from '@packages/models/shared/utils/http-code';

/**
 * Service for handling currencies-related HTTP requests
 * Manages currencies retrieval and update operations
 */
export class CurrenciesService extends Service {
  /**
   * Creates a new CurrenciesService instance
   * @param app - The application instance
   */
  constructor(public readonly app: Application) {
    super(app);
  }

  /**
   * Handles GET requests for currencies retrieval
   * Retrieves currencies data
   * @returns Promise that resolves to the HTTP response with currencies data
   */
  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing currencies GET request',
      CurrenciesService.name,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Currencies data' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }
}
