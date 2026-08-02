/**
 * Client-side image preparation for chat attachments (WEB).
 *
 * The server normalizes every upload anyway, so this is an OPTIMIZATION, not a
 * correctness requirement: when the browser hands us a compliant JPEG the
 * backend takes its cheap passthrough path (a server-side S3 copy) instead of
 * spinning up the conversion Lambda.
 *
 * The size win that matters is FORMAT, not dimensions: a 12 MP PNG is ~20 MB
 * while the same image as JPEG q88 is ~2 MB.
 *
 * What this deliberately does NOT do is shrink images to make them small.
 * Textract's minimum detectable text height is 15 px, so downscaling a receipt
 * to save bandwidth destroys the fine print we are uploading it to read. The
 * policy here mirrors the server exactly: convert the format, respect EXIF
 * orientation, and downscale ONLY to get under the hard 10000 px limit.
 */

/** Textract set quotas — must stay in sync with the server's TEXTRACT_LIMITS. */
export const IMAGE_LIMITS = {
  MAX_BYTES: 10 * 1024 * 1024,
  MAX_DIMENSION: 10_000,
  /** Formats Textract accepts as-is, so they can skip re-encoding. */
  PASSTHROUGH_TYPES: ['image/jpeg', 'image/png'] as const,
} as const;

/** JPEG quality for re-encoded images. Matches the server's q88. */
const JPEG_QUALITY = 0.88;

export type ImageOptimizationOutcome =
  | 'passthrough'
  | 're-encoded'
  | 'downscaled';

export interface OptimizedImage {
  /** The bytes to upload — the original file when nothing had to change. */
  blob: Blob;
  /** MIME type to send as `Content-Type` on the presigned PUT. */
  contentType: string;
  width: number;
  height: number;
  outcome: ImageOptimizationOutcome;
}

/**
 * Raised when the browser cannot decode the file at all.
 *
 * The common case is **HEIC**: no browser decodes HEVC-compressed images, and
 * neither do the server's prebuilt sharp binaries. Detecting it here means the
 * user is told immediately instead of after an upload plus a server round trip.
 */
export class UnsupportedImageError extends Error {
  constructor(
    message: string,
    readonly reason: 'heic' | 'undecodable',
  ) {
    super(message);
    this.name = 'UnsupportedImageError';
  }
}

/** HEIC/HEIF by MIME type or by extension — browsers often report neither. */
export const isHeicFile = (file: File): boolean => {
  const type = file.type.toLowerCase();
  if (type === 'image/heic' || type === 'image/heif') return true;
  return /\.(heic|heif)$/i.test(file.name);
};

const decode = async (file: File): Promise<ImageBitmap> => {
  if (isHeicFile(file)) {
    throw new UnsupportedImageError(
      `HEIC images cannot be decoded in the browser: ${file.name}`,
      'heic',
    );
  }

  try {
    // `imageOrientation: 'from-image'` applies the EXIF rotation while
    // decoding, so the canvas we draw is already upright and the tag can be
    // dropped — the same thing sharp's no-arg rotate() does on the server.
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (error: unknown) {
    throw new UnsupportedImageError(
      `The browser could not decode ${file.name}: ${
        error instanceof Error ? error.message : String(error)
      }`,
      'undecodable',
    );
  }
};

const toJpegBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(
              new UnsupportedImageError(
                'Canvas produced no image data',
                'undecodable',
              ),
            ),
      'image/jpeg',
      JPEG_QUALITY,
    );
  });

/**
 * Prepares a picked file for upload.
 *
 * WEB ONLY — it relies on `createImageBitmap` and `HTMLCanvasElement`. Call it
 * behind an `isWeb()` guard; native gets its own path when mobile ships.
 *
 * @throws {UnsupportedImageError} when the browser cannot decode the file.
 */
export const optimizeImageForUpload = async (
  file: File,
): Promise<OptimizedImage> => {
  const bitmap = await decode(file);

  try {
    const { width, height } = bitmap;
    const longest = Math.max(width, height);
    const overSized = longest > IMAGE_LIMITS.MAX_DIMENSION;

    const alreadyAccepted = (
      IMAGE_LIMITS.PASSTHROUGH_TYPES as readonly string[]
    ).includes(file.type.toLowerCase());

    // Nothing to gain: the file is already something Textract reads, within
    // every limit. Re-encoding would only lose quality.
    if (alreadyAccepted && !overSized && file.size <= IMAGE_LIMITS.MAX_BYTES) {
      return {
        blob: file,
        contentType: file.type.toLowerCase(),
        width,
        height,
        outcome: 'passthrough',
      };
    }

    const scale = overSized ? IMAGE_LIMITS.MAX_DIMENSION / longest : 1;
    const targetWidth = Math.round(width * scale);
    const targetHeight = Math.round(height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new UnsupportedImageError(
        'Could not get a 2D canvas context',
        'undecodable',
      );
    }
    context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await toJpegBlob(canvas);

    return {
      blob,
      contentType: 'image/jpeg',
      width: targetWidth,
      height: targetHeight,
      outcome: overSized ? 'downscaled' : 're-encoded',
    };
  } finally {
    // Free the decoded bitmap explicitly — a 48 MP photo holds ~190 MB of RGBA
    // until it is collected, which is enough to crash a phone browser tab.
    bitmap.close();
  }
};
