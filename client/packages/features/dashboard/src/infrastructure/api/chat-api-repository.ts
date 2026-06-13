import type {
  ChatRepositoryPort,
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
}
