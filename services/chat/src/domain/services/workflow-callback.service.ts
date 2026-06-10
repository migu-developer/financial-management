/**
 * Outcome of a human-in-the-loop confirmation. The Step Function
 * Choice state inspects `confirmed` to decide whether to create the
 * expense or cancel.
 */
export interface WorkflowCallbackPayload {
  confirmed: boolean;
}

/**
 * Port for resuming a Step Function that is paused on a task token.
 * The concrete adapter (`SfnWorkflowCallback`) calls
 * `SendTaskSuccess` (or `SendTaskFailure` on errors).
 */
export interface WorkflowCallbackService {
  resume(taskToken: string, payload: WorkflowCallbackPayload): Promise<void>;
}
