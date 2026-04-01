import type { Application } from '@services/documents/presentation/application';
import type { Controller } from './controller';

/**
 * Represents a module in the application, including its URL and controller factory
 * Used for module registration and routing documents
 */
export interface ModuleType {
  /** URL path for the module */
  url: string;
  /** Factory function that creates a controller instance for the module */
  controller: (app: Application) => Controller;
}
