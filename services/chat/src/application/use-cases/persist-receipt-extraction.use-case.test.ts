import {
  PersistReceiptExtractionUseCase,
  hasExtractedFields,
} from './persist-receipt-extraction.use-case';
import type { ChatMessageRepository } from '@services/chat/domain/repositories/chat-message.repository';
import type { ChatAttachmentExtraction } from '@services/chat/domain/entities/chat-message';

const MESSAGE_ID = 'msg-1';
const USER_ID = 'user-1';

const makeRepository = () =>
  ({
    saveAttachmentExtraction: jest.fn().mockResolvedValue(undefined),
  }) as unknown as jest.Mocked<ChatMessageRepository>;

describe('PersistReceiptExtractionUseCase', () => {
  it('stores the extraction against the message that carried the attachment', async () => {
    const repository = makeRepository();

    const result = await new PersistReceiptExtractionUseCase(
      repository,
    ).execute({
      messageId: MESSAGE_ID,
      userId: USER_ID,
      extraction: {
        merchant: 'INVERVARI SAS',
        total: '251000',
        date: '2026-08-02',
        confidence: 97.7,
      },
    });

    expect(result.stored).toBe(true);
    expect(repository.saveAttachmentExtraction).toHaveBeenCalledWith(
      MESSAGE_ID,
      USER_ID,
      {
        merchant: 'INVERVARI SAS',
        total: '251000',
        date: '2026-08-02',
        confidence: 97.7,
      },
      USER_ID,
    );
  });

  it('drops fields Textract did not fill', async () => {
    const repository = makeRepository();

    await new PersistReceiptExtractionUseCase(repository).execute({
      messageId: MESSAGE_ID,
      userId: USER_ID,
      // Cast because `exactOptionalPropertyTypes` forbids an explicit
      // `undefined`, yet the workflow payload arrives as JSON — so undefined and
      // '' genuinely reach this code at runtime. That is what is under test.
      extraction: {
        merchant: 'INVERVARI SAS',
        total: undefined,
        currency: '',
        date: '2026-08-02',
      } as unknown as ChatAttachmentExtraction,
    });

    // A stored empty string would be replayed as a known-empty currency, which
    // is not the same as never having read one.
    expect(repository.saveAttachmentExtraction).toHaveBeenCalledWith(
      MESSAGE_ID,
      USER_ID,
      { merchant: 'INVERVARI SAS', date: '2026-08-02' },
      USER_ID,
    );
  });

  it('writes nothing when the receipt was unreadable', async () => {
    const repository = makeRepository();

    const result = await new PersistReceiptExtractionUseCase(
      repository,
    ).execute({ messageId: MESSAGE_ID, userId: USER_ID, extraction: {} });

    // Storing `{}` would make the next turn think it has receipt context.
    expect(result.stored).toBe(false);
    expect(repository.saveAttachmentExtraction).not.toHaveBeenCalled();
  });

  it('treats an all-empty extraction the same as none', async () => {
    const repository = makeRepository();

    const result = await new PersistReceiptExtractionUseCase(
      repository,
    ).execute({
      messageId: MESSAGE_ID,
      userId: USER_ID,
      extraction: { merchant: '', currency: '' },
    });

    expect(result.stored).toBe(false);
    expect(repository.saveAttachmentExtraction).not.toHaveBeenCalled();
  });
});

describe('hasExtractedFields', () => {
  it.each([
    ['null', null, false],
    ['an empty object', {}, false],
    ['a populated extraction', { total: '1' }, true],
  ])('is %s → %s', (_label, extraction, expected) => {
    expect(hasExtractedFields(extraction as never)).toBe(expected);
  });
});
