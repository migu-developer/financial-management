import { Service } from '@services/documents/types/service';
import type { Application } from '@services/documents/presentation/application';
import { HttpCode } from '@packages/models/shared/utils/http-code';

/**
 * Service for handling documents-related HTTP requests
 * Manages documents retrieval and update operations
 */
export class DocumentsService extends Service {
  /**
   * Creates a new DocumentsService instance
   * @param app - The application instance
   */
  constructor(public readonly app: Application) {
    super(app);
  }

  /**
   * Handles GET requests for documents retrieval
   * Retrieves documents data
   * @returns Promise that resolves to the HTTP response with documents data
   */
  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing documents GET request',
      DocumentsService.name,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Documents data' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }
}
