import type { SFNClient, SendTaskSuccessCommand } from '@aws-sdk/client-sfn';
import { SfnWorkflowCallback } from './sfn-workflow-callback.service';

describe('SfnWorkflowCallback', () => {
  it('sends SendTaskSuccess with the token and the JSON payload', async () => {
    const send = jest.fn().mockResolvedValue({});
    const callback = new SfnWorkflowCallback({
      send,
    } as unknown as SFNClient);

    await callback.resume('token-1', { confirmed: true });

    const [command] = send.mock.calls[0] as [SendTaskSuccessCommand];
    expect(command.input.taskToken).toBe('token-1');
    expect(JSON.parse(command.input.output!)).toEqual({ confirmed: true });
  });

  it('propagates client errors (e.g. expired token)', async () => {
    const send = jest.fn().mockRejectedValue(new Error('TaskTimedOut'));
    const callback = new SfnWorkflowCallback({
      send,
    } as unknown as SFNClient);

    await expect(
      callback.resume('token-1', { confirmed: false }),
    ).rejects.toThrow('TaskTimedOut');
  });
});
