/**
 * Server-side ACK returned by `POST /chat`. The actual assistant response
 * arrives later over the AppSync Events WebSocket.
 */
export interface SendChatMessageAck {
  status: 'processing';
  sessionId: string;
  messageId: string;
  executionArn: string;
}

export interface SendChatMessageInput {
  /** Reuses an existing session if provided; otherwise the backend creates one. */
  sessionId?: string;
  content: string;
}

export interface ConfirmExpenseInput {
  taskToken: string;
  confirmed: boolean;
}

export interface ConfirmExpenseResult {
  status: 'confirmed' | 'cancelled' | 'expired' | string;
  messageId: string;
}

/** Lifecycle of an assistant preview that required confirmation. */
export type ChatTaskTokenStatus =
  | 'pending'
  | 'confirmed'
  | 'cancelled'
  | 'expired'
  | 'superseded';

/** A session summary for the sidebar (newest activity first). */
export interface ChatSessionSummary {
  id: string;
  startedAt: string;
  lastMessageAt: string;
  /** Snippet of the first user message; used as a title. */
  preview: string | null;
  messageCount: number;
}

/** A persisted message used to restore a conversation. */
export interface ChatHistoryMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  taskToken: string | null;
  taskTokenStatus: ChatTaskTokenStatus | null;
  createdAt: string;
}

/**
 * Port consumed by the chat UI. The dashboard package implements it with
 * `ChatApiRepository` (HTTP via `ApiClient`); tests can drop in a mock.
 */
export interface ChatRepositoryPort {
  sendMessage(input: SendChatMessageInput): Promise<SendChatMessageAck>;
  confirmExpense(input: ConfirmExpenseInput): Promise<ConfirmExpenseResult>;
  /** Lists the user's chat sessions for the sidebar (newest first). */
  listSessions(): Promise<ChatSessionSummary[]>;
  /** Returns a session's messages (oldest → newest) to restore it. */
  getSessionMessages(sessionId: string): Promise<ChatHistoryMessage[]>;
}
