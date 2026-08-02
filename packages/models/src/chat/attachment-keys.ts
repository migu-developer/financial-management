import { BadRequestError } from '@packages/models/shared/utils/errors';

/**
 * S3 key layout for chat attachments.
 *
 * Lives in `@packages/models` because it is a contract shared by BOTH the CDK
 * stacks (bucket lifecycle rules, the EventBridge rule's prefix filter, IAM
 * resource scoping) and `@services/chat` (minting and validating keys). `infra`
 * cannot import from `@services/*`, so a single definition has to sit here.
 */

/**
 * Prefix the CLIENT uploads to, via a presigned PUT. Anything here is raw and
 * unverified: it may be HEIC, 60 MP, or not an image at all.
 */
export const ATTACHMENT_UPLOAD_PREFIX = 'chat-attachments';

/**
 * Prefix holding NORMALIZED images, written only by the image-processing
 * workflow's role. Nothing else can write here — the presigned URL grants
 * `s3:PutObject` on the upload prefix alone.
 *
 * That asymmetry is a security property, not just tidiness: because
 * `POST /chat` accepts only a `chat-ready/` key, a valid key is *proof* the
 * image went through normalization. A client cannot point the chat workflow at
 * an unprocessed (or non-image) object.
 */
export const ATTACHMENT_READY_PREFIX = 'chat-ready';

export interface ParsedAttachmentKey {
  prefix: string;
  userId: string;
  /** File name including its extension. */
  objectName: string;
}

/**
 * Splits `{prefix}/{userId}/{objectName}` and rejects anything else.
 *
 * The key round-trips through the client, so it is untrusted input on the way
 * back in. Rejecting traversal and extra path segments here is what stops a
 * caller from reaching another user's object or somewhere else in the bucket.
 */
export const parseAttachmentKey = (
  key: string,
  expectedPrefix: string,
): ParsedAttachmentKey => {
  // Reject traversal BEFORE any prefix comparison:
  // `chat-ready/me/../you/x.jpg` starts with the right prefix but does not
  // resolve inside it.
  if (key.includes('..')) {
    throw new BadRequestError(`Attachment key must not contain '..': ${key}`);
  }

  const segments = key.split('/');
  if (segments.length !== 3) {
    throw new BadRequestError(
      `Attachment key must be '{prefix}/{userId}/{name}', got: ${key}`,
    );
  }

  const [prefix, userId, objectName] = segments as [string, string, string];

  if (prefix !== expectedPrefix) {
    throw new BadRequestError(
      `Attachment key must start with '${expectedPrefix}/', got: ${key}`,
    );
  }
  if (!userId || !objectName) {
    throw new BadRequestError(`Malformed attachment key: ${key}`);
  }

  return { prefix, userId, objectName };
};

/**
 * Asserts the key was minted for this user. Compares the owner segment
 * exactly, so `user-1` never matches a key belonging to `user-12`.
 */
export const assertKeyOwnedBy = (
  key: string,
  userId: string,
  expectedPrefix: string,
): ParsedAttachmentKey => {
  const parsed = parseAttachmentKey(key, expectedPrefix);

  if (parsed.userId !== userId) {
    throw new BadRequestError(
      `Attachment key does not belong to the requesting user: ${key}`,
    );
  }

  return parsed;
};

/**
 * Maps an upload key to the normalized key the workflow will produce.
 *
 * The extension reflects the ACTUAL output: a passthrough keeps the original
 * (already Textract-accepted) format, while a rewrite always lands as `.jpg`.
 * Returning it explicitly means no other component has to guess.
 */
export const toReadyKey = (uploadKey: string, extension: string): string => {
  const { userId, objectName } = parseAttachmentKey(
    uploadKey,
    ATTACHMENT_UPLOAD_PREFIX,
  );
  const stem = objectName.includes('.')
    ? objectName.slice(0, objectName.lastIndexOf('.'))
    : objectName;

  return `${ATTACHMENT_READY_PREFIX}/${userId}/${stem}.${extension}`;
};
