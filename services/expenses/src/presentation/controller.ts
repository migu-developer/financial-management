import type { Application } from '@services/expenses/presentation/application';
import { Controller } from '@services/expenses/types/controller';
import { ExpenseService, ExpensesService } from './service';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Controller for handling expenses-related HTTP requests
 * Routes expenses requests to the appropriate service methods
 */
export class ExpensesController extends Controller {
  /**
   * Creates a new ExpensesController instance
   * @param app - The application instance
   */
  constructor(public override readonly app: Application) {
    const service = new ExpensesService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for expenses retrieval
   * @returns Promise that resolves to the HTTP response with expenses data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for expenses creation
   * @returns Promise that resolves to the HTTP response with created expenses
   */
  override async POST(): Promise<Response> {
    return this.service.executePOST();
  }

  /**
   * Handles PUT requests for expenses updates
   * @returns throws MethodNotImplementedError
   */
  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests for expenses updates
   * @returns throws MethodNotImplementedError
   */
  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests for expenses deletion
   * @returns throws MethodNotImplementedError
   */
  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}

/**
 * Controller for handling expense-related HTTP requests
 * Routes expense requests to the appropriate service methods
 */
export class ExpenseController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ExpenseService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for expense retrieval
   * @returns Promise that resolves to the HTTP response with expense data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for expense creation
   * @returns Promise that resolves to the HTTP response with created expense
   */
  override async POST(): Promise<Response> {
    return this.service.executePOST();
  }

  /**
   * Handles PUT requests for expense update
   * @returns Promise that resolves to the HTTP response with updated expense
   */
  override async PUT(): Promise<Response> {
    return this.service.executePUT();
  }

  /**
   * Handles PATCH requests for expense update
   * @returns Promise that resolves to the HTTP response with updated expense
   */
  override async PATCH(): Promise<Response> {
    return this.service.executePATCH();
  }

  /**
   * Handles DELETE requests for expense deletion
   * @returns Promise that resolves to the HTTP response with deleted expense
   */
  override async DELETE(): Promise<Response> {
    return this.service.executeDELETE();
  }
}
