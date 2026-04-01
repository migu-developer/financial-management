import type { Application } from '@services/currencies/presentation/application';
import { Controller } from '@services/currencies/types/controller';
import { CurrenciesService } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Controller for handling currencies-related HTTP requests
 * Routes currencies requests to the appropriate service methods
 */
export class CurrenciesController extends Controller {
  /**
   * Creates a new CurrenciesController instance
   * @param app - The application instance
   */
  constructor(public override readonly app: Application) {
    const service = new CurrenciesService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for currencies retrieval
   * @returns Promise that resolves to the HTTP response with currencies data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for currencies creation
   * @returns throws MethodNotImplementedError
   */
  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PUT requests for currencies updates
   * @returns throws MethodNotImplementedError
   */
  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests for currencies updates
   * @returns throws MethodNotImplementedError
   */
  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests for currencies deletion
   * @returns throws MethodNotImplementedError
   */
  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}
