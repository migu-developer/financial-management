import type {
  ChatAttachmentExtraction,
  ChatMessage,
} from '@services/chat/domain/entities/chat-message';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';

export interface PersistReceiptExtractionInput {
  /** The user message that carried the attachment. */
  messageId: string;
  userId: string;
  extraction: ChatAttachmentExtraction;
}

export interface PersistReceiptExtractionResult {
  /** False when there was nothing worth storing. */
  stored: boolean;
}

/**
 * Stores what Textract read, so a follow-up turn can finish the expense without
 * analyzing the attachment again.
 *
 * Runs immediately after the read rather than at the end of the workflow: if a
 * later step fails, the expensive part (a rate-limited Textract call against an
 * image that gets deleted after 7 days) is already banked.
 */
export class PersistReceiptExtractionUseCase {
  constructor(private readonly messageRepository: ChatMessageRepository) {}

  async execute(
    input: PersistReceiptExtractionInput,
  ): Promise<PersistReceiptExtractionResult> {
    const extraction = pruneEmpty(input.extraction);

    // An unreadable receipt yields nothing. Writing `{}` would make the next
    // turn believe it has receipt context and feed the prompt an empty block,
    // so store nothing and let the row stay NULL.
    if (Object.keys(extraction).length === 0) return { stored: false };

    await this.messageRepository.saveAttachmentExtraction(
      input.messageId,
      input.userId,
      extraction,
      input.userId,
    );

    return { stored: true };
  }
}

/**
 * Drops keys Textract did not fill.
 *
 * `undefined` survives a JSON round-trip as a missing key, but an explicit
 * `null` would be stored and then replayed to the prompt as a known-empty
 * field — which is not the same as "we never read this".
 */
const pruneEmpty = (
  extraction: ChatAttachmentExtraction,
): ChatAttachmentExtraction =>
  Object.fromEntries(
    Object.entries(extraction).filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    ),
  ) as ChatAttachmentExtraction;

/** Exported for the read path, which needs the same "is there anything?" test. */
export const hasExtractedFields = (
  extraction: ChatMessage['attachment_extraction'],
): boolean => extraction !== null && Object.keys(extraction).length > 0;
