import { HttpCode } from '@packages/models/shared/utils/http-code';
import { ModuleError } from './modules';

/**
 * Error thrown when a service is not implemented.
 * Extends ModuleError with a specific message and code.
 */
export class ServiceNotImplementedError extends ModuleError {
  /**
   * Constructor for ServiceNotImplementedError.
   */
  constructor(cause?: unknown) {
    super(
      { message: 'Service not implemented', cause },
      HttpCode.NOT_IMPLEMENTED,
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

/**
 * Error thrown when data is not defined.
 * Extends ModuleError with a specific message and code.
 */
export class DataNotDefinedError extends ModuleError {
  /**
   * Constructor for DataNotDefinedError.
   */
  constructor(message: string, cause?: unknown) {
    super({ message, cause }, HttpCode.INTERNAL_SERVER_ERROR);
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

/**
 * Error thrown when the CALLER sent something invalid — an unsupported
 * content type, a malformed identifier, a value outside the allowed set.
 *
 * Distinct from `DataNotDefinedError` (500): that one signals a missing value
 * we expected to be there, i.e. our own bug. This one is a 400, so the client
 * learns it must change the request rather than retrying it unchanged.
 */
export class BadRequestError extends ModuleError {
  /**
   * Constructor for BadRequestError.
   */
  constructor(message: string, cause?: unknown) {
    super({ message, cause }, HttpCode.BAD_REQUEST);
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

/**
 * Error thrown when a request is unauthorized.
 * Extends ModuleError with a specific message and code.
 */
export class UnauthorizedError extends ModuleError {
  /**
   * Constructor for UnauthorizedError.
   */
  constructor(cause?: unknown) {
    super({ message: 'Unauthorized', cause }, HttpCode.UNAUTHORIZED);
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
