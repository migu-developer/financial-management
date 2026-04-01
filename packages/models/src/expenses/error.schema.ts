import { ErrorCode } from '@packages/models/shared/utils/errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';

export const errorsSchema = [
  {
    name: 'BadRequestBody',
    type: ErrorCode.BAD_REQUEST_BODY,
    statusCode: HttpCode.BAD_REQUEST,
    template: {
      code: 'VALIDATION_ERROR',
      message: '$context.error.validationErrorString',
    },
  },
  {
    name: 'BadRequestParams',
    type: ErrorCode.BAD_REQUEST_PARAMETERS,
    statusCode: HttpCode.BAD_REQUEST,
    template: {
      code: 'INVALID_PARAMETERS',
      message: '$context.error.validationErrorString',
    },
  },
  {
    name: 'Unauthorized',
    type: ErrorCode.UNAUTHORIZED,
    statusCode: HttpCode.UNAUTHORIZED,
    template: {
      code: 'UNAUTHORIZED',
      message: 'Missing or invalid authentication token',
    },
  },
  {
    name: 'AccessDenied',
    type: ErrorCode.ACCESS_DENIED,
    statusCode: HttpCode.FORBIDDEN,
    template: {
      code: 'ACCESS_DENIED',
      message: 'Access denied',
    },
  },
];
