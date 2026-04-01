import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { ModuleType } from '@services/documents/types/module';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { UserProfile } from '@packages/models/users/types';
import type { DatabaseService } from '@services/shared/domain/services/database';
import { ROUTES } from './router';

interface ApplicationProps {
  event: APIGatewayProxyEvent;
  user: UserProfile;
  logger: LoggerService;
  dbService: DatabaseService;
}

export class Application {
  public readonly event: APIGatewayProxyEvent;
  public readonly method: string;
  public readonly modules: Array<ModuleType>;
  public readonly routes: Array<string>;
  public readonly pathname: string;
  public readonly logger: LoggerService;
  public readonly user: UserProfile;
  public readonly dbService: DatabaseService;

  constructor({ event, logger, user, dbService }: ApplicationProps) {
    this.event = event;
    this.method = event.httpMethod;
    this.pathname = event.path;
    this.modules = [...ROUTES];
    this.routes = this.modules.map((mod: ModuleType) => mod.url);

    this.logger = logger;
    this.user = user;
    this.dbService = dbService;
  }
}
