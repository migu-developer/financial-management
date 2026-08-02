import {
  ConvertAttachmentImageUseCase,
  ProbeAttachmentImageUseCase,
} from './normalize-attachment-image.use-case';
import type { ImageNormalizerService } from '@services/chat/domain/services/image-normalizer.service';
import { UnreadableImageError } from '@services/chat/domain/services/image-normalizer.service';
import type { ObjectStorageService } from '@services/chat/domain/services/object-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';

const USER = 'user-123';
const UPLOAD_JPG = `chat-attachments/${USER}/8f14e45f.jpg`;
const UPLOAD_WEBP = `chat-attachments/${USER}/8f14e45f.webp`;

const makeStorage = (): jest.Mocked<ObjectStorageService> => ({
  get: jest.fn().mockResolvedValue(Buffer.from('fake-bytes')),
  put: jest.fn().mockResolvedValue(undefined),
  copy: jest.fn().mockResolvedValue(undefined),
});

const makeNormalizer = (
  probe?: Partial<Awaited<ReturnType<ImageNormalizerService['probe']>>>,
): jest.Mocked<ImageNormalizerService> => ({
  probe: jest.fn().mockResolvedValue({
    format: 'jpeg',
    width: 1200,
    height: 1600,
    bytes: 480_000,
    textractReady: true,
    reasons: [],
    ...probe,
  }),
  normalize: jest.fn().mockResolvedValue({
    body: Buffer.from('converted'),
    contentType: 'image/jpeg',
    width: 900,
    height: 700,
    bytes: 96_000,
  }),
});

describe('ProbeAttachmentImageUseCase', () => {
  it('decides passthrough for an already Textract-ready image', async () => {
    const result = await new ProbeAttachmentImageUseCase(
      makeStorage(),
      makeNormalizer(),
    ).execute({ uploadKey: UPLOAD_JPG });

    expect(result.decision).toBe('passthrough');
    expect(result.userId).toBe(USER);
    // A passthrough copies the bytes unchanged, so the extension is the
    // UPLOAD's — not sharp's format name, which would turn `.jpg` into `.jpeg`.
    expect(result.readyKey).toBe(`chat-ready/${USER}/8f14e45f.jpg`);
  });

  it('keeps a PNG passthrough as .png', async () => {
    const result = await new ProbeAttachmentImageUseCase(
      makeStorage(),
      makeNormalizer({ format: 'png' }),
    ).execute({ uploadKey: `chat-attachments/${USER}/shot.png` });

    expect(result.decision).toBe('passthrough');
    expect(result.readyKey).toBe(`chat-ready/${USER}/shot.png`);
  });

  it('decides convert and targets a .jpg ready key', async () => {
    const result = await new ProbeAttachmentImageUseCase(
      makeStorage(),
      makeNormalizer({
        format: 'webp',
        textractReady: false,
        reasons: ['format-not-accepted'],
      }),
    ).execute({ uploadKey: UPLOAD_WEBP });

    expect(result.decision).toBe('convert');
    expect(result.reasons).toEqual(['format-not-accepted']);
    // The rewrite is always JPEG, so the extension changes.
    expect(result.readyKey).toBe(`chat-ready/${USER}/8f14e45f.jpg`);
  });

  it('reports an undecodable image as a DECISION, never as a throw', async () => {
    const normalizer = makeNormalizer();
    normalizer.probe.mockRejectedValue(
      new UnreadableImageError('unsupported image format'),
    );

    const result = await new ProbeAttachmentImageUseCase(
      makeStorage(),
      normalizer,
    ).execute({ uploadKey: `chat-attachments/${USER}/photo.heic` });

    // This is THE reason it does not throw: a HEIC a user sent from a browser
    // must end the execution SUCCEEDED so it never trips ExecutionsFailed.
    expect(result.decision).toBe('unsupported');
    expect(result.reasons[0]).toContain('unsupported image format');
  });

  it('propagates a genuine infrastructure failure so the catch-all fires', async () => {
    const normalizer = makeNormalizer();
    normalizer.probe.mockRejectedValue(new Error('OOM'));

    await expect(
      new ProbeAttachmentImageUseCase(makeStorage(), normalizer).execute({
        uploadKey: UPLOAD_JPG,
      }),
    ).rejects.toThrow('OOM');
  });

  it('rejects a key outside the upload prefix without reading anything', async () => {
    const storage = makeStorage();

    await expect(
      new ProbeAttachmentImageUseCase(storage, makeNormalizer()).execute({
        uploadKey: `chat-ready/${USER}/already-done.jpg`,
      }),
    ).rejects.toThrow(BadRequestError);

    expect(storage.get).not.toHaveBeenCalled();
  });
});

describe('ConvertAttachmentImageUseCase', () => {
  it('writes the normalized image to the ready key', async () => {
    const storage = makeStorage();
    const normalizer = makeNormalizer();

    const result = await new ConvertAttachmentImageUseCase(
      storage,
      normalizer,
    ).execute({
      uploadKey: UPLOAD_WEBP,
      readyKey: `chat-ready/${USER}/8f14e45f.jpg`,
    });

    expect(storage.get).toHaveBeenCalledWith(UPLOAD_WEBP);
    expect(storage.put).toHaveBeenCalledWith(
      `chat-ready/${USER}/8f14e45f.jpg`,
      Buffer.from('converted'),
      'image/jpeg',
    );
    expect(result).toEqual({
      readyKey: `chat-ready/${USER}/8f14e45f.jpg`,
      width: 900,
      height: 700,
      bytes: 96_000,
    });
  });

  it('never overwrites the original upload', async () => {
    const storage = makeStorage();

    await new ConvertAttachmentImageUseCase(storage, makeNormalizer()).execute({
      uploadKey: UPLOAD_WEBP,
      readyKey: `chat-ready/${USER}/8f14e45f.jpg`,
    });

    const writtenKeys = storage.put.mock.calls.map((c) => c[0]);
    expect(writtenKeys).not.toContain(UPLOAD_WEBP);
    expect(writtenKeys.every((k) => k.startsWith('chat-ready/'))).toBe(true);
  });
});
