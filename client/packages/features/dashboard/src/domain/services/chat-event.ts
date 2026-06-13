/**
 * Real-time event delivered over the AppSync Events WebSocket. Mirrors
 * the `ChatEventPayload` produced by the backend chat workflow.
 */
export type ChatEvent =
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
