import sharp from 'sharp';
import { SharpImageNormalizer } from './sharp-image-normalizer.service';
import {
  TEXTRACT_LIMITS,
  UnreadableImageError,
} from '@services/chat/domain/services/image-normalizer.service';

jest.mock('@services/shared/infrastructure/decorators/trace', () => ({
  trace: () => () => undefined,
}));

/**
 * These tests run REAL sharp against REAL generated images rather than mocking
 * it. Mocking sharp would only assert that we call the API we think we call —
 * it would not have caught, for example, that a passthrough decision depends on
 * the exact format string libvips reports.
 */
const makeImage = (
  width: number,
  height: number,
  format: 'jpeg' | 'png' | 'webp' | 'tiff',
) =>
  sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 200, b: 200 },
    },
  })
    .toFormat(format)
    .toBuffer();

describe('SharpImageNormalizer.probe', () => {
  const normalizer = new SharpImageNormalizer();

  it('marks a modest JPEG as already Textract-ready', async () => {
    const probe = await normalizer.probe(await makeImage(1200, 1600, 'jpeg'));

    expect(probe.format).toBe('jpeg');
    expect(probe.width).toBe(1200);
    expect(probe.height).toBe(1600);
    expect(probe.textractReady).toBe(true);
    expect(probe.reasons).toEqual([]);
  });

  it('marks PNG as ready too (Textract accepts it)', async () => {
    const probe = await normalizer.probe(await makeImage(800, 600, 'png'));

    expect(probe.textractReady).toBe(true);
  });

  it('flags WebP as a format Textract does not accept', async () => {
    const probe = await normalizer.probe(await makeImage(800, 600, 'webp'));

    expect(probe.format).toBe('webp');
    expect(probe.textractReady).toBe(false);
    expect(probe.reasons).toContain('format-not-accepted');
  });

  it('flags TIFF, which sharp reads but we still rewrite to JPEG', async () => {
    const probe = await normalizer.probe(await makeImage(400, 400, 'tiff'));

    expect(probe.textractReady).toBe(false);
    expect(probe.reasons).toContain('format-not-accepted');
  });

  it('flags an image over the 10000px hard limit', async () => {
    const probe = await normalizer.probe(await makeImage(10_500, 400, 'jpeg'));

    expect(probe.textractReady).toBe(false);
    expect(probe.reasons).toContain('dimensions-too-large');
  });

  it('accepts exactly 10000px — the limit is inclusive', async () => {
    const probe = await normalizer.probe(
      await makeImage(TEXTRACT_LIMITS.MAX_DIMENSION, 200, 'jpeg'),
    );

    expect(probe.reasons).not.toContain('dimensions-too-large');
  });

  it('raises UnreadableImageError for bytes that are not an image', async () => {
    await expect(
      normalizer.probe(Buffer.from('this is definitely not a photo')),
    ).rejects.toThrow(UnreadableImageError);
  });

  it('raises UnreadableImageError for an empty buffer', async () => {
    await expect(normalizer.probe(Buffer.alloc(0))).rejects.toThrow(
      UnreadableImageError,
    );
  });
});

describe('SharpImageNormalizer.normalize', () => {
  const normalizer = new SharpImageNormalizer();

  it('converts an unsupported format to JPEG', async () => {
    const result = await normalizer.normalize(
      await makeImage(900, 700, 'webp'),
    );

    expect(result.contentType).toBe('image/jpeg');
    const meta = await sharp(result.body).metadata();
    expect(meta.format).toBe('jpeg');
    // Dimensions are PRESERVED: the image was within limits, so there is no
    // reason to shrink it and risk dropping text under 15px.
    expect(result.width).toBe(900);
    expect(result.height).toBe(700);
  });

  it('downscales only the side that exceeds the limit, preserving the ratio', async () => {
    const result = await normalizer.normalize(
      await makeImage(12_000, 6_000, 'jpeg'),
    );

    expect(result.width).toBe(TEXTRACT_LIMITS.MAX_DIMENSION);
    // 12000x6000 is 2:1, so the height must land at half the capped width.
    expect(result.height).toBe(TEXTRACT_LIMITS.MAX_DIMENSION / 2);
  });

  it('caps the HEIGHT when the image is portrait', async () => {
    const result = await normalizer.normalize(
      await makeImage(6_000, 12_000, 'jpeg'),
    );

    expect(result.height).toBe(TEXTRACT_LIMITS.MAX_DIMENSION);
    expect(result.width).toBe(TEXTRACT_LIMITS.MAX_DIMENSION / 2);
  });

  it('never ENLARGES a small image', async () => {
    const result = await normalizer.normalize(
      await makeImage(300, 200, 'webp'),
    );

    expect(result.width).toBe(300);
    expect(result.height).toBe(200);
  });

  it('always lands under the 10 MB limit', async () => {
    const result = await normalizer.normalize(
      await makeImage(9_000, 9_000, 'png'),
    );

    expect(result.bytes).toBeLessThanOrEqual(TEXTRACT_LIMITS.MAX_BYTES);
  });

  it('raises UnreadableImageError instead of writing garbage', async () => {
    await expect(
      normalizer.normalize(Buffer.from('not an image at all')),
    ).rejects.toThrow(UnreadableImageError);
  });
});
