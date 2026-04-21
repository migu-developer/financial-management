# @features/dashboard

Dashboard feature package providing expense CRUD operations, cursor-based pagination, filtering, catalog management, and responsive layouts for both web and mobile. Follows Domain-Driven Design with a port/adapter architecture.

## Screens (pages)

| Page                | Route                 | Description                                       |
| ------------------- | --------------------- | ------------------------------------------------- |
| `DashboardHomePage` | `/dashboard/home`     | Overview / home screen                            |
| `ExpensesPage`      | `/dashboard/expenses` | Expense list with filtering, create, edit, delete |

## Presentation components

### Templates

- **DashboardTemplate** -- Shared dashboard page wrapper
- **ExpensesTemplate** -- Expense list layout with filters and action bar

### Web-specific

- **DashboardWebLayout** -- Sidebar + header layout for web
- **WebHeader** -- Top navigation bar (web)
- **WebSidebar** -- Side navigation (web)
- **UserMenu** -- User avatar dropdown with sign-out (web)
- **ExpenseList** -- Scrollable expense list (web)
- **ExpenseModal** -- Create/edit expense modal dialog (web)

### Mobile-specific

- **DashboardMobileLayout** -- Tab-based layout for native

### Shared molecules

- **ExpenseCard** -- Single expense display card
- **ExpenseCardSkeleton** -- Loading placeholder for expense cards
- **ExpenseForm** -- Create/edit expense form fields
- **ExpenseSummary** -- Aggregate expense totals display
- **FilterBarSkeleton** -- Loading placeholder for filter controls

## Architecture (DDD layers)

```
src/
  domain/
    entities/           DashboardUser (+ computeInitials utility)
    errors/             ExpenseError, ExpenseNotFoundError, ExpenseValidationError
    repositories/       DashboardRepository port, ExpenseRepository port
    use-cases/          SignOutUseCase

  application/
    use-cases/          5 use cases (see below)

  infrastructure/
    api/                ApiClient (HTTP + retry), ExpenseApiRepository
    auth/               AuthDashboardRepository

  presentation/
    providers/          DashboardProvider, ExpenseProvider
    pages/              home, expenses
    components/         web/, mobile/, shared/ (templates, molecules)
```

## Use cases (6 total)

| Use case               | Description                                             |
| ---------------------- | ------------------------------------------------------- |
| `ListExpensesUseCase`  | Fetch paginated expenses with optional filters          |
| `CreateExpenseUseCase` | Create a new expense                                    |
| `UpdateExpenseUseCase` | Full update of an existing expense                      |
| `DeleteExpenseUseCase` | Delete an expense by ID                                 |
| `ListCatalogsUseCase`  | Fetch currencies, expense types, and expense categories |
| `SignOutUseCase`       | Sign out from the dashboard (delegates to auth)         |

## API client

The `ApiClient` class wraps `fetch` with:

- **Automatic retry with exponential backoff**: Up to 3 retries for idempotent methods (GET, HEAD, PUT, DELETE, OPTIONS) on status codes 429, 502, 503, 504
- **Jitter**: Random jitter added to backoff delay to prevent thundering herd
- **Timeout detection**: Retries on network/timeout errors
- **Auth header injection**: Automatically attaches the access token via a `getToken` callback
- **Base delay**: 500ms with `2^attempt` exponential growth

## Cursor-based pagination

Expense listing uses cursor-based pagination:

- `listExpenses(limit, cursor?, signal?, filters?)` returns `{ data, next_cursor, has_more, total_count? }`
- `loadMore()` appends the next page to the existing list
- An `AbortController` cancels in-flight requests when filters change or the component unmounts

## Filtering

The `ExpenseProvider` supports filtering by:

- `expense_type_id` -- Type of expense
- `expense_category_id` -- Category of expense
- `name` -- Text search on expense name

Filter changes trigger a fresh load (first page) with the previous request aborted.

## Catalog caching

Currencies, expense types, and expense categories are cached using `@packages/utils` `createCache` with a 5-minute TTL:

1. On mount, try reading from AsyncStorage cache
2. If all three catalogs hit, use cached values immediately
3. On cache miss or expiry, fetch from the API
4. Persist fetched results to cache asynchronously (fire and forget)

## Providers

### DashboardProvider

Provides `DashboardContextValue` via `useDashboard()` hook:

- `user: DashboardUser | null` -- Current user info (userId, fullname, email)
- `signOut()` -- Sign out from the dashboard

### ExpenseProvider

Provides `ExpenseContextValue` via `useExpenses()` hook:

- Expense list state (expenses, totalCount, hasMore)
- Loading states (initialLoading, filtering, loadingMore)
- Error state + `clearError()`
- Catalog data (currencies, expenseTypes, expenseCategories, catalogsLoaded)
- CRUD operations (createExpense, updateExpense, deleteExpense)
- Pagination (loadExpenses, loadMore)
- Filter management (filters, setFilters)

## Dependencies

### Internal

`@features/ui`, `@packages/i18n`, `@packages/utils`, `@packages/models`

### External

@expo/vector-icons

## Scripts

| Script      | Command          | Description                 |
| ----------- | ---------------- | --------------------------- |
| `typecheck` | `tsc --noEmit`   | Type-check without emitting |
| `lint`      | `eslint .`       | Run ESLint                  |
| `lint:fix`  | `eslint . --fix` | Auto-fix lint errors        |
| `test`      | `jest`           | Run unit tests              |

## Testing

```bash
pnpm test
```

Co-located test files cover use cases, API client (retry logic), expense API repository, providers, pages, templates, and UI components. Mocks for Expo modules and react-native are in `src/__mocks__/`.
