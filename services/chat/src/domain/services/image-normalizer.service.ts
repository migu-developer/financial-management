/**
 * Textract's hard limits for synchronous operations. These are SET quotas —
 * they cannot be raised via Service Quotas.
 *
 * https://docs.aws.amazon.com/textract/latest/dg/limits-document.html
 */
export const TEXTRACT_LIMITS = {
  /** JPEG, PNG, PDF, TIFF only. Notably NOT HEIC and NOT WebP. */
  ACCEPTED_FORMATS: ['jpeg', 'png'] as const,
  /** 10 MB in memory for synchronous operations. */
  MAX_BYTES: 10 * 1024 * 1024,
  /** "images with a resolution less than or equal to 10000 pixels on all sides" */
  MAX_DIMENSION: 10_000,
  /**
   * "The minimum height for text to be detected is 15 pixels."
   *
   * This is why normalization must NOT shrink images to make them small:
   * downscaling a receipt until its fine print drops under 15px actively
   * destroys extraction accuracy. We only ever downscale to get UNDER
   * MAX_DIMENSION, never to save bytes.
   */
  MIN_TEXT_HEIGHT_PX: 15,
} as const;

/**
 * Upper bound on decoded pixels, enforced before decoding.
 *
 * Guards against a decompression bomb: a few-KB file can declare enormous
 * dimensions and exhaust the Lambda's memory on decode. 100 MP is far above
 * any phone camera (a 48 MP iPhone photo is ~48 MP) while staying well inside
 * a 1536 MB Lambda.
 */
export const MAX_INPUT_PIXELS = 100_000_000;

/** Why an image has to be rewritten before Textract will accept it. */
export type NormalizationReason =
  | 'format-not-accepted'
  | 'too-many-bytes'
  | 'dimensions-too-large'
  | 'exif-orientation';

export interface ImageProbe {
  /** Format sharp detected, e.g. `jpeg`, `png`, `webp`, `tiff`. */
  format: string;
  width: number;
  height: number;
  bytes: number;
  /** EXIF orientation (1 = already upright), when present. */
  orientation?: number;
  /** True when the image is already something Textract accepts as-is. */
  textractReady: boolean;
  /** Populated when `textractReady` is false. */
  reasons: NormalizationReason[];
}

/**
 * Raised when the bytes cannot be decoded at all — an unsupported container
 * (HEIC, which needs a libvips built with libheif), a corrupt file, or a
 * decompression bomb over `MAX_INPUT_PIXELS`.
 *
 * This is a USER error, not a system fault: the workflow reports it back to
 * the user and ends SUCCESSFULLY so it never fires an alarm.
 */
export class UnreadableImageError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'UnreadableImageError';
  }
}

export interface NormalizedImage {
  body: Buffer;
  contentType: string;
  width: number;
  height: number;
  bytes: number;
}

/**
 * Port for inspecting and rewriting an uploaded image so Textract can read it.
 *
 * The concrete adapter (`SharpImageNormalizer`) uses sharp/libvips. Note the
 * prebuilt sharp binaries do NOT decode HEIC (patent-encumbered HEVC), which
 * is why the mobile client converts to JPEG before uploading.
 */
export interface ImageNormalizerService {
  /** Reads metadata and decides whether a rewrite is needed. */
  probe(bytes: Buffer): Promise<ImageProbe>;
  /** Rewrites to a Textract-accepted format within all limits. */
  normalize(bytes: Buffer): Promise<NormalizedImage>;
}
