import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  DOWNLOAD_URL_TTL_SECONDS,
  S3AttachmentStorage,
  UPLOAD_URL_TTL_SECONDS,
} from './s3-attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';

jest.mock('@services/shared/infrastructure/decorators/trace', () => ({
  trace: () => () => undefined,
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example/signed'),
}));

const BUCKET = 'fm-test-chat-attachments';
const USER = 'user-abc';
const OTHER_USER = 'user-xyz';

const mockGetSignedUrl = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;

/** The presigner is only ever handed a command; the client itself is inert. */
const makeStorage = () => new S3AttachmentStorage(BUCKET, {} as never);

/** Reads the command the adapter asked the presigner to sign. */
const signedCommand = () => mockGetSignedUrl.mock.calls[0]![1] as unknown;

describe('S3AttachmentStorage', () => {
  beforeEach(() => {
    mockGetSignedUrl.mockClear();
  });

  describe('createUploadUrl', () => {
    it('presigns a PutObject under the upload prefix, scoped to the owner', async () => {
      const result = await makeStorage().createUploadUrl({
        userId: USER,
        contentType: 'image/jpeg',
      });

      expect(signedCommand()).toBeInstanceOf(PutObjectCommand);
      expect(result.s3Key).toMatch(
        new RegExp(`^chat-attachments/${USER}/[0-9a-f-]+\\.jpg$`),
      );
      expect(result.expiresIn).toBe(UPLOAD_URL_TTL_SECONDS);
      expect(result.attachmentType).toBe('image');
    });

    it('rejects a content type outside the allow-list', async () => {
      await expect(
        makeStorage().createUploadUrl({
          userId: USER,
          contentType: 'application/pdf',
        }),
      ).rejects.toThrow(BadRequestError);

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('createDownloadUrl', () => {
    it('presigns a GetObject for a ready key owned by the caller', async () => {
      const key = `chat-ready/${USER}/8f14e45f.jpg`;

      const result = await makeStorage().createDownloadUrl({
        userId: USER,
        s3Key: key,
      });

      const command = signedCommand() as GetObjectCommand;
      expect(command).toBeInstanceOf(GetObjectCommand);
      expect(command.input).toEqual({ Bucket: BUCKET, Key: key });
      expect(result.downloadUrl).toBe('https://s3.example/signed');
      expect(result.expiresIn).toBe(DOWNLOAD_URL_TTL_SECONDS);
    });

    // The key round-trips through the client, so these are the cases that keep
    // one user from reading another's receipt — or reading anything at all
    // outside the normalized prefix. Each must fail BEFORE a URL is signed.
    it.each([
      ["another user's receipt", `chat-ready/${OTHER_USER}/8f14e45f.jpg`],
      ['a raw upload key', `chat-attachments/${USER}/8f14e45f.jpg`],
      ['a traversal attempt', `chat-ready/${USER}/../${OTHER_USER}/x.jpg`],
      ['an extra path segment', `chat-ready/${USER}/nested/8f14e45f.jpg`],
      ['a bare object name', '8f14e45f.jpg'],
    ])('refuses %s', async (_label, key) => {
      await expect(
        makeStorage().createDownloadUrl({ userId: USER, s3Key: key }),
      ).rejects.toThrow(BadRequestError);

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });

    it('does not match a user id by prefix', async () => {
      // `user-abc` must not be accepted as the owner of `user-abc-2`'s object.
      await expect(
        makeStorage().createDownloadUrl({
          userId: USER,
          s3Key: `chat-ready/${USER}-2/8f14e45f.jpg`,
        }),
      ).rejects.toThrow(BadRequestError);

      expect(mockGetSignedUrl).not.toHaveBeenCalled();
    });
  });
});
