import type {
  AttachmentStorageService,
  CreateDownloadUrlResult,
} from '@services/chat/domain/services/attachment-storage.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';

export interface CreateAttachmentDownloadUrlInput {
  /** Normalized key (`chat-ready/...`) of the attachment to read back. */
  s3Key: string;
}

/**
 * Presigns a read of one attachment so the chat can render the photo a user
 * sent, without ever making the bucket public.
 *
 * The user id comes from the Cognito authorizer, never from the request body.
 * The adapter then asserts the key's owner segment matches, which is what stops
 * one user from requesting a URL for another user's receipt.
 */
export class CreateAttachmentDownloadUrlUseCase {
  constructor(private readonly storage: AttachmentStorageService) {}

  async execute(
    input: CreateAttachmentDownloadUrlInput,
    userId: string,
  ): Promise<CreateDownloadUrlResult> {
    if (!input.s3Key || typeof input.s3Key !== 'string') {
      throw new BadRequestError('s3Key is required');
    }

    return this.storage.createDownloadUrl({ userId, s3Key: input.s3Key });
  }
}
