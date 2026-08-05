import type {
  ChatHistoryMessage,
  ChatRepositoryPort,
  CreateAttachmentUrlResult,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
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
  attachment_s3_key: string | null;
  attachment_type: 'image' | 'audio' | null;
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
    if (input.attachmentS3Key !== undefined) {
      body.attachmentS3Key = input.attachmentS3Key;
      body.attachmentType = input.attachmentType ?? 'image';
    }
    const response = await this.api.post<ApiResponse<SendChatMessageAck>>(
      '/chat',
      body,
    );
    return response.data;
  }

  async createUploadUrl(
    input: CreateUploadUrlInput,
  ): Promise<CreateUploadUrlResult> {
    const response = await this.api.post<ApiResponse<CreateUploadUrlResult>>(
      '/chat/upload-url',
      { contentType: input.contentType },
    );
    return response.data;
  }

  async uploadAttachment(
    uploadUrl: string,
    blob: Blob,
    contentType: string,
  ): Promise<void> {
    // Deliberately NOT through `ApiClient`: this goes straight to S3, so it
    // must carry no Authorization header (the signature is in the URL) and no
    // JSON Content-Type. `Content-Type` MUST match what was presigned, or S3
    // rejects the PUT with a signature mismatch.
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: blob,
    });

    if (!response.ok) {
      throw new Error(
        `Attachment upload failed with ${response.status} ${response.statusText}`,
      );
    }
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
      // The backend has always returned these; the mapper used to drop them,
      // which is why a restored conversation showed no photos.
      attachmentS3Key: m.attachment_s3_key ?? null,
      attachmentType: m.attachment_type ?? null,
    }));
  }

  async createAttachmentUrl(s3Key: string): Promise<CreateAttachmentUrlResult> {
    const response = await this.api.post<
      ApiResponse<CreateAttachmentUrlResult>
    >('/chat/attachment-url', { s3Key });
    return response.data;
  }
}
