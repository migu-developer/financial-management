/**
 * Real-time event delivered over the AppSync Events WebSocket. Mirrors
 * the `ChatEventPayload` produced by the backend chat workflow.
 */
export type ChatEvent = ChatMessageEvent | AttachmentEvent;

/** Events tied to a conversation. Always carry a `sessionId`. */
export type ChatMessageEvent =
  | {
      type: 'assistant_message';
      sessionId: string;
      messageId: string;
      content: string;
      expenseId?: string;
    }
  | {
      type: 'preview_pending';
      sessionId: string;
      messageId: string;
      content: string;
      taskToken: string;
    }
  | {
      type: 'preview_resolved';
      sessionId: string;
      messageId: string;
      content: string;
    }
  | {
      type: 'error';
      sessionId: string;
      messageId: string;
      content: string;
    };

/**
 * Attachment normalization finished. NOT session-scoped — emitted before any
 * chat message exists, so it carries no `sessionId` and MUST be handled BEFORE
 * the active-session filter that message events go through, or it is dropped.
 *
 * Correlated on `uploadKey`, which the client holds from the
 * `POST /chat/upload-url` response.
 */
export type AttachmentEvent =
  | {
      type: 'attachment_ready';
      uploadKey: string;
      /** Send this as `attachmentS3Key` on `POST /chat`. */
      readyKey: string;
      width?: number;
      height?: number;
    }
  | {
      type: 'attachment_rejected';
      uploadKey: string;
      /** User-facing explanation, already localized by the backend. */
      content: string;
    };
