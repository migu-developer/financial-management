export { DashboardHomePage } from './presentation/pages/home';
export { DashboardTemplate } from './presentation/components/shared/templates/dashboard-template';

// Domain
export type { DashboardUser } from './domain/entities/dashboard-user';
export { computeInitials } from './domain/entities/dashboard-user';
export type { DashboardRepository } from './domain/repositories/dashboard-repository.port';
export { SignOutUseCase } from './domain/use-cases/sign-out.use-case';

// Infrastructure
export { AuthDashboardRepository } from './infrastructure/auth/auth-dashboard-repository';
/**
 * Drops every cached presigned attachment URL.
 *
 * Exported because signing out is NOT the only way a session ends: a failed
 * scheduled token refresh drops the session straight to null without going
 * through the sign-out adapter. A presigned GET needs no token, so one left
 * behind is readable by whoever uses the device next. The composition root
 * calls this on ANY loss of the authenticated user.
 */
export { clearAttachmentUrlCache } from './application/attachment-url-cache';

// Providers
export {
  DashboardProvider,
  useDashboard,
} from './presentation/providers/dashboard-provider';
export type { DashboardContextValue } from './presentation/providers/dashboard-provider';

// Web layouts & components
export { DashboardWebLayout } from './presentation/components/web/layouts/dashboard-web-layout';
export { WebHeader } from './presentation/components/web/organisms/web-header';
export { WebSidebar } from './presentation/components/web/organisms/web-sidebar';
export { UserMenu } from './presentation/components/web/molecules/user-menu';

// Mobile layouts
export { DashboardMobileLayout } from './presentation/components/mobile/layouts/dashboard-mobile-layout';

// Expenses
export { ExpensesPage } from './presentation/pages/expenses';
export {
  ExpenseProvider,
  useExpenses,
} from './presentation/providers/expense-provider';
export type { ExpenseContextValue } from './presentation/providers/expense-provider';

// Metrics
export {
  MetricsProvider,
  useMetrics,
} from './presentation/providers/metrics-provider';
export type { MetricsContextValue } from './presentation/providers/metrics-provider';
export { GetMetricsUseCase } from './application/use-cases/get-metrics.use-case';

// AI Chat
export { AIChatDrawer } from './presentation/components/shared/organisms/ai-chat-drawer';
