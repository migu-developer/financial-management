import { UsersController, UserController } from './controller';
import type { ModuleType } from '@services/users/types/module';
import type { Application } from '@services/users/presentation/application';

export const ROUTES: Array<ModuleType> = [
  {
    url: '/users',
    controller: (app: Application) => new UsersController(app),
  },
  {
    url: '/users/{id}',
    controller: (app: Application) => new UserController(app),
  },
];
