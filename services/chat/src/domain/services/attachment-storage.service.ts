/**
 * Attachment kinds the chat workflow can ingest.
 *
 * Mirrors the `chat_messages.attachment_type` CHECK constraint
 * (`'image' | 'audio'`). Only `image` is wired end-to-end today; `audio`
 * is accepted by the schema for the voice-note phase.
 */
export type ChatAttachmentKind = 'image' | 'audio';

export interface CreateUploadUrlInput {
  /** Owner of the attachment — scopes the S3 key prefix. */
  userId: string;
  /** MIME type the client will send in the `Content-Type` of the PUT. */
  contentType: string;
}

export interface CreateUploadUrlResult {
  /** Presigned PUT URL the client uploads the raw bytes to. */
  uploadUrl: string;
  /**
   * Key the client must echo back as `attachmentS3Key` on `POST /chat`.
   * Always prefixed with the owner's id so the workflow can verify
   * ownership without a database round-trip.
   */
  s3Key: string;
  /** Seconds until `uploadUrl` stops working. */
  expiresIn: number;
  /** Attachment kind derived from `contentType`. */
  attachmentType: ChatAttachmentKind;
}

export interface CreateDownloadUrlInput {
  /**
   * Requester. The key's owner segment MUST match this — that check is the
   * whole authorization story for reads, since the key travels through the
   * client and comes back as untrusted input.
   */
  userId: string;
  /**
   * NORMALIZED key (`chat-ready/...`) of the object to read back.
   *
   * Only the ready prefix is presignable: the raw upload may be HEIC, 60 MP,
   * or not an image at all, so it is not something we want a browser to render.
   */
  s3Key: string;
}

export interface CreateDownloadUrlResult {
  /** Presigned GET URL the client can point an `<Image>` at. */
  downloadUrl: string;
  /** Seconds until `downloadUrl` stops working. */
  expiresIn: number;
}

/**
 * Port for handing the client short-lived, single-object URLs so the raw
 * bytes never travel through API Gateway or Lambda (both have payload
 * limits far below a phone photo, and base64 would inflate it further).
 *
 * The concrete adapter (`S3AttachmentStorage`) presigns S3 `PutObject` for
 * uploads and `GetObject` for reads. The bucket itself stays fully private —
 * every read is an explicit, expiring, per-object grant.
 */
export interface AttachmentStorageService {
  createUploadUrl(input: CreateUploadUrlInput): Promise<CreateUploadUrlResult>;
  /**
   * Presigns a read of one normalized attachment, so the chat can show the
   * photo a user sent instead of a bubble with no image.
   */
  createDownloadUrl(
    input: CreateDownloadUrlInput,
  ): Promise<CreateDownloadUrlResult>;
}
