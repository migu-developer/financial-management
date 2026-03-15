import React, { createContext, useCallback, useContext, useMemo } from 'react';

import type { DashboardUser } from '@features/dashboard/domain/entities/dashboard-user';
import { AuthDashboardRepository } from '@features/dashboard/infrastructure/auth/auth-dashboard-repository';
import { SignOutUseCase } from '@features/dashboard/domain/use-cases/sign-out.use-case';

export interface DashboardContextValue {
  user: DashboardUser | null;
  signOut: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

export function useDashboard(): DashboardContextValue {
  const ctx = useContext(DashboardContext);
  if (!ctx)
    throw new Error('useDashboard must be used within DashboardProvider');
  return ctx;
}

interface DashboardProviderProps {
  children: React.ReactNode;
  user: DashboardUser | null;
  onSignOut: () => Promise<void>;
}

export function DashboardProvider({
  children,
  user,
  onSignOut,
}: DashboardProviderProps) {
  const repository = useMemo(
    () => new AuthDashboardRepository(onSignOut),
    [onSignOut],
  );

  const signOutUseCase = useMemo(
    () => new SignOutUseCase(repository),
    [repository],
  );

  const handleSignOut = useCallback(async () => {
    await signOutUseCase.execute();
  }, [signOutUseCase]);

  const value = useMemo<DashboardContextValue>(
    () => ({ user, signOut: handleSignOut }),
    [user, handleSignOut],
  );

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  );
}
