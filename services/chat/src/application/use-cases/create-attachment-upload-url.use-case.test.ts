import { CreateAttachmentUploadUrlUseCase } from './create-attachment-upload-url.use-case';
import type { AttachmentStorageService } from '@services/chat/domain/services/attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';

const USER_ID = 'user-123';

const makeStorage = (): jest.Mocked<AttachmentStorageService> => ({
  createUploadUrl: jest.fn().mockResolvedValue({
    uploadUrl: 'https://bucket.s3.amazonaws.com/signed',
    s3Key: `chat-attachments/${USER_ID}/8f14e45f.jpg`,
    expiresIn: 300,
    attachmentType: 'image',
  }),
  // Present to satisfy the port; this use case must never touch it.
  createDownloadUrl: jest.fn(),
});

describe('CreateAttachmentUploadUrlUseCase', () => {
  it('presigns an upload scoped to the authenticated user', async () => {
    const storage = makeStorage();

    const result = await new CreateAttachmentUploadUrlUseCase(storage).execute(
      { contentType: 'image/jpeg' },
      USER_ID,
    );

    expect(storage.createUploadUrl).toHaveBeenCalledWith({
      userId: USER_ID,
      contentType: 'image/jpeg',
    });
    expect(result.s3Key).toContain(USER_ID);
    expect(result.attachmentType).toBe('image');
  });

  it('rejects a missing contentType with a 400', async () => {
    const storage = makeStorage();

    await expect(
      new CreateAttachmentUploadUrlUseCase(storage).execute(
        { contentType: '' },
        USER_ID,
      ),
    ).rejects.toThrow(BadRequestError);

    expect(storage.createUploadUrl).not.toHaveBeenCalled();
  });

  it('takes the user id from the caller, ignoring anything in the payload', async () => {
    const storage = makeStorage();

    await new CreateAttachmentUploadUrlUseCase(storage).execute(
      { contentType: 'image/png', userId: 'spoofed' } as never,
      USER_ID,
    );

    expect(storage.createUploadUrl).toHaveBeenCalledWith({
      userId: USER_ID,
      contentType: 'image/png',
    });
  });
});
