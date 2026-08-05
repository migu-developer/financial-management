import { randomUUID } from 'node:crypto';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  AttachmentStorageService,
  ChatAttachmentKind,
  CreateDownloadUrlInput,
  CreateDownloadUrlResult,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
} from '@services/chat/domain/services/attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';
import {
  ATTACHMENT_READY_PREFIX,
  ATTACHMENT_UPLOAD_PREFIX,
  assertKeyOwnedBy,
} from '@packages/models/chat/attachment-keys';
import { trace } from '@services/shared/infrastructure/decorators/trace';

/**
 * MIME types accepted for upload, mapped to the extension used in the S3 key
 * and the `attachment_type` persisted on the message.
 *
 * This list is INTENTIONALLY broader than what Textract accepts (JPEG, PNG,
 * PDF, TIFF). The image-processing workflow normalizes whatever lands here
 * into a Textract-readable JPEG, so blocking formats at upload time would only
 * push a solvable problem onto the user.
 *
 * It is still an allow-list, because it is the boundary that stops a caller
 * from parking arbitrary content (an executable, an HTML page) in a bucket we
 * own — every entry here is something sharp can decode, EXCEPT `image/heic`:
 * the prebuilt sharp binaries cannot decode HEVC, so a HEIC upload is accepted,
 * fails normalization, and the user gets an explicit `attachment_rejected`
 * message. The mobile client converts HEIC to JPEG before uploading, so this
 * only happens on a web upload.
 */
export const ALLOWED_ATTACHMENT_TYPES: Readonly<
  Record<string, { extension: string; kind: ChatAttachmentKind }>
> = {
  'image/jpeg': { extension: 'jpg', kind: 'image' },
  'image/png': { extension: 'png', kind: 'image' },
  'image/webp': { extension: 'webp', kind: 'image' },
  'image/avif': { extension: 'avif', kind: 'image' },
  'image/tiff': { extension: 'tiff', kind: 'image' },
  'image/gif': { extension: 'gif', kind: 'image' },
  'image/heic': { extension: 'heic', kind: 'image' },
  'image/heif': { extension: 'heif', kind: 'image' },
};

/** How long the client has to complete the upload. */
export const UPLOAD_URL_TTL_SECONDS = 300;

/**
 * How long a presigned read stays valid.
 *
 * Longer than the upload TTL because this one backs rendering: a user can sit
 * on an open conversation, scroll back, or leave the tab idle. Still short
 * enough that a leaked URL stops working the same hour.
 */
export const DOWNLOAD_URL_TTL_SECONDS = 3600;

/**
 * S3 adapter for `AttachmentStorageService`.
 *
 * Presigns a `PutObject` so the bytes go straight from the device to S3.
 * The key is server-generated (`{prefix}/{userId}/{uuid}.{ext}`) — the client
 * never chooses it, which is what prevents both path traversal and one user
 * overwriting another user's object.
 */
export class S3AttachmentStorage implements AttachmentStorageService {
  constructor(
    private readonly bucketName: string,
    private readonly client: S3Client = new S3Client({}),
  ) {}

  @trace('S3:presignAttachmentUpload')
  async createUploadUrl(
    input: CreateUploadUrlInput,
  ): Promise<CreateUploadUrlResult> {
    const normalizedType = input.contentType.trim().toLowerCase();
    const allowed = ALLOWED_ATTACHMENT_TYPES[normalizedType];

    if (!allowed) {
      throw new BadRequestError(
        `Unsupported attachment content type: ${input.contentType}. Allowed: ${Object.keys(
          ALLOWED_ATTACHMENT_TYPES,
        ).join(', ')}`,
      );
    }

    const s3Key = `${ATTACHMENT_UPLOAD_PREFIX}/${input.userId}/${randomUUID()}.${allowed.extension}`;

    // `ContentType` is part of the signature, so the client MUST send the same
    // value on the PUT — a mismatch is rejected by S3 rather than silently
    // storing something other than what we validated.
    const uploadUrl = await getSignedUrl(
      this.client,
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ContentType: normalizedType,
      }),
      { expiresIn: UPLOAD_URL_TTL_SECONDS },
    );

    return {
      uploadUrl,
      s3Key,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
      attachmentType: allowed.kind,
    };
  }

  @trace('S3:presignAttachmentDownload')
  async createDownloadUrl(
    input: CreateDownloadUrlInput,
  ): Promise<CreateDownloadUrlResult> {
    // The key round-trips through the client, so it is untrusted here. This
    // rejects traversal, extra path segments, the raw upload prefix, and any
    // key whose owner segment is not the caller — one object, one owner.
    assertKeyOwnedBy(input.s3Key, input.userId, ATTACHMENT_READY_PREFIX);

    const downloadUrl = await getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucketName, Key: input.s3Key }),
      { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
    );

    return { downloadUrl, expiresIn: DOWNLOAD_URL_TTL_SECONDS };
  }
}
