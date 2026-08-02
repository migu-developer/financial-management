import { UnsupportedImageError, optimizeImageForUpload } from '@packages/utils';
import type { AttachmentEvent } from '@features/dashboard/domain/services/chat-event';
import type { ChatRepositoryPort } from '@features/dashboard/domain/repositories/chat-repository.port';

/**
 * Attachment lifecycle, kept as PURE logic outside the React hook.
 *
 * The repo has no React testing library and mocks `react-native` wholesale, so
 * a hook tested through a renderer is not an option here. Extracting the parts
 * that actually carry risk — the state transitions, event correlation, and the
 * upload orchestration — makes them testable with plain Jest, and leaves the
 * hook as thin wiring around state, refs and timers.
 */
export type AttachmentStatus =
  | 'idle'
  /** Decoding and re-encoding in the browser. */
  | 'preparing'
  /** Bytes in flight to S3. */
  | 'uploading'
  /** Uploaded; waiting for the server to finish normalizing. */
  | 'processing'
  /** Normalized and ready to send. */
  | 'ready'
  | 'error';

export interface ChatAttachmentState {
  status: AttachmentStatus;
  /** Object URL for the thumbnail. Revoked when the attachment is cleared. */
  previewUri?: string;
  fileName?: string;
  /** Raw upload key — correlates the realtime events. */
  uploadKey?: string;
  /** Normalized key to send as `attachmentS3Key`. Present when `ready`. */
  readyKey?: string;
  /** User-facing message when `status === 'error'`. */
  errorMessage?: string;
}

export const IDLE_ATTACHMENT: ChatAttachmentState = { status: 'idle' };

/** Localized copy. Kept as data so no layer below the drawer imports i18n. */
export interface AttachmentMessages {
  unsupported: string;
  uploadFailed: string;
  timedOut: string;
}

/** True while the attachment cannot be sent yet — gates the Send button. */
export const isAttachmentBusy = (status: AttachmentStatus): boolean =>
  status === 'preparing' || status === 'uploading' || status === 'processing';

export interface PrepareAttachmentDeps {
  repository: Pick<ChatRepositoryPort, 'createUploadUrl' | 'uploadAttachment'>;
  messages: AttachmentMessages;
  /** Reports non-user-facing failures; injected so tests stay quiet. */
  onUnexpectedError?: (message: string, error: unknown) => void;
}

/**
 * Optimizes the picked file in the browser, presigns, and uploads it.
 *
 * Resolves with the state to apply — it never throws, because every failure
 * here is something the user must simply be told about.
 *
 * @returns `processing` once the bytes are in S3 (normalization still has to
 * publish `attachment_ready`), or `error` with localized copy.
 */
export const prepareAttachmentUpload = async (
  { repository, messages, onUnexpectedError }: PrepareAttachmentDeps,
  file: File,
  base: ChatAttachmentState,
): Promise<ChatAttachmentState> => {
  let optimized;
  try {
    optimized = await optimizeImageForUpload(file);
  } catch (error: unknown) {
    // A HEIC picked in a browser is the EXPECTED case here, not a bug: no
    // browser decodes HEVC. Telling the user now saves an upload plus a server
    // round trip.
    if (error instanceof UnsupportedImageError) {
      return { ...base, status: 'error', errorMessage: messages.unsupported };
    }
    onUnexpectedError?.('Failed to optimize attachment', error);
    return { ...base, status: 'error', errorMessage: messages.uploadFailed };
  }

  try {
    const presigned = await repository.createUploadUrl({
      contentType: optimized.contentType,
    });
    // `contentType` MUST match what was presigned — it is part of the
    // signature, so S3 rejects a mismatch.
    await repository.uploadAttachment(
      presigned.uploadUrl,
      optimized.blob,
      optimized.contentType,
    );

    return { ...base, status: 'processing', uploadKey: presigned.s3Key };
  } catch (error: unknown) {
    onUnexpectedError?.('Failed to upload attachment', error);
    return { ...base, status: 'error', errorMessage: messages.uploadFailed };
  }
};

/**
 * Applies a realtime attachment event.
 *
 * @param awaitedUploadKey - the upload currently being waited on.
 * @returns the next state, or `null` when the event must be IGNORED because it
 * belongs to an attachment the user already replaced or removed — otherwise a
 * slow first upload could overwrite the current one.
 */
export const applyAttachmentEvent = (
  current: ChatAttachmentState,
  awaitedUploadKey: string | undefined,
  event: AttachmentEvent,
): ChatAttachmentState | null => {
  if (event.uploadKey !== awaitedUploadKey) return null;

  if (event.type === 'attachment_rejected') {
    return { ...current, status: 'error', errorMessage: event.content };
  }

  return { ...current, status: 'ready', readyKey: event.readyKey };
};
