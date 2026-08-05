import { CreateAttachmentDownloadUrlUseCase } from './create-attachment-download-url.use-case';
import type { AttachmentStorageService } from '@services/chat/domain/services/attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';

const USER_ID = 'user-123';
const READY_KEY = `chat-ready/${USER_ID}/8f14e45f.jpg`;

const makeStorage = (): jest.Mocked<AttachmentStorageService> => ({
  createUploadUrl: jest.fn(),
  createDownloadUrl: jest.fn().mockResolvedValue({
    downloadUrl: 'https://bucket.s3.amazonaws.com/signed-get',
    expiresIn: 3600,
  }),
});

describe('CreateAttachmentDownloadUrlUseCase', () => {
  it('presigns a read for the requested key', async () => {
    const storage = makeStorage();

    const result = await new CreateAttachmentDownloadUrlUseCase(
      storage,
    ).execute({ s3Key: READY_KEY }, USER_ID);

    expect(storage.createDownloadUrl).toHaveBeenCalledWith({
      userId: USER_ID,
      s3Key: READY_KEY,
    });
    expect(result.downloadUrl).toContain('signed-get');
  });

  it('rejects a missing s3Key with a 400', async () => {
    const storage = makeStorage();

    await expect(
      new CreateAttachmentDownloadUrlUseCase(storage).execute(
        { s3Key: '' },
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestError);

    expect(storage.createDownloadUrl).not.toHaveBeenCalled();
  });

  it('takes the user id from the caller, ignoring anything in the payload', async () => {
    const storage = makeStorage();

    await new CreateAttachmentDownloadUrlUseCase(storage).execute(
      { s3Key: READY_KEY, userId: 'spoofed' } as never,
      USER_ID,
    );

    // A body-supplied userId must never reach the adapter — otherwise the
    // ownership assertion downstream would be comparing the key against a
    // value the attacker controls.
    expect(storage.createDownloadUrl).toHaveBeenCalledWith({
      userId: USER_ID,
      s3Key: READY_KEY,
    });
  });
});
