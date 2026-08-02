import type { ReceiptAnalyzerService } from '@services/chat/domain/services/receipt-analyzer.service';
import { buildReceiptContent } from '@packages/prompts/chat/attachments';
import { BadRequestError } from '@packages/models/shared/utils/errors';
import { ATTACHMENT_PREFIX } from '@services/chat/infrastructure/services/s3-attachment-storage.service';

export interface AnalyzeReceiptInput {
  /** Owner of the conversation — must match the key's owner segment. */
  userId: string;
  /** Key returned by `POST /chat/upload-url`. */
  s3Key: string;
  /** The user's own caption; may be empty when they sent only a photo. */
  caption: string;
}

export interface AnalyzeReceiptOutput {
  /**
   * `caption` + the labelled receipt block. Replaces `$.content` in the state
   * machine so intent classification and field extraction see the receipt as
   * ordinary user text — no downstream state needs to know about attachments.
   */
  enrichedContent: string;
  /** True when Textract returned at least one usable field. */
  extracted: boolean;
  /** Weakest per-field confidence (0-100), absent when nothing was read. */
  confidence?: number;
}

/**
 * Asserts the key was minted for this user by `createUploadUrl`.
 *
 * The key travels to the client and back, so it is untrusted input on the way
 * in. Without this check a caller could pass another user's key (or a key
 * pointing at an unrelated object in the bucket) and have its contents read
 * into their own conversation.
 */
export const assertKeyOwnedBy = (s3Key: string, userId: string): void => {
  const expectedPrefix = `${ATTACHMENT_PREFIX}/${userId}/`;

  // Reject traversal before the prefix comparison: `chat-attachments/me/../you/x`
  // starts with the right prefix but does not resolve inside it.
  if (s3Key.includes('..') || !s3Key.startsWith(expectedPrefix)) {
    throw new BadRequestError(
      `Attachment key does not belong to the requesting user: ${s3Key}`,
    );
  }

  // Exactly one path segment (the object name) may follow the owner prefix.
  const remainder = s3Key.slice(expectedPrefix.length);
  if (remainder.length === 0 || remainder.includes('/')) {
    throw new BadRequestError(`Malformed attachment key: ${s3Key}`);
  }
};

/**
 * Reads a receipt image and folds what it finds into the message text.
 *
 * Deliberately never throws on a poor reading: a blurry photo yields
 * `extracted: false` and a note telling the model to ask the user for the
 * data, which lands the conversation in the normal clarification branch
 * instead of failing the execution.
 */
export class AnalyzeReceiptUseCase {
  constructor(private readonly analyzer: ReceiptAnalyzerService) {}

  async execute(input: AnalyzeReceiptInput): Promise<AnalyzeReceiptOutput> {
    assertKeyOwnedBy(input.s3Key, input.userId);

    const receipt = await this.analyzer.analyze({ s3Key: input.s3Key });

    const extracted = Boolean(
      receipt.merchant ?? receipt.total ?? receipt.currency ?? receipt.date,
    );

    return {
      enrichedContent: buildReceiptContent(input.caption, receipt),
      extracted,
      ...(receipt.confidence !== undefined && {
        confidence: receipt.confidence,
      }),
    };
  }
}
