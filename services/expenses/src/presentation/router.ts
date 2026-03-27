import { ExpenseController, ExpensesController } from './controller';
import type { ModuleType } from '@services/expenses/types/module';
import type { Application } from '@services/expenses/presentation/application';

export const ROUTES: Array<ModuleType> = [
  {
    url: '/expenses',
    controller: (app: Application) => new ExpensesController(app),
  },
  {
    url: '/expenses/{id}',
    controller: (app: Application) => new ExpenseController(app),
  },
];
