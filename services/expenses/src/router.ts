import type { Application } from '@services/expenses/presentation/application';
import type { Controller } from '@services/expenses/types/controller';
import type { ModuleType } from '@services/expenses/types/module';
import { RouteNotFoundError } from '@packages/models/shared/utils/errors';
import { ModuleNotFoundError } from '@packages/models/shared/utils/errors';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';

/**
 * Matches an incoming pathname against a route pattern.
 * Static segments must match exactly.
 * Dynamic segments in the form {param} match any non-empty value.
 *
 * Examples:
 *   matchRoute('/expenses/{id}', '/expenses/abc123')          → true
 *   matchRoute('/a/{id}/b/{id}', '/a/x/b/y')                 → true
 *   matchRoute('/expenses/{id}', '/expenses/')                → false (empty segment)
 *   matchRoute('/expenses', '/expenses/extra')                → false (different length)
 */
export function matchRoute(pattern: string, pathname: string): boolean {
  const patternSegments = pattern.split('/');
  const pathSegments = pathname.split('/');

  if (patternSegments.length !== pathSegments.length) {
    return false;
  }

  return patternSegments.every((seg, i) => {
    const isDynamic = seg.startsWith('{') && seg.endsWith('}');
    if (isDynamic) {
      return (pathSegments[i]?.length ?? 0) > 0;
    }
    return seg === pathSegments[i];
  });
}

export class Router {
  /**
   * The application instance
   */
  private readonly app: Application;

  /**
   * The controller instance
   */
  private readonly controller: Controller;

  /**
   * The constructor for the Router
   * @param {Application} app - The application instance
   * @param {Controller} controller - The controller instance
   */
  constructor(app: Application, controller: Controller) {
    this.app = app;
    this.controller = controller;
  }

  /**
   * Instantiates a new Router
   * @param {Application} app - The application instance
   * @returns {Router} The router instance
   */
  static instantiate(app: Application): Router {
    app.logger.info(`Instantiating router for ${app.pathname}`, Router.name);

    const route: string | undefined = app.routes.find((route) =>
      matchRoute(route, app.pathname),
    );

    if (!route) {
      app.logger.warn(`Route not found for ${app.pathname}`, Router.name);
      throw new RouteNotFoundError();
    }

    const mod: ModuleType | undefined = app.modules.find(
      (mod) => mod.url === route,
    );

    if (!mod) {
      app.logger.warn(`Module not found for route ${route}`, Router.name);
      throw new ModuleNotFoundError();
    }

    const controller = mod.controller(app);
    app.logger.info(`Controller resolved for ${app.pathname}`, Router.name);

    const router = new Router(app, controller);

    return router;
  }

  /**
   * Dispatches the request to the controller
   * @returns {Promise<Response>} The response from the controller
   */
  async dispatch(): Promise<Response> {
    this.app.logger.info(
      `Dispatching request for ${JSON.stringify({
        method: this.app.method,
        pathname: this.app.pathname,
      })}`,
      Router.name,
    );

    const func = this.controller[
      this.app.method as keyof Controller
    ] as () => Promise<Response>;

    if (!func) {
      this.app.logger.error(
        `Method not implemented for ${this.app.method}`,
        Router.name,
      );
      throw new MethodNotImplementedError();
    }

    const response = await func.bind(this.controller)();
    this.app.logger.info('Request dispatched successfully', Router.name);
    return response;
  }
}
