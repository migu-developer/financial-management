import {
  AnalyzeReceiptUseCase,
  assertKeyOwnedBy,
} from './analyze-receipt.use-case';
import type { ReceiptAnalyzerService } from '@services/chat/domain/services/receipt-analyzer.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';
import {
  RECEIPT_BLOCK_HEADER,
  RECEIPT_UNREADABLE_NOTE,
} from '@packages/prompts/chat/attachments';

const USER_ID = 'user-123';
const VALID_KEY = `chat-attachments/${USER_ID}/8f14e45f.jpg`;

const makeAnalyzer = (
  result: Awaited<ReturnType<ReceiptAnalyzerService['analyze']>>,
): jest.Mocked<ReceiptAnalyzerService> => ({
  analyze: jest.fn().mockResolvedValue(result),
});

describe('assertKeyOwnedBy', () => {
  it('accepts a key minted for the same user', () => {
    expect(() => assertKeyOwnedBy(VALID_KEY, USER_ID)).not.toThrow();
  });

  it("rejects another user's key", () => {
    expect(() =>
      assertKeyOwnedBy('chat-attachments/attacker/8f14e45f.jpg', USER_ID),
    ).toThrow(BadRequestError);
  });

  it('rejects traversal that would escape the owner prefix', () => {
    expect(() =>
      assertKeyOwnedBy(
        `chat-attachments/${USER_ID}/../victim/receipt.jpg`,
        USER_ID,
      ),
    ).toThrow(BadRequestError);
  });

  it('rejects keys outside the attachments prefix', () => {
    expect(() =>
      assertKeyOwnedBy('emails/en/service-alert.html', USER_ID),
    ).toThrow(BadRequestError);
  });

  it('rejects extra nested segments under the owner prefix', () => {
    expect(() =>
      assertKeyOwnedBy(
        `chat-attachments/${USER_ID}/nested/receipt.jpg`,
        USER_ID,
      ),
    ).toThrow(BadRequestError);
  });

  it('rejects a key with no object name', () => {
    expect(() =>
      assertKeyOwnedBy(`chat-attachments/${USER_ID}/`, USER_ID),
    ).toThrow(BadRequestError);
  });

  it('rejects a userId prefix collision (user-1 must not match user-12)', () => {
    expect(() =>
      assertKeyOwnedBy('chat-attachments/user-12/receipt.jpg', 'user-1'),
    ).toThrow(BadRequestError);
  });
});

describe('AnalyzeReceiptUseCase', () => {
  it('folds the extracted fields into the message content', async () => {
    const analyzer = makeAnalyzer({
      merchant: 'Exito',
      total: '48900',
      currency: 'COP',
      date: '2026-07-20',
      confidence: 97.5,
    });

    const result = await new AnalyzeReceiptUseCase(analyzer).execute({
      userId: USER_ID,
      s3Key: VALID_KEY,
      caption: 'mercado del sabado',
    });

    expect(analyzer.analyze).toHaveBeenCalledWith({ s3Key: VALID_KEY });
    expect(result.extracted).toBe(true);
    expect(result.confidence).toBe(97.5);
    expect(result.enrichedContent).toContain('mercado del sabado');
    expect(result.enrichedContent).toContain(RECEIPT_BLOCK_HEADER);
    expect(result.enrichedContent).toContain('- Total: 48900');
  });

  it('degrades gracefully when nothing could be read', async () => {
    const analyzer = makeAnalyzer({});

    const result = await new AnalyzeReceiptUseCase(analyzer).execute({
      userId: USER_ID,
      s3Key: VALID_KEY,
      caption: 'este gasto',
    });

    // A blurry photo must NOT fail the execution — it routes to the normal
    // clarification branch instead.
    expect(result.extracted).toBe(false);
    expect(result.confidence).toBeUndefined();
    expect(result.enrichedContent).toContain(RECEIPT_UNREADABLE_NOTE);
  });

  it('treats a partial reading as extracted', async () => {
    const analyzer = makeAnalyzer({ total: '12000', confidence: 61 });

    const result = await new AnalyzeReceiptUseCase(analyzer).execute({
      userId: USER_ID,
      s3Key: VALID_KEY,
      caption: '',
    });

    expect(result.extracted).toBe(true);
    expect(result.confidence).toBe(61);
  });

  it('never calls Textract when the key is not owned by the user', async () => {
    const analyzer = makeAnalyzer({});

    await expect(
      new AnalyzeReceiptUseCase(analyzer).execute({
        userId: USER_ID,
        s3Key: 'chat-attachments/someone-else/receipt.jpg',
        caption: '',
      }),
    ).rejects.toThrow(BadRequestError);

    expect(analyzer.analyze).not.toHaveBeenCalled();
  });
});
