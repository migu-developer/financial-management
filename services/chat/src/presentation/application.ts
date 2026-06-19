import type { APIGatewayProxyEvent } from '@services/shared/domain/interfaces/request';
import type { ModuleType } from '@services/chat/types/module';
import type { LoggerService } from '@services/shared/domain/services/logger';
import type { UserProfile } from '@packages/models/users/types';
import type { DatabaseService } from '@services/shared/domain/services/database';
import type { MetricsService } from '@services/shared/domain/services/metrics';
import type { WorkflowStarterService } from '@services/chat/domain/services/workflow-starter.service';
import type { WorkflowCallbackService } from '@services/chat/domain/services/workflow-callback.service';
import { ROUTES } from './router';

interface ApplicationProps {
  event: APIGatewayProxyEvent;
  user: UserProfile;
  logger: LoggerService;
  dbService: DatabaseService;
  metrics: MetricsService;
  workflowStarter: WorkflowStarterService;
  workflowCallback: WorkflowCallbackService;
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
  public readonly metrics: MetricsService;
  public readonly workflowStarter: WorkflowStarterService;
  public readonly workflowCallback: WorkflowCallbackService;

  constructor({
    event,
    logger,
    user,
    dbService,
    metrics,
    workflowStarter,
    workflowCallback,
  }: ApplicationProps) {
    this.event = event;
    this.method = event.httpMethod;
    this.pathname = event.path;
    this.modules = [...ROUTES];
    this.routes = this.modules.map((mod: ModuleType) => mod.url);

    this.logger = logger;
    this.user = user;
    this.dbService = dbService;
    this.metrics = metrics;
    this.workflowStarter = workflowStarter;
    this.workflowCallback = workflowCallback;
  }
}
