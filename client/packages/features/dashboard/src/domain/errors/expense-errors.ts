import { HttpCode } from '@packages/models/shared/utils/http-code';

export class ExpenseError extends Error {
  constructor(
    message: string,
    public readonly code?: number,
  ) {
    super(message);
    this.name = 'ExpenseError';
  }
}

export class ExpenseNotFoundError extends ExpenseError {
  constructor() {
    super('Expense not found', HttpCode.NOT_FOUND);
    this.name = 'ExpenseNotFoundError';
  }
}

export class ExpenseValidationError extends ExpenseError {
  constructor(message: string) {
    super(message, HttpCode.BAD_REQUEST);
    this.name = 'ExpenseValidationError';
  }
}
