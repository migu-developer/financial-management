import { ModuleError } from './modules';
import { HttpCode } from '@packages/models/shared/utils/http-code';

/**
 * Error thrown when the result body is undefined.
 * Extends ModuleError with a specific message and code.
 */
export class ResultBodyUndefinedError extends ModuleError {
  /**
   * Constructor for ResultBodyUndefinedError.
   */
  constructor(cause?: unknown) {
    super(
      { message: 'Result body is undefined', cause },
      HttpCode.INTERNAL_SERVER_ERROR,
    );
  }

  /**
   * Get the error message.
   * @returns {string} The error message
   */
  getMessage(): string {
    return this.params['message'] as string;
  }

  /**
   * Get the HTTP status code.
   * @returns {number} The HTTP status code
   */
  getCode(): number {
    return this.code;
  }
}
