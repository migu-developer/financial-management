import type { Application } from '@services/currencies/presentation/application';
import type { Controller } from '@services/currencies/types/controller';
import type { ModuleType } from '@services/currencies/types/module';
import { RouteNotFoundError } from '@packages/models/shared/utils/errors';
import { ModuleNotFoundError } from '@packages/models/shared/utils/errors';
import { MethodNotImplementedError } from '@packages/models/shared/utils/errors';
import { matchRoute } from '@services/shared/utils/router';

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
