import {
  CopyObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { ObjectStorageService } from '@services/chat/domain/services/object-storage.service';
import { DataNotDefinedError } from '@packages/models/shared/utils/errors';
import { trace } from '@services/shared/infrastructure/decorators/trace';

/**
 * S3 adapter for `ObjectStorageService`, scoped to a single bucket.
 */
export class S3ObjectStorage implements ObjectStorageService {
  constructor(
    private readonly bucketName: string,
    private readonly client: S3Client = new S3Client({}),
  ) {}

  @trace('S3:getObject')
  async get(key: string): Promise<Buffer> {
    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucketName, Key: key }),
    );

    if (!response.Body) {
      throw new DataNotDefinedError(`S3 object ${key} has no body`);
    }

    // transformToByteArray buffers the whole stream — fine here because the
    // object is capped at a few MB by the upload path, and sharp needs the
    // complete buffer to decode anyway.
    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  @trace('S3:putObject')
  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  @trace('S3:copyObject')
  async copy(fromKey: string, toKey: string): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: this.bucketName,
        // CopySource is `bucket/key` and MUST be URL-encoded: our keys contain
        // a UUID and slashes, and an unencoded special character silently
        // resolves to the wrong source object.
        CopySource: encodeURI(`${this.bucketName}/${fromKey}`),
        Key: toKey,
      }),
    );
  }
}
