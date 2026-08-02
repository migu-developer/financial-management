import {
  IDLE_ATTACHMENT,
  applyAttachmentEvent,
  isAttachmentBusy,
  prepareAttachmentUpload,
  type ChatAttachmentState,
} from './chat-attachment';

const mockOptimize = jest.fn();

// The class has to be declared INSIDE the factory: `jest.mock` is hoisted above
// every module-scope declaration, so referencing an outer class here throws
// "Cannot access before initialization".
jest.mock('@packages/utils', () => {
  class MockUnsupportedImageError extends Error {
    constructor(
      message: string,
      readonly reason: string,
    ) {
      super(message);
      this.name = 'UnsupportedImageError';
    }
  }
  return {
    optimizeImageForUpload: (...args: unknown[]) => mockOptimize(...args),
    UnsupportedImageError: MockUnsupportedImageError,
  };
});

const { UnsupportedImageError: MockUnsupportedImageError } = jest.requireMock(
  '@packages/utils',
) as { UnsupportedImageError: new (message: string, reason: string) => Error };

const UPLOAD_KEY = 'chat-attachments/user-1/abc.jpg';
const READY_KEY = 'chat-ready/user-1/abc.jpg';

const MESSAGES = {
  unsupported: 'unsupported-copy',
  uploadFailed: 'upload-failed-copy',
  timedOut: 'timed-out-copy',
};

const BASE: ChatAttachmentState = {
  status: 'preparing',
  previewUri: 'blob:preview',
  fileName: 'receipt.jpg',
};

const FILE = { name: 'receipt.jpg', type: 'image/jpeg', size: 1000 } as File;

const makeRepository = () => ({
  createUploadUrl: jest.fn().mockResolvedValue({
    uploadUrl: 'https://s3.example/signed',
    s3Key: UPLOAD_KEY,
    expiresIn: 300,
    attachmentType: 'image' as const,
  }),
  uploadAttachment: jest.fn().mockResolvedValue(undefined),
});

beforeEach(() => {
  jest.clearAllMocks();
  mockOptimize.mockResolvedValue({
    blob: { size: 900 } as Blob,
    contentType: 'image/jpeg',
    width: 1200,
    height: 1600,
    outcome: 'passthrough',
  });
});

describe('isAttachmentBusy', () => {
  it.each(['preparing', 'uploading', 'processing'] as const)(
    'blocks sending while %s',
    (status) => expect(isAttachmentBusy(status)).toBe(true),
  );

  it.each(['idle', 'ready', 'error'] as const)(
    'does not block while %s',
    (status) => expect(isAttachmentBusy(status)).toBe(false),
  );
});

