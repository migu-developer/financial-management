import { DocumentsController } from './controller';
import type { ModuleType } from '@services/documents/types/module';
import type { Application } from '@services/documents/presentation/application';

export const ROUTES: Array<ModuleType> = [
  {
    url: '/documents',
    controller: (app: Application) => new DocumentsController(app),
  },
];
