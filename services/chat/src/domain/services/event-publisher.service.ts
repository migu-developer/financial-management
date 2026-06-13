/**
 * Payload published over AppSync Events so the client can render
 * the assistant's response in real time.
 */
export interface ChatEventPayload {
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
 * Port for publishing chat events to AppSync. The adapter signs the
 * HTTPS request with SigV4 so it can use the IAM auth provider of the
 * Event API.
 */
export interface EventPublisherService {
  publish(channel: string, payload: ChatEventPayload): Promise<void>;
}
