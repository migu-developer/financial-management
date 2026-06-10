import { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import type {
  StartChatWorkflowInput,
  StartChatWorkflowResult,
  WorkflowStarterService,
} from '@services/chat/domain/services/workflow-starter.service';
import { DataNotDefinedError } from '@packages/models/shared/utils/errors';

/**
 * AWS Step Functions adapter for `WorkflowStarterService`.
 * Calls `StartExecution` on the ChatProcess state machine asynchronously
 * (Standard workflows do not block the caller).
 *
 * The state machine ARN is provided via the `CHAT_STATE_MACHINE_ARN`
 * environment variable, set by the CDK stack.
 */
export class SfnWorkflowStarter implements WorkflowStarterService {
  constructor(
    private readonly stateMachineArn: string,
    private readonly client: SFNClient = new SFNClient({}),
  ) {}

  async start(input: StartChatWorkflowInput): Promise<StartChatWorkflowResult> {
    if (!this.stateMachineArn) {
      throw new DataNotDefinedError(
        'CHAT_STATE_MACHINE_ARN is not configured. The chat workflow cannot be started.',
      );
    }

    const command = new StartExecutionCommand({
      stateMachineArn: this.stateMachineArn,
      name: input.messageId,
      input: JSON.stringify(input),
    });

    const response = await this.client.send(command);

    if (!response.executionArn || !response.startDate) {
      throw new DataNotDefinedError(
        'Step Functions did not return an executionArn / startDate',
      );
    }

    return {
      executionArn: response.executionArn,
      startDate: response.startDate.toISOString(),
    };
  }
}
