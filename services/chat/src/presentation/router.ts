import { ChatController, ChatConfirmController } from './controller';
import type { ModuleType } from '@services/chat/types/module';
import type { Application } from '@services/chat/presentation/application';

export const ROUTES: Array<ModuleType> = [
  {
    url: '/chat',
    controller: (app: Application) => new ChatController(app),
  },
  {
    url: '/chat/confirm',
    controller: (app: Application) => new ChatConfirmController(app),
  },
];
