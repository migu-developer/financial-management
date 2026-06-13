import type { Application } from '@services/chat/presentation/application';
import type { Controller } from './controller';

/**
 * Represents a chat module: a route pattern + its controller factory.
 */
export interface ModuleType {
  url: string;
  controller: (app: Application) => Controller;
}
