import { Service } from '@services/expenses/types/service';
import type { Application } from '@services/expenses/presentation/application';
import { HttpCode } from '@packages/models/shared/utils/http-code';

/**
 * Service for handling expenses-related HTTP requests
 * Manages expenses retrieval and update operations
 */
export class ExpensesService extends Service {
  /**
   * Creates a new ExpensesService instance
   * @param app - The application instance
   */
  constructor(public readonly app: Application) {
    super(app);
  }

  /**
   * Handles GET requests for expenses retrieval
   * Retrieves expenses data
   * @returns Promise that resolves to the HTTP response with expenses data
   */
  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses GET request',
      ExpensesService.name,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expenses data' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }

  /**
   * Handles POST requests for expenses creation
   * Creates expenses data
   * @returns Promise that resolves to the HTTP response with created expenses data
   */
  override async executePOST(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses POST request',
      ExpensesService.name,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expenses created' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }
}

/**
 * Service for handling expense-related HTTP requests
 * Manages expense retrieval and update operations
 */
export class ExpenseService extends Service {
  /**
   * Creates a new ExpenseService instance
   * @param app - The application instance
   */
  constructor(public readonly app: Application) {
    super(app);
  }

  /**
   * Handles GET requests for expense retrieval
   * Retrieves expense data
   * @returns Promise that resolves to the HTTP response with expense data
   */
  override async executeGET(): Promise<Response> {
    this.app.logger.info('Executing expense GET request', ExpenseService.name);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({
        success: true,
        data: 'Expense data',
        user: this.app.user,
      }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }

  /**
   * Handles POST requests for expense creation
   * Creates expense data
   * @returns Promise that resolves to the HTTP response with created expense data
   */
  override async executePOST(): Promise<Response> {
    this.app.logger.info(
      'Executing expense POST request',
      ExpensesService.name,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({
        success: true,
        data: 'Expense created',
        user: this.app.user,
      }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }

  /**
   * Handles PUT requests for expense update
   * Updates expense data
   * @returns Promise that resolves to the HTTP response with updated expense data
   */
  override async executePUT(): Promise<Response> {
    this.app.logger.info('Executing expense PUT request', ExpenseService.name);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expense updated put' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }

  /**
   * Handles PATCH requests for expense update
   * Updates expense data
   * @returns Promise that resolves to the HTTP response with updated expense data
   */
  override async executePATCH(): Promise<Response> {
    this.app.logger.info(
      'Executing expense PATCH request',
      ExpenseService.name,
    );

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expense updated patch' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }

  /**
   * Handles DELETE requests for expense deletion
   * Deletes expense data
   * @returns Promise that resolves to the HTTP response with deleted expense data
   */
  override async executeDELETE(): Promise<Response> {
    this.app.logger.info(
      'Executing expense DELETE request',
      ExpenseService.name,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expense deleted' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }
}

/**
 * Service for handling expenses types-related HTTP requests
 * Manages expenses types retrieval and update operations
 */
export class ExpensesTypesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  /**
   * Handles GET requests for expenses types retrieval
   * Retrieves expenses types data
   * @returns Promise that resolves to the HTTP response with expenses types data
   */
  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses types GET request',
      ExpensesTypesService.name,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expenses types data' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }
}

/**
 * Service for handling expenses categories-related HTTP requests
 * Manages expenses categories retrieval and update operations
 */
export class ExpensesCategoriesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  /**
   * Handles GET requests for expenses categories retrieval
   * Retrieves expenses categories data
   * @returns Promise that resolves to the HTTP response with expenses categories data
   */
  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses categories GET request',
      ExpensesCategoriesService.name,
    );
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return new Response(
      JSON.stringify({ success: true, data: 'Expenses categories data' }),
      {
        status: HttpCode.SUCCESS,
      },
    );
  }
}
