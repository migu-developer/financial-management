/**
 * Minimal object-storage port used by the image-normalization workflow.
 *
 * Deliberately narrower than the S3 API: the workflow only ever reads the
 * uploaded object and writes (or server-side copies) the normalized one, so
 * those are the only capabilities exposed.
 */
export interface ObjectStorageService {
  /** Reads an object's full body into memory. */
  get(key: string): Promise<Buffer>;
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  /**
   * Server-side copy — the bytes never travel through the Lambda, which is
   * what makes the "already Textract-ready" path nearly free.
   */
  copy(fromKey: string, toKey: string): Promise<void>;
}
