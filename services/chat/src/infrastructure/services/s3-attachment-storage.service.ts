import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type {
  AttachmentStorageService,
  ChatAttachmentKind,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
} from '@services/chat/domain/services/attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';
import { trace } from '@services/shared/infrastructure/decorators/trace';

/**
 * Prefix every chat attachment lives under. The bucket lifecycle rule
 * expires objects on this prefix, so keys MUST start with it.
 */
export const ATTACHMENT_PREFIX = 'chat-attachments';

/**
 * MIME types accepted for upload, mapped to the extension used in the S3 key
 * and the `attachment_type` persisted on the message.
 *
 * This is an allow-list on purpose: it is the boundary that stops a caller
 * from parking arbitrary content (an executable, an HTML page) in a bucket we
 * own. Textract `AnalyzeExpense` supports JPEG, PNG, PDF and TIFF; only the
 * raster formats a phone camera produces are enabled here.
 */
export const ALLOWED_ATTACHMENT_TYPES: Readonly<
  Record<string, { extension: string; kind: ChatAttachmentKind }>
> = {
  'image/jpeg': { extension: 'jpg', kind: 'image' },
  'image/png': { extension: 'png', kind: 'image' },
  'image/heic': { extension: 'heic', kind: 'image' },
  'image/webp': { extension: 'webp', kind: 'image' },
};

/** How long the client has to complete the upload. */
export const UPLOAD_URL_TTL_SECONDS = 300;

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

    const s3Key = `${ATTACHMENT_PREFIX}/${input.userId}/${randomUUID()}.${allowed.extension}`;

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
}
