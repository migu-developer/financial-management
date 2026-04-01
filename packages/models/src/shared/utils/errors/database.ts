import { HttpCode } from '@packages/models/shared/utils/http-code';
import { ModuleError } from './modules';

/**
 * Error thrown when a database connection string is not found.
 */
export class DatabaseError extends ModuleError {
  /**
   * Constructor for DatabaseError.
   */
  constructor(message: string = 'Database Error', cause?: unknown) {
    super({ message, cause }, HttpCode.INTERNAL_SERVER_ERROR);
  }

  getMessage(): string {
    return this.params['message'] as string;
  }

  getCode(): number {
    return this.code;
  }
}
