import { HttpCode } from '@packages/models/shared/utils/http-code';
import { ModuleError } from '@packages/models/shared/utils/errors';
import type { LoggerService } from '@services/shared/domain/services/logger';

export class ErrorHandler {
  static handle(error: unknown, logger: LoggerService) {
    if (error instanceof ModuleError) {
      logger.error(
        `message: ${error.getMessage()}, cause: ${error.cause}, code: ${error.getCode()}`,
        ErrorHandler.name,
      );
      return {
        statusCode: error.getCode(),
        body: JSON.stringify({ message: error.getMessage() }),
      };
    }

    if (error instanceof Error) {
      logger.error(
        `message: ${error.message}, cause: ${error.cause}, code: ${HttpCode.INTERNAL_SERVER_ERROR}`,
        ErrorHandler.name,
      );
      return {
        statusCode: HttpCode.INTERNAL_SERVER_ERROR,
        body: JSON.stringify({ message: error.message }),
      };
    }

    logger.error(JSON.stringify(error), ErrorHandler.name);

    return {
      statusCode: HttpCode.INTERNAL_SERVER_ERROR,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
}
