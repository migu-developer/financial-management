/**
 * Payload published over AppSync Events so the client can render
 * the assistant's response in real time.
 */
export interface ChatMessageEventPayload {
  type: 'assistant_message' | 'preview_pending' | 'preview_resolved' | 'error';
  sessionId: string;
  messageId: string;
  content: string;
  /** Present only when `type === 'preview_pending'`. */
  taskToken?: string;
  /** Present when an expense was attached to the message. */
  expenseId?: string;
}

/**
 * Payload published when an uploaded attachment finishes normalization.
 *
 * NOT session-scoped: it is emitted before any chat message exists, so it
 * carries no `sessionId`. The client correlates on `uploadKey`, which it holds
 * from the `POST /chat/upload-url` response, and must handle these events
 * BEFORE the active-session filter that message events go through — otherwise
 * the filter would drop them.
 *
 * `attachment_ready` carries the `readyKey` to send as `attachmentS3Key` on
 * `POST /chat`. `attachment_rejected` means the image could not be processed
 * (e.g. HEIC from a browser) and `content` is a user-facing explanation.
 */
export interface AttachmentEventPayload {
  type: 'attachment_ready' | 'attachment_rejected';
  /** Key the client uploaded to — the correlation id. */
  uploadKey: string;
  /** Present only when `type === 'attachment_ready'`. */
  readyKey?: string;
  /** User-facing message; present when rejected. */
  content?: string;
  width?: number;
  height?: number;
}

export type ChatEventPayload = ChatMessageEventPayload | AttachmentEventPayload;

/**
 * Port for publishing chat events to AppSync. The adapter signs the
 * HTTPS request with SigV4 so it can use the IAM auth provider of the
 * Event API.
 */
export interface EventPublisherService {
  publish(channel: string, payload: ChatEventPayload): Promise<void>;
}
