import { CurrenciesController } from './controller';
import type { ModuleType } from '@services/currencies/types/module';
import type { Application } from '@services/currencies/presentation/application';

export const ROUTES: Array<ModuleType> = [
  {
    url: '/currencies',
    controller: (app: Application) => new CurrenciesController(app),
  },
];
