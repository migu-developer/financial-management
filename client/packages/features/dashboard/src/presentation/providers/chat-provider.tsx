import React, {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';

import { ApiClient } from '@features/dashboard/infrastructure/api/api-client';
import { ChatApiRepository } from '@features/dashboard/infrastructure/api/chat-api-repository';
import type { ChatRepositoryPort } from '@features/dashboard/domain/repositories/chat-repository.port';

export interface ChatContextValue {
  /** Repository used by the chat drawer to call `POST /chat` / `POST /chat/confirm`. */
  chatRepository: ChatRepositoryPort;
  /** Authenticated user id used as the WebSocket channel scope. */
  userId: string;
  /** AppSync Events realtime DNS (no protocol, no path). */
  appSyncRealtimeDns: string;
  /** AppSync Events namespace (e.g. 'chat'). */
  appSyncNamespace: string;
  /** Returns the latest Cognito id token for the WebSocket auth. */
  getAuthToken: () => Promise<string | null>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return ctx;
}

export interface ChatProviderProps {
  children: ReactNode;
  /** REST API base URL (same as ExpenseProvider). */
  apiBaseUrl: string;
  /** Returns the Cognito id token. Same shape as ExpenseProvider's `getToken`. */
  getToken: () => Promise<string | null>;
  /** Cognito `sub` of the authenticated user. */
  userId: string;
  /** AppSync Events realtime DNS. */
  appSyncRealtimeDns: string;
  /** AppSync Events namespace. */
  appSyncNamespace: string;
}

/**
 * Wires the chat drawer with the backend. Place at the screen level next
 * to `ExpenseProvider`; the drawer consumes this via `useChatContext()`.
 */
export function ChatProvider({
  children,
  apiBaseUrl,
  getToken,
  userId,
  appSyncRealtimeDns,
  appSyncNamespace,
}: ChatProviderProps) {
  const value = useMemo<ChatContextValue>(() => {
    const apiClient = new ApiClient(apiBaseUrl, getToken);
    return {
      chatRepository: new ChatApiRepository(apiClient),
      userId,
      appSyncRealtimeDns,
      appSyncNamespace,
      getAuthToken: getToken,
    };
  }, [apiBaseUrl, getToken, userId, appSyncRealtimeDns, appSyncNamespace]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