describe('prepareAttachmentUpload', () => {
  it('optimizes, presigns and uploads, then WAITS for the server', async () => {
    const repository = makeRepository();

    const result = await prepareAttachmentUpload(
      { repository, messages: MESSAGES },
      FILE,
      BASE,
    );

    expect(repository.createUploadUrl).toHaveBeenCalledWith({
      contentType: 'image/jpeg',
    });
    // Content-Type MUST match what was presigned or S3 rejects the PUT.
    expect(repository.uploadAttachment).toHaveBeenCalledWith(
      'https://s3.example/signed',
      { size: 900 },
      'image/jpeg',
    );
    // Uploading is NOT the end: the key only becomes usable once the server
    // publishes `attachment_ready`.
    expect(result.status).toBe('processing');
    expect(result.uploadKey).toBe(UPLOAD_KEY);
    // The preview survives so the chip keeps showing the thumbnail.
    expect(result.previewUri).toBe('blob:preview');
  });

  it('uploads whatever content type the optimizer produced', async () => {
    const repository = makeRepository();
    mockOptimize.mockResolvedValue({
      blob: { size: 500 } as Blob,
      contentType: 'image/png',
      width: 10,
      height: 10,
      outcome: 'passthrough',
    });

    await prepareAttachmentUpload(
      { repository, messages: MESSAGES },
      FILE,
      BASE,
    );

    expect(repository.createUploadUrl).toHaveBeenCalledWith({
      contentType: 'image/png',
    });
    expect(repository.uploadAttachment).toHaveBeenCalledWith(
      expect.any(String),
      expect.anything(),
      'image/png',
    );
  });

  it('reports HEIC WITHOUT ever uploading', async () => {
    const repository = makeRepository();
    mockOptimize.mockRejectedValue(
      new MockUnsupportedImageError('no HEVC decoder', 'heic'),
    );

    const result = await prepareAttachmentUpload(
      { repository, messages: MESSAGES },
      FILE,
      BASE,
    );

    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe(MESSAGES.unsupported);
    // Failing in the browser saves the user an upload plus a server round trip.
    expect(repository.createUploadUrl).not.toHaveBeenCalled();
    expect(repository.uploadAttachment).not.toHaveBeenCalled();
  });

  it('reports a presign failure without leaking the raw error', async () => {
    const repository = makeRepository();
    repository.createUploadUrl.mockRejectedValue(new Error('401'));
    const onUnexpectedError = jest.fn();

    const result = await prepareAttachmentUpload(
      { repository, messages: MESSAGES, onUnexpectedError },
      FILE,
      BASE,
    );

    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe(MESSAGES.uploadFailed);
    expect(onUnexpectedError).toHaveBeenCalled();
  });

  it('reports a rejected S3 PUT', async () => {
    const repository = makeRepository();
    repository.uploadAttachment.mockRejectedValue(new Error('403 signature'));

    const result = await prepareAttachmentUpload(
      { repository, messages: MESSAGES },
      FILE,
      BASE,
    );

    expect(result.status).toBe('error');
    expect(result.errorMessage).toBe(MESSAGES.uploadFailed);
  });

  it('treats an unexpected optimizer crash as an upload failure, not HEIC', async () => {
    const repository = makeRepository();
    mockOptimize.mockRejectedValue(new TypeError('canvas exploded'));

    const result = await prepareAttachmentUpload(
      { repository, messages: MESSAGES },
      FILE,
      BASE,
    );

    expect(result.errorMessage).toBe(MESSAGES.uploadFailed);
  });
});

describe('applyAttachmentEvent', () => {
  const processing: ChatAttachmentState = {
    ...BASE,
    status: 'processing',
    uploadKey: UPLOAD_KEY,
  };

  it('marks the attachment ready and stores the NORMALIZED key', () => {
    const next = applyAttachmentEvent(processing, UPLOAD_KEY, {
      type: 'attachment_ready',
      uploadKey: UPLOAD_KEY,
      readyKey: READY_KEY,
    });

    expect(next?.status).toBe('ready');
    // The backend rejects the raw upload key — only this one is accepted.
    expect(next?.readyKey).toBe(READY_KEY);
  });

  it('surfaces the server rejection copy verbatim', () => {
    const next = applyAttachmentEvent(processing, UPLOAD_KEY, {
      type: 'attachment_rejected',
      uploadKey: UPLOAD_KEY,
      content: 'No pude procesar esa imagen.',
    });

    expect(next?.status).toBe('error');
    expect(next?.errorMessage).toBe('No pude procesar esa imagen.');
  });

  it('IGNORES an event for an attachment already replaced', () => {
    const next = applyAttachmentEvent(processing, UPLOAD_KEY, {
      type: 'attachment_ready',
      uploadKey: 'chat-attachments/user-1/STALE.jpg',
      readyKey: 'chat-ready/user-1/STALE.jpg',
    });

    // A slow first upload must not overwrite the current one.
    expect(next).toBeNull();
  });

  it('ignores everything once the attachment was cleared', () => {
    const next = applyAttachmentEvent(IDLE_ATTACHMENT, undefined, {
      type: 'attachment_ready',
      uploadKey: UPLOAD_KEY,
      readyKey: READY_KEY,
    });

    expect(next).toBeNull();
  });

  it('keeps the preview so the chip does not flicker on transition', () => {
    const next = applyAttachmentEvent(processing, UPLOAD_KEY, {
      type: 'attachment_ready',
      uploadKey: UPLOAD_KEY,
      readyKey: READY_KEY,
    });

    expect(next?.previewUri).toBe('blob:preview');
    expect(next?.fileName).toBe('receipt.jpg');
  });
});
