import sharp from 'sharp';
import type { Metadata } from 'sharp';
import {
  MAX_INPUT_PIXELS,
  TEXTRACT_LIMITS,
  UnreadableImageError,
  type ImageNormalizerService,
  type ImageProbe,
  type NormalizationReason,
  type NormalizedImage,
} from '@services/chat/domain/services/image-normalizer.service';
import { trace } from '@services/shared/infrastructure/decorators/trace';

/** JPEG quality for rewritten images. */
const JPEG_QUALITY = 88;

const ACCEPTED: readonly string[] = TEXTRACT_LIMITS.ACCEPTED_FORMATS;

/**
 * sharp/libvips adapter for `ImageNormalizerService`.
 *
 * IMPORTANT: the prebuilt sharp binaries decode JPEG, PNG, WebP, AVIF, TIFF,
 * GIF and SVG — but NOT HEIC/HEIF, whose HEVC compression is patent-encumbered
 * and needs a custom libvips (libheif + libde265 + x265). A HEIC upload
 * therefore surfaces as `UnreadableImageError`, which the workflow reports to
 * the user instead of treating as a system fault. The mobile client converts
 * to JPEG before uploading, so HEIC only reaches here from a web upload.
 */
export class SharpImageNormalizer implements ImageNormalizerService {
  @trace('Sharp:probe')
  async probe(bytes: Buffer): Promise<ImageProbe> {
    const metadata = await this.readMetadata(bytes);

    const format = metadata.format ?? 'unknown';
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    if (width === 0 || height === 0) {
      throw new UnreadableImageError(
        `Image metadata has no usable dimensions (format: ${format})`,
      );
    }

    const reasons: NormalizationReason[] = [];

    if (!ACCEPTED.includes(format)) reasons.push('format-not-accepted');
    if (bytes.byteLength > TEXTRACT_LIMITS.MAX_BYTES) {
      reasons.push('too-many-bytes');
    }
    if (
      width > TEXTRACT_LIMITS.MAX_DIMENSION ||
      height > TEXTRACT_LIMITS.MAX_DIMENSION
    ) {
      reasons.push('dimensions-too-large');
    }
    // An EXIF orientation other than 1 means the pixels are stored rotated.
    // Textract tolerates in-plane rotation, but baking the rotation in keeps
    // the stored image upright when it is shown back in the conversation.
    if (metadata.orientation !== undefined && metadata.orientation !== 1) {
      reasons.push('exif-orientation');
    }

    return {
      format,
      width,
      height,
      bytes: bytes.byteLength,
      ...(metadata.orientation !== undefined && {
        orientation: metadata.orientation,
      }),
      textractReady: reasons.length === 0,
      reasons,
    };
  }

  @trace('Sharp:normalize')
  async normalize(bytes: Buffer): Promise<NormalizedImage> {
    const metadata = await this.readMetadata(bytes);
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;

    // Only ever downscale to get UNDER the hard limit — never to save bytes.
    // Shrinking further would push a receipt's fine print below Textract's
    // 15px minimum text height and lose the data we were sent to read.
    const needsResize = Math.max(width, height) > TEXTRACT_LIMITS.MAX_DIMENSION;
    const resizeOptions = {
      ...(width >= height && { width: TEXTRACT_LIMITS.MAX_DIMENSION }),
      ...(height > width && { height: TEXTRACT_LIMITS.MAX_DIMENSION }),
      fit: 'inside' as const,
      withoutEnlargement: true,
    };

    const render = (quality: number) => {
      // No-arg rotate() applies the EXIF orientation and drops the tag, so the
      // output pixels come out upright.
      const pipeline = sharp(bytes, {
        limitInputPixels: MAX_INPUT_PIXELS,
      }).rotate();

      return (needsResize ? pipeline.resize(resizeOptions) : pipeline)
        .jpeg({ quality, mozjpeg: true })
        .toBuffer({ resolveWithObject: true });
    };

    let output = await render(JPEG_QUALITY);

    // A 10000x10000 photo can still exceed 10 MB at q88. Step the QUALITY
    // down, not the dimensions, so text height is preserved.
    for (
      let quality = JPEG_QUALITY - 15;
      output.info.size > TEXTRACT_LIMITS.MAX_BYTES && quality >= 40;
      quality -= 15
    ) {
      output = await render(quality);
    }

    if (output.info.size > TEXTRACT_LIMITS.MAX_BYTES) {
      throw new UnreadableImageError(
        `Image is still ${output.info.size} bytes after normalization, over the ${TEXTRACT_LIMITS.MAX_BYTES}-byte limit`,
      );
    }

    return {
      body: output.data,
      contentType: 'image/jpeg',
      width: output.info.width,
      height: output.info.height,
      bytes: output.info.size,
    };
  }

  /**
   * Reads metadata, converting every sharp/libvips failure into
   * `UnreadableImageError` so callers never have to know about sharp.
   */
  private async readMetadata(bytes: Buffer): Promise<Metadata> {
    try {
      return await sharp(bytes, {
        limitInputPixels: MAX_INPUT_PIXELS,
      }).metadata();
    } catch (error: unknown) {
      throw new UnreadableImageError(
        `Could not decode the uploaded image: ${
          error instanceof Error ? error.message : String(error)
        }`,
        error,
      );
    }
  }
}
