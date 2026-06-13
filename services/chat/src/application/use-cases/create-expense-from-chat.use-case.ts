import type { Expense } from '@packages/models/expenses';
import { CreateExpenseUseCase } from '@services/expenses/application/use-cases/create-expense.use-case';
import type { ExpenseRepository } from '@services/expenses/domain/repositories/expense.repository';
import type { CurrencyConversionService } from '@services/expenses/domain/services/currency-conversion.service';
import type { ResolvedExpenseFields } from './validate-expense-fields.use-case';

export interface CreateExpenseFromChatInput {
  uid: string;
  userEmail: string;
  fields: ResolvedExpenseFields;
}

/**
 * Thin wrapper that delegates expense creation to the existing
 * `CreateExpenseUseCase`. The chat workflow gets a stable boundary
 * without re-implementing currency conversion or any business rules.
 */
export class CreateExpenseFromChatUseCase {
  constructor(
    private readonly expenseRepository: ExpenseRepository,
    private readonly conversionService: CurrencyConversionService,
  ) {}

  async execute(input: CreateExpenseFromChatInput): Promise<Expense> {
    const useCase = new CreateExpenseUseCase(
      this.expenseRepository,
      this.conversionService,
    );
    return useCase.execute(
      {
        name: input.fields.name,
        value: input.fields.value,
        currency_id: input.fields.currency_id,
        expense_type_id: input.fields.expense_type_id,
        ...(input.fields.expense_category_id !== undefined && {
          expense_category_id: input.fields.expense_category_id,
        }),
        ...(input.fields.date !== undefined && { date: input.fields.date }),
      },
      input.uid,
      input.userEmail,
    );
  }
}
