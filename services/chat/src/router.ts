import type { Application } from '@services/chat/presentation/application';
import type { Controller } from '@services/chat/types/controller';
import type { ModuleType } from '@services/chat/types/module';
import {
  MethodNotImplementedError,
  ModuleNotFoundError,
  RouteNotFoundError,
} from '@packages/models/shared/utils/errors';
import { matchRoute } from '@services/shared/utils/router';

export class Router {
  private readonly app: Application;
  private readonly controller: Controller;

  constructor(app: Application, controller: Controller) {
    this.app = app;
    this.controller = controller;
  }

  static instantiate(app: Application): Router {
    app.logger.info(`Instantiating router for ${app.pathname}`, Router.name);

    // Match longest pattern first so '/chat/confirm' wins over '/chat'.
    const sortedRoutes = [...app.routes].sort((a, b) => b.length - a.length);
    const route = sortedRoutes.find((r) => matchRoute(r, app.pathname));

    if (!route) {
      app.logger.warn(`Route not found for ${app.pathname}`, Router.name);
      throw new RouteNotFoundError();
    }

    const mod: ModuleType | undefined = app.modules.find(
      (m) => m.url === route,
    );

    if (!mod) {
      app.logger.warn(`Module not found for route ${route}`, Router.name);
      throw new ModuleNotFoundError();
    }

    const controller = mod.controller(app);
    app.logger.info(`Controller resolved for ${app.pathname}`, Router.name);

    return new Router(app, controller);
  }

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
