import type {
  AttachmentStorageService,
  CreateUploadUrlResult,
} from '@services/chat/domain/services/attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';

export interface CreateAttachmentUploadUrlInput {
  /** MIME type of the file the client is about to upload. */
  contentType: string;
}

/**
 * Hands the client a presigned URL so it can upload a receipt photo directly
 * to S3, then send the resulting key on `POST /chat`.
 *
 * The user id comes from the Cognito authorizer, never from the request body —
 * that is what makes the generated key trustworthy later, when
 * `AnalyzeReceiptUseCase` verifies ownership from the key alone.
 */
export class CreateAttachmentUploadUrlUseCase {
  constructor(private readonly storage: AttachmentStorageService) {}

  async execute(
    input: CreateAttachmentUploadUrlInput,
    userId: string,
  ): Promise<CreateUploadUrlResult> {
    if (!input.contentType || typeof input.contentType !== 'string') {
      throw new BadRequestError('contentType is required');
    }

    return this.storage.createUploadUrl({
      userId,
      contentType: input.contentType,
    });
  }
}
