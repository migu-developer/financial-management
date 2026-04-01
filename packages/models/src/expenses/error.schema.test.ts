import { ErrorCode } from '@packages/models/shared/utils/errors';
import { HttpCode } from '@packages/models/shared/utils/http-code';
import { errorsSchema } from './error.schema';

describe('errorsSchema', () => {
  it('has 4 items', () => {
    expect(errorsSchema).toHaveLength(4);
  });

  it('item 0 has correct values', () => {
    expect(errorsSchema[0]).toEqual({
      name: 'BadRequestBody',
      type: ErrorCode.BAD_REQUEST_BODY,
      statusCode: HttpCode.BAD_REQUEST,
      template: {
        code: 'VALIDATION_ERROR',
        message: '$context.error.validationErrorString',
      },
    });
  });

  it('has correct type values', () => {
    expect(typeof errorsSchema).toBe('object');
  });
});
