import type { ImageNormalizerService } from '@services/chat/domain/services/image-normalizer.service';
import { UnreadableImageError } from '@services/chat/domain/services/image-normalizer.service';
import type { ObjectStorageService } from '@services/chat/domain/services/object-storage.service';
import {
  ATTACHMENT_UPLOAD_PREFIX,
  parseAttachmentKey,
  toReadyKey,
} from '@packages/models/chat/attachment-keys';

/** Extension used for every rewritten image. */
const REWRITE_EXTENSION = 'jpg';

export interface ProbeAttachmentInput {
  /** Key the client uploaded to, under `chat-attachments/`. */
  uploadKey: string;
}

export interface ProbeAttachmentOutput {
  userId: string;
  uploadKey: string;
  /** Where the normalized image will land. */
  readyKey: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
  /**
   * `passthrough` — already Textract-ready, server-side copy only.
   * `convert`     — needs a rewrite.
   * `unsupported` — cannot be decoded at all; tell the user, do NOT alarm.
   */
  decision: 'passthrough' | 'convert' | 'unsupported';
  /** Why a rewrite is needed, or why the image was rejected. */
  reasons: string[];
}

/**
 * Inspects an uploaded image and decides what has to happen to it.
 *
 * Kept separate from the conversion step so the state machine can branch
 * visibly: the SFN console then shows how often uploads actually need
 * rewriting, and a future HEIC converter slots in as another branch without
 * touching this logic.
 */
export class ProbeAttachmentImageUseCase {
  constructor(
    private readonly storage: ObjectStorageService,
    private readonly normalizer: ImageNormalizerService,
  ) {}

  async execute(input: ProbeAttachmentInput): Promise<ProbeAttachmentOutput> {
    const { userId, objectName } = parseAttachmentKey(
      input.uploadKey,
      ATTACHMENT_UPLOAD_PREFIX,
    );

    // A passthrough copies the bytes UNCHANGED, so the ready key must keep the
    // upload's own extension. Deriving it from sharp's format name instead
    // would rewrite `.jpg` to `.jpeg` and describe the object inaccurately.
    const uploadExtension = objectName.includes('.')
      ? objectName.slice(objectName.lastIndexOf('.') + 1)
      : REWRITE_EXTENSION;

    const bytes = await this.storage.get(input.uploadKey);

    try {
      const probe = await this.normalizer.probe(bytes);

      // A passthrough keeps the original extension; a rewrite is always JPEG.
      const extension = probe.textractReady
        ? uploadExtension
        : REWRITE_EXTENSION;

      return {
        userId,
        uploadKey: input.uploadKey,
        readyKey: toReadyKey(input.uploadKey, extension),
        format: probe.format,
        width: probe.width,
        height: probe.height,
        bytes: probe.bytes,
        decision: probe.textractReady ? 'passthrough' : 'convert',
        reasons: [...probe.reasons],
      };
    } catch (error: unknown) {
      // An image we cannot decode (HEIC, corrupt, decompression bomb) is a
      // USER problem, not a system fault. Returning it as a decision — rather
      // than throwing — keeps the execution SUCCEEDED so it never trips the
      // ExecutionsFailed alarm on somebody's holiday photo.
      if (error instanceof UnreadableImageError) {
        return {
          userId,
          uploadKey: input.uploadKey,
          readyKey: toReadyKey(input.uploadKey, REWRITE_EXTENSION),
          format: 'unknown',
          width: 0,
          height: 0,
          bytes: bytes.byteLength,
          decision: 'unsupported',
          reasons: [error.message],
        };
      }
      throw error;
    }
  }
}

export interface ConvertAttachmentInput {
  uploadKey: string;
  readyKey: string;
}

export interface ConvertAttachmentOutput {
  readyKey: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Rewrites the uploaded image into a Textract-accepted JPEG within every hard
 * limit, and writes it to the ready prefix.
 */
export class ConvertAttachmentImageUseCase {
  constructor(
    private readonly storage: ObjectStorageService,
    private readonly normalizer: ImageNormalizerService,
  ) {}

  async execute(
    input: ConvertAttachmentInput,
  ): Promise<ConvertAttachmentOutput> {
    const bytes = await this.storage.get(input.uploadKey);
    const normalized = await this.normalizer.normalize(bytes);

    await this.storage.put(
      input.readyKey,
      normalized.body,
      normalized.contentType,
    );

    return {
      readyKey: input.readyKey,
      width: normalized.width,
      height: normalized.height,
      bytes: normalized.bytes,
    };
  }
}
