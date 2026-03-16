import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

import { cognitoAuthRepository } from '@features/auth/infrastructure/cognito/cognito-auth-repository';
import type { AuthSession } from '@features/auth/domain/entities/auth-session';
import { sessionExpiresInMs } from '@features/auth/domain/entities/auth-session';
import type { User } from '@features/auth/domain/entities/user';
import {
  AuthChallengeType,
  type AuthChallengeResult,
  type ForgotPasswordDelivery,
  type MfaType,
  type PkceParams,
  type SignUpDto,
  type SocialProvider,
} from '@features/auth/domain/repositories/auth-repository.port';

const REFRESH_BUFFER_MS = 5 * 60 * 1_000;

export interface AuthState {
  session: AuthSession | null;
  user: User | null;
  pendingChallenge: AuthChallengeResult | null;
  loading: boolean;
  error: Error | null;
}

export interface AuthContextValue extends AuthState {
  signIn: (
    identifier: string,
    password: string,
  ) => Promise<AuthChallengeResult>;
  signOut: () => Promise<void>;
  signUp: (dto: SignUpDto) => Promise<void>;
  confirmSignUp: (identifier: string, code: string) => Promise<void>;
  resendConfirmation: (identifier: string) => Promise<void>;
  respondToNewPassword: (
    session: string,
    newPassword: string,
  ) => Promise<AuthChallengeResult>;
  respondToMfa: (session: string, code: string, type: MfaType) => Promise<void>;
  initiateForgotPassword: (
    identifier: string,
  ) => Promise<ForgotPasswordDelivery>;
  confirmForgotPassword: (
    identifier: string,
    code: string,
    newPassword: string,
  ) => Promise<void>;
  getOAuthSignInUrl: (
    provider: SocialProvider,
    redirectUri: string,
  ) => Promise<{ url: string; pkce: PkceParams }>;
  handleOAuthCallback: (
    code: string,
    codeVerifier: string,
    redirectUri: string,
    provider?: SocialProvider,
    deviceLocale?: string,
  ) => Promise<void>;
  updateUserAttribute: (name: string, value: string) => Promise<void>;
  associateSoftwareToken: (
    session: string,
  ) => Promise<{ secretCode: string; qrCodeUrl: string }>;
  verifySoftwareToken: (
    session: string,
    code: string,
    deviceName: string,
  ) => Promise<void>;
  clearError: () => void;
  clearPendingChallenge: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    pendingChallenge: null,
    loading: true,
    error: null,
  });

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleRefresh = useCallback((session: AuthSession) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    const delay = Math.max(sessionExpiresInMs(session) - REFRESH_BUFFER_MS, 0);
    refreshTimerRef.current = setTimeout(async () => {
      try {
        const refreshed = await cognitoAuthRepository.refreshSession();
        setState((prev) => ({ ...prev, session: refreshed }));
        scheduleRefresh(refreshed);
      } catch {
        setState((prev) => ({ ...prev, session: null, user: null }));
      }
    }, delay);
  }, []);

  useEffect(() => {
    async function restore() {
      try {
        const user = await cognitoAuthRepository.getCurrentUser();
        if (user) {
          const session = await cognitoAuthRepository.refreshSession();
          setState({
            session,
            user,
            pendingChallenge: null,
            loading: false,
            error: null,
          });
          scheduleRefresh(session);
        } else {
          setState((prev) => ({ ...prev, loading: false }));
        }
      } catch {
        setState((prev) => ({ ...prev, loading: false }));
      }
    }
    restore();
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, [scheduleRefresh]);

  const signIn = useCallback(
    async (
      identifier: string,
      password: string,
    ): Promise<AuthChallengeResult> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await cognitoAuthRepository.signIn(identifier, password);
        if (result.type === AuthChallengeType.SESSION) {
          const user = await cognitoAuthRepository.getCurrentUser();
          setState({
            session: result.session,
            user,
            pendingChallenge: null,
            loading: false,
            error: null,
          });
          scheduleRefresh(result.session);
        } else {
          setState((prev) => ({
            ...prev,
            pendingChallenge: result,
            loading: false,
          }));
        }
        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [scheduleRefresh],
  );

  const signOut = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await cognitoAuthRepository.signOut();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      setState({
        session: null,
        user: null,
        pendingChallenge: null,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const signUp = useCallback(async (dto: SignUpDto) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      await cognitoAuthRepository.signUp(dto);
      setState((prev) => ({ ...prev, loading: false }));
    } catch (error) {
      setState((prev) => ({ ...prev, loading: false, error: error as Error }));
      throw error;
    }
  }, []);

  const confirmSignUp = useCallback(
    async (identifier: string, code: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await cognitoAuthRepository.confirmSignUp(identifier, code);
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [],
  );

  const resendConfirmation = useCallback(async (identifier: string) => {
    setState((prev) => ({ ...prev, error: null }));
    try {
      await cognitoAuthRepository.resendConfirmationCode(identifier);
    } catch (error) {
      setState((prev) => ({ ...prev, error: error as Error }));
      throw error;
    }
  }, []);

  const respondToNewPassword = useCallback(
    async (
      session: string,
      newPassword: string,
    ): Promise<AuthChallengeResult> => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result =
          await cognitoAuthRepository.respondToNewPasswordChallenge(
            session,
            newPassword,
          );
        if (result.type === AuthChallengeType.SESSION) {
          const user = await cognitoAuthRepository.getCurrentUser();
          setState({
            session: result.session,
            user,
            pendingChallenge: null,
            loading: false,
            error: null,
          });
          scheduleRefresh(result.session);
        } else {
          setState((prev) => ({
            ...prev,
            pendingChallenge: result,
            loading: false,
          }));
        }
        return result;
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [scheduleRefresh],
  );

  const respondToMfa = useCallback(
    async (session: string, code: string, type: MfaType) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const authSession = await cognitoAuthRepository.respondToMfaChallenge(
          session,
          code,
          type,
        );
        const user = await cognitoAuthRepository.getCurrentUser();
        setState({
          session: authSession,
          user,
          pendingChallenge: null,
          loading: false,
          error: null,
        });
        scheduleRefresh(authSession);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [scheduleRefresh],
  );

  const initiateForgotPassword = useCallback(
    async (identifier: string): Promise<ForgotPasswordDelivery> => {
      setState((prev) => ({ ...prev, error: null }));
      try {
        return await cognitoAuthRepository.initiateForgotPassword(identifier);
      } catch (error) {
        setState((prev) => ({ ...prev, error: error as Error }));
        throw error;
      }
    },
    [],
  );

  const confirmForgotPassword = useCallback(
    async (identifier: string, code: string, newPassword: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        await cognitoAuthRepository.confirmForgotPassword(
          identifier,
          code,
          newPassword,
        );
        setState((prev) => ({ ...prev, loading: false }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [],
  );

  const getOAuthSignInUrl = useCallback(
    async (provider: SocialProvider, redirectUri: string) =>
      cognitoAuthRepository.getOAuthSignInUrl(provider, redirectUri),
    [],
  );

  const handleOAuthCallback = useCallback(
    async (
      code: string,
      codeVerifier: string,
      redirectUri: string,
      provider?: SocialProvider,
      deviceLocale?: string,
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const session = await cognitoAuthRepository.handleOAuthCallback(
          code,
          codeVerifier,
          redirectUri,
        );
        let user = await cognitoAuthRepository.getCurrentUser();

        // Sync locale for social sign-in users (non-critical).
        if (provider && deviceLocale && !user?.locale) {
          try {
            await cognitoAuthRepository.updateUserAttribute(
              'locale',
              deviceLocale,
            );
            // Re-fetch to pick up updated locale
            user = await cognitoAuthRepository.getCurrentUser();
          } catch {
            // Locale sync failed — not critical
          }
        }

        setState({
          session,
          user,
          pendingChallenge: null,
          loading: false,
          error: null,
        });
        scheduleRefresh(session);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [scheduleRefresh],
  );

  const updateUserAttribute = useCallback(
    async (name: string, value: string) =>
      cognitoAuthRepository.updateUserAttribute(name, value),
    [],
  );

  const associateSoftwareToken = useCallback(
    (session: string) => cognitoAuthRepository.associateSoftwareToken(session),
    [],
  );

  const verifySoftwareToken = useCallback(
    async (session: string, code: string, deviceName: string) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const authSession = await cognitoAuthRepository.verifySoftwareToken(
          session,
          code,
          deviceName,
        );
        const user = await cognitoAuthRepository.getCurrentUser();
        setState({
          session: authSession,
          user,
          pendingChallenge: null,
          loading: false,
          error: null,
        });
        scheduleRefresh(authSession);
      } catch (error) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error as Error,
        }));
        throw error;
      }
    },
    [scheduleRefresh],
  );

  const clearError = useCallback(
    () => setState((prev) => ({ ...prev, error: null })),
    [],
  );

  const clearPendingChallenge = useCallback(
    () => setState((prev) => ({ ...prev, pendingChallenge: null })),
    [],
  );

  const value: AuthContextValue = {
    ...state,
    signIn,
    signOut,
    signUp,
    confirmSignUp,
    resendConfirmation,
    respondToNewPassword,
    respondToMfa,
    initiateForgotPassword,
    confirmForgotPassword,
    getOAuthSignInUrl,
    handleOAuthCallback,
    updateUserAttribute,
    associateSoftwareToken,
    verifySoftwareToken,
    clearError,
    clearPendingChallenge,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
