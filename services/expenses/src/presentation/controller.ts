import type { Application } from '@services/expenses/presentation/application';
import { Controller } from '@services/expenses/types/controller';
import {
  ExpenseService,
  ExpensesService,
  ExpensesTypesService,
  ExpensesCategoriesService,
  ExpensesMetricsService,
} from './service';
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
   * @returns throws MethodNotImplementedError
   */
  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
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

/**
 * Controller for handling expenses types-related HTTP requests
 * Routes expenses types requests to the appropriate service methods
 */
export class ExpensesTypesController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ExpensesTypesService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for expenses types retrieval
   * @returns Promise that resolves to the HTTP response with expenses types data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for expenses types creation
   * @returns throws MethodNotImplementedError
   */
  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PUT requests for expenses types update
   * @returns throws MethodNotImplementedError
   */
  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests for expenses types update
   * @returns throws MethodNotImplementedError
   */
  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests for expenses types deletion
   * @returns throws MethodNotImplementedError
   */
  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}

/**
 * Controller for handling expenses metrics-related HTTP requests
 * Routes metrics requests to the appropriate service methods
 */
export class ExpensesMetricsController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ExpensesMetricsService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for expenses metrics retrieval
   * @returns Promise that resolves to the HTTP response with metrics data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for expenses metrics
   * @returns throws MethodNotImplementedError
   */
  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PUT requests for expenses metrics
   * @returns throws MethodNotImplementedError
   */
  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests for expenses metrics
   * @returns throws MethodNotImplementedError
   */
  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests for expenses metrics
   * @returns throws MethodNotImplementedError
   */
  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}

/**
 * Controller for handling expenses categories-related HTTP requests
 * Routes expenses categories requests to the appropriate service methods
 */
export class ExpensesCategoriesController extends Controller {
  constructor(public override readonly app: Application) {
    const service = new ExpensesCategoriesService(app);
    super(app, service);
  }

  /**
   * Handles GET requests for expenses categories retrieval
   * @returns Promise that resolves to the HTTP response with expenses categories data
   */
  override async GET(): Promise<Response> {
    return this.service.executeGET();
  }

  /**
   * Handles POST requests for expenses categories creation
   * @returns throws MethodNotImplementedError
   */
  override POST(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PUT requests for expenses categories update
   * @returns throws MethodNotImplementedError
   */
  override PUT(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles PATCH requests for expenses categories update
   * @returns throws MethodNotImplementedError
   */
  override PATCH(): Promise<Response> {
    throw new MethodNotImplementedError();
  }

  /**
   * Handles DELETE requests for expenses categories deletion
   * @returns throws MethodNotImplementedError
   */
  override DELETE(): Promise<Response> {
    throw new MethodNotImplementedError();
  }
}
