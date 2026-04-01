import { HttpCode } from '@packages/models/shared/utils/http-code';

/**
 * Abstract base class for module-related errors, extending the standard Error class.
 * Provides a structure for custom error messages and codes.
 */
export abstract class ModuleError extends Error {
  /**
   * Constructor for ModuleError.
   * @param {Record<string, unknown>} params - The parameters for the error
   * @param {number} code - The HTTP status code
   */
  constructor(
    public readonly params: Record<string, unknown> = {},
    public readonly code: number = HttpCode.NOT_IMPLEMENTED,
  ) {
    super(params['message'] as string, { cause: params['cause'] });
  }

  abstract getMessage(): string;
  abstract getCode(): number;
}

/**
 * Error thrown when a requested module cannot be found.
 * Extends ModuleError with a specific message and code.
 */
export class ModuleNotFoundError extends ModuleError {
  /**
   * Constructor for ModuleNotFoundError.
   */
  constructor(cause?: unknown) {
    super({ message: 'Module not found', cause }, HttpCode.NOT_FOUND);
  }

  getMessage(): string {
    return this.params['message'] as string;
  }

  getCode(): number {
    return this.code;
  }
}
