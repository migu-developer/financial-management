const mockGetSegment = jest.fn();

jest.mock('@aws-lambda-powertools/tracer', () => ({
  Tracer: jest.fn().mockImplementation(() => ({
    getSegment: mockGetSegment,
  })),
}));

import { TracerServiceImplementation } from './TracerServiceImp';

interface FakeSubsegment {
  namespace?: string;
  addAnnotation: jest.Mock;
  addMetadata: jest.Mock;
  addError: jest.Mock;
  close: jest.Mock;
}

function makeSubsegment(): FakeSubsegment {
  return {
    addAnnotation: jest.fn(),
    addMetadata: jest.fn(),
    addError: jest.fn(),
    close: jest.fn(),
  };
}

describe('TracerServiceImplementation.traceRemote', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks the subsegment as a remote node named after the call', async () => {
    const subsegment = makeSubsegment();
    const addNewSubsegment = jest.fn().mockReturnValue(subsegment);
    mockGetSegment.mockReturnValue({ addNewSubsegment });

    const service = new TracerServiceImplementation('test');
    const result = await service.traceRemote('AppSyncEvents', () =>
      Promise.resolve('ok'),
    );

    expect(addNewSubsegment).toHaveBeenCalledWith('AppSyncEvents');
    expect(subsegment.namespace).toBe('remote');
    expect(subsegment.close).toHaveBeenCalledTimes(1);
    expect(result).toBe('ok');
  });

  it('attaches annotations and metadata on success', async () => {
    const subsegment = makeSubsegment();
    mockGetSegment.mockReturnValue({
      addNewSubsegment: () => subsegment,
    });

    const service = new TracerServiceImplementation('test');
    await service.traceRemote('AppSyncEvents', () => Promise.resolve('ok'), {
      annotations: { channel: 'chat/u/responses', httpStatus: 200 },
      metadata: { eventType: 'assistant_message' },
    });

    expect(subsegment.addAnnotation).toHaveBeenCalledWith(
      'channel',
      'chat/u/responses',
    );
    expect(subsegment.addAnnotation).toHaveBeenCalledWith('httpStatus', 200);
    expect(subsegment.addMetadata).toHaveBeenCalledWith('appsync', {
      eventType: 'assistant_message',
    });
  });

  it('records the error and closes the subsegment on failure', async () => {
    const subsegment = makeSubsegment();
    mockGetSegment.mockReturnValue({
      addNewSubsegment: () => subsegment,
    });
    const boom = new Error('boom');

    const service = new TracerServiceImplementation('test');
    await expect(
      service.traceRemote('AppSyncEvents', () => Promise.reject(boom)),
    ).rejects.toThrow('boom');

    expect(subsegment.addError).toHaveBeenCalledWith(boom);
    expect(subsegment.close).toHaveBeenCalledTimes(1);
    expect(subsegment.addAnnotation).not.toHaveBeenCalled();
  });

  it('runs the function directly when there is no active segment', async () => {
    mockGetSegment.mockReturnValue(undefined);

    const service = new TracerServiceImplementation('test');
    const fn = jest.fn().mockResolvedValue('direct');
    const result = await service.traceRemote('AppSyncEvents', fn);

    expect(result).toBe('direct');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
