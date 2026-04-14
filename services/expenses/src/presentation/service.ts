import { Service } from '@services/expenses/types/service';
import type { Application } from '@services/expenses/presentation/application';
import type {
  CreateExpenseInput,
  PatchExpenseInput,
} from '@packages/models/expenses';
import { GetExpensesByUserUseCase } from '@services/expenses/application/use-cases/get-expenses-by-user.use-case';
import { GetExpenseByIdUseCase } from '@services/expenses/application/use-cases/get-expense-by-id.use-case';
import { CreateExpenseUseCase } from '@services/expenses/application/use-cases/create-expense.use-case';
import { UpdateExpenseUseCase } from '@services/expenses/application/use-cases/update-expense.use-case';
import { PatchExpenseUseCase } from '@services/expenses/application/use-cases/patch-expense.use-case';
import { DeleteExpenseUseCase } from '@services/expenses/application/use-cases/delete-expense.use-case';
import { GetExpenseTypesUseCase } from '@services/expenses/application/use-cases/get-expense-types.use-case';
import { GetExpenseCategoriesUseCase } from '@services/expenses/application/use-cases/get-expense-categories.use-case';
import { PostgresExpenseRepository } from '@services/expenses/infrastructure/repositories/postgres-expense.repository';
import { PostgresExpenseTypeRepository } from '@services/expenses/infrastructure/repositories/postgres-expense-type.repository';
import { PostgresExpenseCategoryRepository } from '@services/expenses/infrastructure/repositories/postgres-expense-category.repository';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { parsePaginationParams } from '@packages/models/shared/pagination';
import { parseExpenseFilters } from '@packages/models/expenses';

export class ExpensesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses GET request',
      ExpensesService.name,
    );
    const qs = this.app.event.queryStringParameters;
    const pagination = parsePaginationParams(qs?.['limit'], qs?.['cursor']);
    const filters = parseExpenseFilters(qs);
    const repository = new PostgresExpenseRepository(this.app.dbService);
    const useCase = new GetExpensesByUserUseCase(repository);
    const result = await useCase.execute(
      this.app.user.uid,
      pagination,
      filters,
    );
    return new Response(JSON.stringify({ success: true, ...result }), {
      status: HttpCode.SUCCESS,
    });
  }

  override async executePOST(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses POST request',
      ExpensesService.name,
    );
    const input = JSON.parse(this.app.event.body!) as Omit<
      CreateExpenseInput,
      'user_id'
    >;
    const repository = new PostgresExpenseRepository(this.app.dbService);
    const useCase = new CreateExpenseUseCase(repository);
    const expense = await useCase.execute(
      input,
      this.app.user.uid,
      this.app.user.email,
    );
    return new Response(JSON.stringify({ success: true, data: expense }), {
      status: HttpCode.SUCCESS,
    });
  }
}

export class ExpenseService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info('Executing expense GET request', ExpenseService.name);
    const id = this.app.event.pathParameters?.['id'] ?? '';
    const repository = new PostgresExpenseRepository(this.app.dbService);
    const useCase = new GetExpenseByIdUseCase(repository);
    const expense = await useCase.execute(id, this.app.user.uid);
    return new Response(JSON.stringify({ success: true, data: expense }), {
      status: HttpCode.SUCCESS,
    });
  }

  override async executePUT(): Promise<Response> {
    this.app.logger.info('Executing expense PUT request', ExpenseService.name);
    const id = this.app.event.pathParameters?.['id'] ?? '';
    const input = JSON.parse(this.app.event.body!) as Omit<
      CreateExpenseInput,
      'user_id'
    >;
    const repository = new PostgresExpenseRepository(this.app.dbService);
    const useCase = new UpdateExpenseUseCase(repository);
    const expense = await useCase.execute(
      id,
      input,
      this.app.user.uid,
      this.app.user.email,
    );
    return new Response(JSON.stringify({ success: true, data: expense }), {
      status: HttpCode.SUCCESS,
    });
  }

  override async executePATCH(): Promise<Response> {
    this.app.logger.info(
      'Executing expense PATCH request',
      ExpenseService.name,
    );
    const id = this.app.event.pathParameters?.['id'] ?? '';
    const input = JSON.parse(this.app.event.body!) as PatchExpenseInput;
    const repository = new PostgresExpenseRepository(this.app.dbService);
    const useCase = new PatchExpenseUseCase(repository);
    const expense = await useCase.execute(
      id,
      input,
      this.app.user.uid,
      this.app.user.email,
    );
    return new Response(JSON.stringify({ success: true, data: expense }), {
      status: HttpCode.SUCCESS,
    });
  }

  override async executeDELETE(): Promise<Response> {
    this.app.logger.info(
      'Executing expense DELETE request',
      ExpenseService.name,
    );
    const id = this.app.event.pathParameters?.['id'] ?? '';
    const repository = new PostgresExpenseRepository(this.app.dbService);
    const useCase = new DeleteExpenseUseCase(repository);
    await useCase.execute(id, this.app.user.uid);
    return new Response(JSON.stringify({ success: true }), {
      status: HttpCode.SUCCESS,
    });
  }
}

export class ExpensesTypesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses types GET request',
      ExpensesTypesService.name,
    );
    const repository = new PostgresExpenseTypeRepository(this.app.dbService);
    const useCase = new GetExpenseTypesUseCase(repository);
    const types = await useCase.execute();
    return new Response(JSON.stringify({ success: true, data: types }), {
      status: HttpCode.SUCCESS,
    });
  }
}

export class ExpensesCategoriesService extends Service {
  constructor(public readonly app: Application) {
    super(app);
  }

  override async executeGET(): Promise<Response> {
    this.app.logger.info(
      'Executing expenses categories GET request',
      ExpensesCategoriesService.name,
    );
    const repository = new PostgresExpenseCategoryRepository(
      this.app.dbService,
    );
    const useCase = new GetExpenseCategoriesUseCase(repository);
    const categories = await useCase.execute();
    return new Response(JSON.stringify({ success: true, data: categories }), {
      status: HttpCode.SUCCESS,
    });
  }
}
