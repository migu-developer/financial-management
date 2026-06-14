import type {
  ChatHistoryMessage,
  ChatRepositoryPort,
  ChatSessionSummary,
  ChatTaskTokenStatus,
  ConfirmExpenseInput,
  ConfirmExpenseResult,
  SendChatMessageAck,
  SendChatMessageInput,
} from '@features/dashboard/domain/repositories/chat-repository.port';
import type { ApiClient } from './api-client';

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/** Raw session summary as returned by `GET /chat/sessions` (snake_case). */
interface RawSessionSummary {
  id: string;
  started_at: string;
  last_message_at: string;
  preview: string | null;
  message_count: number;
}

/** Raw message row as returned by the backend (snake_case). */
interface RawChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  task_token: string | null;
  task_token_status: ChatTaskTokenStatus | null;
  created_at: string;
}

/**
 * Adapter for the chat backend endpoints.
 *
 * `POST /chat` returns a 200 with `{ data: { status: 'processing', ... } }`.
 * The real assistant reply arrives later through the AppSync Events
 * WebSocket subscription — see `AppSyncEventsClient`.
 */
export class ChatApiRepository implements ChatRepositoryPort {
  constructor(private readonly api: ApiClient) {}

  async sendMessage(input: SendChatMessageInput): Promise<SendChatMessageAck> {
    const body: Record<string, unknown> = { content: input.content };
    if (input.sessionId !== undefined) {
      body.sessionId = input.sessionId;
    }
    const response = await this.api.post<ApiResponse<SendChatMessageAck>>(
      '/chat',
      body,
    );
    return response.data;
  }

  async confirmExpense(
    input: ConfirmExpenseInput,
  ): Promise<ConfirmExpenseResult> {
    const response = await this.api.post<ApiResponse<ConfirmExpenseResult>>(
      '/chat/confirm',
      { taskToken: input.taskToken, confirmed: input.confirmed },
    );
    return response.data;
  }

  async listSessions(): Promise<ChatSessionSummary[]> {
    const response =
      await this.api.get<ApiResponse<{ sessions: RawSessionSummary[] }>>(
        '/chat/sessions',
      );
    return response.data.sessions.map((s) => ({
      id: s.id,
      startedAt: s.started_at,
      lastMessageAt: s.last_message_at,
      preview: s.preview,
      messageCount: s.message_count,
    }));
  }

  async getSessionMessages(sessionId: string): Promise<ChatHistoryMessage[]> {
    const response = await this.api.get<
      ApiResponse<{ messages: RawChatMessage[] }>
    >(`/chat/sessions/${encodeURIComponent(sessionId)}/messages`);
    return response.data.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      taskToken: m.task_token,
      taskTokenStatus: m.task_token_status,
      createdAt: m.created_at,
    }));
  }
}
