/**
 * Input payload sent to the ChatProcess Step Function when a new
 * chat message arrives. The state machine reads these fields to
 * route the request through the intent → extract → respond pipeline.
 */
export interface StartChatWorkflowInput {
  messageId: string;
  sessionId: string;
  userId: string;
  userEmail: string;
  content: string;
  /**
   * Recent conversation transcript (oldest → newest, excluding the current
   * message) injected into the intent/extraction prompts so multi-turn flows
   * work — short replies are understood in context and CREATE fields
   * accumulate across turns. Empty string for the first message of a session.
   */
  history: string;
  attachmentS3Key?: string;
  attachmentType?: 'image' | 'audio';
  /**
   * Rendered block describing a receipt read on an EARLIER turn of this session,
   * or '' when there is none.
   *
   * A STRING, always present, deliberately mirroring `history`: the state
   * machine interpolates it with `States.Format`, which cannot serialize an
   * object and raises `States.Runtime` on a missing path. An empty string keeps
   * the prompts branch-free.
   *
   * This is what makes a receipt follow-up work: both the intent classifier and
   * the field extractor see the merchant, total and date already read from the
   * image, so a one-word answer like "COP" is understood as continuing that
   * expense — and the attachment is never analyzed twice.
   */
  priorReceipt: string;
}

/**
 * Result of starting a Step Function execution.
 */
export interface StartChatWorkflowResult {
  executionArn: string;
  startDate: string;
}

/**
 * Port for kicking off the async chat workflow. The concrete adapter
 * (`SfnWorkflowStarter`) calls `StartExecution` on the ChatProcess
 * state machine. Returning a port lets us mock it cleanly in unit tests.
 */
export interface WorkflowStarterService {
  start(input: StartChatWorkflowInput): Promise<StartChatWorkflowResult>;
}
