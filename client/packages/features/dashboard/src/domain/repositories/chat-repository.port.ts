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

/**
 * Port consumed by the chat UI. The dashboard package implements it with
 * `ChatApiRepository` (HTTP via `ApiClient`); tests can drop in a mock.
 */
export interface ChatRepositoryPort {
  sendMessage(input: SendChatMessageInput): Promise<SendChatMessageAck>;
  confirmExpense(input: ConfirmExpenseInput): Promise<ConfirmExpenseResult>;
}
