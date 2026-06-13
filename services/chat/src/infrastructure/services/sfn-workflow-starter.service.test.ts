import type { SFNClient, StartExecutionCommand } from '@aws-sdk/client-sfn';
import { SfnWorkflowStarter } from './sfn-workflow-starter.service';

function makeMockClient(send: jest.Mock): SFNClient {
  return { send } as unknown as SFNClient;
}

const INPUT = {
  messageId: 'msg-1',
  sessionId: 'sess-1',
  userId: 'uid-1',
  userEmail: 'a@b.c',
  content: 'Hola',
  history: '',
};

describe('SfnWorkflowStarter', () => {
  it('starts the execution with the message id as execution name', async () => {
    const send = jest.fn().mockResolvedValue({
      executionArn: 'arn:exec',
      startDate: new Date('2026-06-10T00:00:00Z'),
    });
    const starter = new SfnWorkflowStarter('arn:sm', makeMockClient(send));

    const result = await starter.start(INPUT);

    const [command] = send.mock.calls[0] as [StartExecutionCommand];
    expect(command.input.stateMachineArn).toBe('arn:sm');
    expect(command.input.name).toBe('msg-1');
    expect(JSON.parse(command.input.input!)).toMatchObject({
      userId: 'uid-1',
      content: 'Hola',
    });
    expect(result).toEqual({
      executionArn: 'arn:exec',
      startDate: '2026-06-10T00:00:00.000Z',
    });
  });

  it('throws when the state machine ARN is not configured', async () => {
    const starter = new SfnWorkflowStarter('', makeMockClient(jest.fn()));
    await expect(starter.start(INPUT)).rejects.toThrow(
      'CHAT_STATE_MACHINE_ARN is not configured',
    );
  });

  it('throws when Step Functions returns no executionArn', async () => {
    const send = jest.fn().mockResolvedValue({});
    const starter = new SfnWorkflowStarter('arn:sm', makeMockClient(send));
    await expect(starter.start(INPUT)).rejects.toThrow(
      'did not return an executionArn',
    );
  });
});
