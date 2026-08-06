import type { ChatAttachmentExtraction } from '@services/chat/domain/entities/chat-message';
import type { ReceiptAnalyzerService } from '@services/chat/domain/services/receipt-analyzer.service';
import { buildReceiptContent } from '@packages/prompts/chat/attachments';
import {
  ATTACHMENT_READY_PREFIX,
  assertKeyOwnedBy,
} from '@packages/models/chat/attachment-keys';

export interface AnalyzeReceiptInput {
  /** Owner of the conversation — must match the key's owner segment. */
  userId: string;
  /** Normalized key from the `attachment_ready` event (`chat-ready/...`). */
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
  /**
   * The same fields in STRUCTURED form, for `PersistReceiptExtraction` to bank.
   *
   * `enrichedContent` is prose aimed at a model; this is the machine-readable
   * copy a later turn merges with the user's answer. Keeping both means a
   * follow-up never has to re-parse the prose — or re-read the image.
   */
  extraction: ChatAttachmentExtraction;
}

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
    // Must be a NORMALIZED key. Only the image-processing workflow's role can
    // write to that prefix, so a valid key is proof the image was normalized —
    // the client cannot point Textract at a raw upload.
    assertKeyOwnedBy(input.s3Key, input.userId, ATTACHMENT_READY_PREFIX);

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
      extraction: {
        ...(receipt.merchant !== undefined && { merchant: receipt.merchant }),
        ...(receipt.total !== undefined && { total: receipt.total }),
        ...(receipt.currency !== undefined && { currency: receipt.currency }),
        ...(receipt.date !== undefined && { date: receipt.date }),
        ...(receipt.confidence !== undefined && {
          confidence: receipt.confidence,
        }),
      },
    };
  }
}
