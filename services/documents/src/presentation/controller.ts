import type { Application } from '@services/documents/presentation/application';
import { Controller } from '@services/documents/types/controller';
import { DocumentsService } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Controller for handling documents-related HTTP requests
 * Routes documents requests to the appropriate service methods
 */
export class DocumentsController extends Controller {
  /**
   * Creates a new DocumentsController instance
   * @param app - The application instance
   */
  constructor(public override readonly app: Application) {
    const service = new DocumentsService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for documents retrieval
   * @returns Promise that resolves to the HTTP response with documents data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for documents creation
   * @returns throws MethodNotImplementedError
   */
  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PUT requests for documents updates
   * @returns throws MethodNotImplementedError
   */
  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests for documents updates
   * @returns throws MethodNotImplementedError
   */
  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests for documents deletion
   * @returns throws MethodNotImplementedError
   */
  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}
