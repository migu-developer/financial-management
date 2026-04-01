import type {
  LoggerService,
  LogItemExtraInput,
  LogItemMessage,
} from '@services/shared/domain/services/logger';
import { Logger } from '@aws-lambda-powertools/logger';

export class LoggerServiceImplementation implements LoggerService {
  private readonly logger: Logger;

  constructor(serviceName?: string) {
    this.logger = new Logger({
      serviceName: serviceName ?? process.env['PROJECT_PREFIX'] ?? 'app',
    });
  }

  info(item: LogItemMessage, ...extraInput: LogItemExtraInput): void {
    this.logger.info(item, ...extraInput);
  }

  error(item: LogItemMessage, ...extraInput: LogItemExtraInput): void {
    this.logger.error(item, ...extraInput);
  }

  warn(item: LogItemMessage, ...extraInput: LogItemExtraInput): void {
    this.logger.warn(item, ...extraInput);
  }
}
