/**
 * Outcome of a human-in-the-loop confirmation. The Step Function
 * Choice state inspects `confirmed` to decide whether to create the
 * expense or cancel.
 */
export interface WorkflowCallbackPayload {
  confirmed: boolean;
  /**
   * Set when the preview was released because the user iterated on it
   * (sent a new message while it was still pending). The Choice state
   * routes a superseded resume to a silent Succeed — no expense is
   * created and nothing is published to the client.
   */
  superseded?: boolean;
}

/**
 * Port for resuming a Step Function that is paused on a task token.
 * The concrete adapter (`SfnWorkflowCallback`) calls
 * `SendTaskSuccess` (or `SendTaskFailure` on errors).
 */
export interface WorkflowCallbackService {
  resume(taskToken: string, payload: WorkflowCallbackPayload): Promise<void>;
}
