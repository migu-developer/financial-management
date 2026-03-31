import type { Application } from '@services/users/presentation/application';
import type { Controller } from './controller';

export interface ModuleType {
  url: string;
  controller: (app: Application) => Controller;
}
