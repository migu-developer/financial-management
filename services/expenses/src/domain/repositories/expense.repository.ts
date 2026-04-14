import type {
  Expense,
  CreateExpenseInput,
  PatchExpenseInput,
  ExpenseFilters,
} from '@packages/models/expenses';
import type {
  PaginationParams,
  PaginatedResult,
} from '@packages/models/shared/pagination';

export interface ExpenseRepository {
  findAllByUserUid(
    uid: string,
    pagination: PaginationParams,
    filters?: ExpenseFilters,
  ): Promise<PaginatedResult<Expense>>;
  countByUserUid(uid: string, filters?: ExpenseFilters): Promise<number>;
  findByIdAndUserUid(id: string, uid: string): Promise<Expense | null>;
  create(
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    createdBy: string,
  ): Promise<Expense>;
  update(
    id: string,
    input: Omit<CreateExpenseInput, 'user_id'>,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense>;
  patch(
    id: string,
    input: PatchExpenseInput,
    uid: string,
    modifiedBy: string,
  ): Promise<Expense>;
  deleteByIdAndUserUid(id: string, uid: string): Promise<void>;
}
