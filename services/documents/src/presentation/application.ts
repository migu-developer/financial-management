import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { ModuleType } from '@services/documents/types/module';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { User } from '@packages/models/users/interface';
import { ROUTES } from './router';

interface ApplicationProps {
  event: APIGatewayProxyEvent;
  user: User;
  logger: LoggerService;
}

export class Application {
  public readonly event: APIGatewayProxyEvent;
  public readonly method: string;
  public readonly modules: Array<ModuleType>;
  public readonly routes: Array<string>;
  public readonly pathname: string;
  public readonly logger: LoggerService;
  public readonly user: User;

  /**
   * Constructor for the Application class.
   * @param {APIGatewayProxyEvent} event - The incoming HTTP request
   */
  constructor({ event, logger, user }: ApplicationProps) {
    this.event = event;
    this.method = event.httpMethod;
    this.pathname = event.path;
    this.modules = [...ROUTES];
    this.routes = this.modules.map((mod: ModuleType) => mod.url);

    this.logger = logger;
    this.user = user;
  }
}
