import { SFNClient, SendTaskSuccessCommand } from '@aws-sdk/client-sfn';
import type {
  WorkflowCallbackPayload,
  WorkflowCallbackService,
} from '@services/chat/domain/services/workflow-callback.service';

/**
 * AWS Step Functions adapter for `WorkflowCallbackService`.
 * Resumes a paused execution via `SendTaskSuccess` with the user's
 * confirmation decision serialized as JSON output.
 */
export class SfnWorkflowCallback implements WorkflowCallbackService {
  constructor(private readonly client: SFNClient = new SFNClient({})) {}

  async resume(
    taskToken: string,
    payload: WorkflowCallbackPayload,
  ): Promise<void> {
    await this.client.send(
      new SendTaskSuccessCommand({
        taskToken,
        output: JSON.stringify(payload),
      }),
    );
  }
}
