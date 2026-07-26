import { AnalyzeReceiptUseCase } from './analyze-receipt.use-case';
import type { ReceiptAnalyzerService } from '@services/chat/domain/services/receipt-analyzer.service';
import { BadRequestError } from '@packages/models/shared/utils/errors';
import {
  ATTACHMENT_READY_PREFIX,
  ATTACHMENT_UPLOAD_PREFIX,
} from '@packages/models/chat/attachment-keys';
import {
  RECEIPT_BLOCK_HEADER,
  RECEIPT_UNREADABLE_NOTE,
} from '@packages/prompts/chat/attachments';

const USER_ID = 'user-123';
const READY_KEY = `${ATTACHMENT_READY_PREFIX}/${USER_ID}/8f14e45f.jpg`;

const makeAnalyzer = (
  result: Awaited<ReturnType<ReceiptAnalyzerService['analyze']>>,
): jest.Mocked<ReceiptAnalyzerService> => ({
  analyze: jest.fn().mockResolvedValue(result),
});

// Exhaustive key-validation coverage lives with the shared helper, in
// `@packages/models/chat/attachment-keys.test.ts`. The cases here assert this
// use case WIRES it correctly — in particular which prefix it demands.
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
      s3Key: READY_KEY,
      caption: 'mercado del sabado',
    });

    expect(analyzer.analyze).toHaveBeenCalledWith({ s3Key: READY_KEY });
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
      s3Key: READY_KEY,
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
      s3Key: READY_KEY,
      caption: '',
    });

    expect(result.extracted).toBe(true);
    expect(result.confidence).toBe(61);
  });

  it('REJECTS a raw upload key — Textract only ever reads normalized images', async () => {
    const analyzer = makeAnalyzer({});

    await expect(
      new AnalyzeReceiptUseCase(analyzer).execute({
        userId: USER_ID,
        s3Key: `${ATTACHMENT_UPLOAD_PREFIX}/${USER_ID}/8f14e45f.heic`,
        caption: '',
      }),
    ).rejects.toThrow(BadRequestError);

    // Only the image-processing workflow's role can write to the ready prefix,
    // so demanding that prefix is what proves the image went through
    // normalization.
    expect(analyzer.analyze).not.toHaveBeenCalled();
  });

  it("never calls Textract with another user's key", async () => {
    const analyzer = makeAnalyzer({});

    await expect(
      new AnalyzeReceiptUseCase(analyzer).execute({
        userId: USER_ID,
        s3Key: `${ATTACHMENT_READY_PREFIX}/someone-else/receipt.jpg`,
        caption: '',
      }),
    ).rejects.toThrow(BadRequestError);

    expect(analyzer.analyze).not.toHaveBeenCalled();
  });
});
