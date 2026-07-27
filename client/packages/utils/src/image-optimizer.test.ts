import {
  IMAGE_LIMITS,
  UnsupportedImageError,
  isHeicFile,
  optimizeImageForUpload,
} from './image-optimizer';

/**
 * The package runs on `testEnvironment: 'node'`, so the handful of DOM APIs the
 * optimizer touches are stubbed here rather than switching every test in the
 * package to jsdom (and pulling in the dependency) for one module.
 */
interface CanvasStub {
  width: number;
  height: number;
  getContext: jest.Mock;
  toBlob: jest.Mock;
}

let canvas: CanvasStub;
let drawImage: jest.Mock;
let bitmapClose: jest.Mock;

const JPEG_BLOB_SIZE = 2048;

const makeFile = (name: string, type: string, size: number): File =>
  ({ name, type, size }) as unknown as File;

const stubDecode = (width: number, height: number) => {
  bitmapClose = jest.fn();
  (globalThis as { createImageBitmap?: unknown }).createImageBitmap = jest
    .fn()
    .mockResolvedValue({ width, height, close: bitmapClose });
};

beforeEach(() => {
  drawImage = jest.fn();
  canvas = {
    width: 0,
    height: 0,
    getContext: jest.fn().mockReturnValue({ drawImage }),
    toBlob: jest
      .fn()
      .mockImplementation((cb: (b: Blob) => void) =>
        cb({ size: JPEG_BLOB_SIZE } as Blob),
      ),
  };
  (globalThis as { document?: unknown }).document = {
    createElement: jest.fn().mockReturnValue(canvas),
  };
  stubDecode(1200, 1600);
});

afterEach(() => {
  delete (globalThis as { document?: unknown }).document;
  delete (globalThis as { createImageBitmap?: unknown }).createImageBitmap;
});

describe('isHeicFile', () => {
  it.each([
    ['photo.heic', ''],
    ['photo.HEIF', ''],
    ['photo.jpg', 'image/heic'],
    ['photo.jpg', 'image/heif'],
  ])('detects %s (%s) as HEIC', (name, type) => {
    expect(isHeicFile(makeFile(name, type, 100))).toBe(true);
  });

  it('does not flag ordinary images', () => {
    expect(isHeicFile(makeFile('photo.jpg', 'image/jpeg', 100))).toBe(false);
    expect(isHeicFile(makeFile('shot.png', 'image/png', 100))).toBe(false);
  });
});

describe('optimizeImageForUpload', () => {
  it('passes a compliant JPEG through UNCHANGED', async () => {
    const file = makeFile('receipt.jpg', 'image/jpeg', 500_000);

    const result = await optimizeImageForUpload(file);

    expect(result.outcome).toBe('passthrough');
    // Re-encoding an already-accepted image would only lose quality, and the
    // backend would still take its cheap copy path either way.
    expect(result.blob).toBe(file);
    expect(result.contentType).toBe('image/jpeg');
    expect(canvas.toBlob).not.toHaveBeenCalled();
  });

  it('passes a compliant PNG through — Textract accepts PNG too', async () => {
    const file = makeFile('receipt.png', 'image/png', 900_000);

    const result = await optimizeImageForUpload(file);

    expect(result.outcome).toBe('passthrough');
    expect(result.contentType).toBe('image/png');
  });

  it('re-encodes a WebP to JPEG without touching its dimensions', async () => {
    const result = await optimizeImageForUpload(
      makeFile('receipt.webp', 'image/webp', 300_000),
    );

    expect(result.outcome).toBe('re-encoded');
    expect(result.contentType).toBe('image/jpeg');
    // Dimensions are preserved: shrinking would push a receipt's fine print
    // under Textract's 15px minimum text height.
    expect(result.width).toBe(1200);
    expect(result.height).toBe(1600);
    expect(canvas.width).toBe(1200);
    expect(canvas.height).toBe(1600);
  });

  it('re-encodes a JPEG that is over the byte limit', async () => {
    const result = await optimizeImageForUpload(
      makeFile('huge.jpg', 'image/jpeg', IMAGE_LIMITS.MAX_BYTES + 1),
    );

    expect(result.outcome).toBe('re-encoded');
    expect(result.blob.size).toBe(JPEG_BLOB_SIZE);
  });

  it('downscales ONLY to reach the 10000px limit, preserving the ratio', async () => {
    stubDecode(20_000, 10_000);

    const result = await optimizeImageForUpload(
      makeFile('panorama.jpg', 'image/jpeg', 400_000),
    );

    expect(result.outcome).toBe('downscaled');
    expect(result.width).toBe(IMAGE_LIMITS.MAX_DIMENSION);
    // 2:1 in, 2:1 out.
    expect(result.height).toBe(IMAGE_LIMITS.MAX_DIMENSION / 2);
  });

  it('caps the height for a portrait image', async () => {
    stubDecode(5_000, 20_000);

    const result = await optimizeImageForUpload(
      makeFile('tall.jpg', 'image/jpeg', 400_000),
    );

    expect(result.height).toBe(IMAGE_LIMITS.MAX_DIMENSION);
    expect(result.width).toBe(IMAGE_LIMITS.MAX_DIMENSION / 4);
  });

  it('never enlarges a small image', async () => {
    stubDecode(300, 200);

    const result = await optimizeImageForUpload(
      makeFile('small.webp', 'image/webp', 5_000),
    );

    expect(result.width).toBe(300);
    expect(result.height).toBe(200);
  });

  it('decodes with EXIF orientation applied', async () => {
    await optimizeImageForUpload(makeFile('rotated.webp', 'image/webp', 1000));

    expect(globalThis.createImageBitmap).toHaveBeenCalledWith(
      expect.anything(),
      { imageOrientation: 'from-image' },
    );
  });

  it('rejects HEIC BEFORE attempting to decode or upload', async () => {
    const decodeSpy = globalThis.createImageBitmap as unknown as jest.Mock;

    await expect(
      optimizeImageForUpload(makeFile('IMG_0001.HEIC', '', 3_000_000)),
    ).rejects.toMatchObject({ reason: 'heic' });

    // Failing fast here is what saves the user an upload plus a server round
    // trip before being told the format is unusable.
    expect(decodeSpy).not.toHaveBeenCalled();
  });

  it('wraps an undecodable file in UnsupportedImageError', async () => {
    (globalThis as { createImageBitmap?: unknown }).createImageBitmap = jest
      .fn()
      .mockRejectedValue(new Error('source image could not be decoded'));

    await expect(
      optimizeImageForUpload(makeFile('broken.jpg', 'image/jpeg', 100)),
    ).rejects.toBeInstanceOf(UnsupportedImageError);
  });

  it('always frees the decoded bitmap, even when encoding fails', async () => {
    canvas.getContext.mockReturnValue(null);

    await expect(
      optimizeImageForUpload(makeFile('x.webp', 'image/webp', 100)),
    ).rejects.toBeInstanceOf(UnsupportedImageError);

    // A 48 MP photo holds ~190 MB of RGBA until collected — enough to crash a
    // browser tab if it leaks on the error path.
    expect(bitmapClose).toHaveBeenCalledTimes(1);
  });
});
