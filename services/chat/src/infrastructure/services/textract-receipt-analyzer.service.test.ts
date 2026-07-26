import {
  TextractReceiptAnalyzer,
  normalizeAmount,
  normalizeDate,
} from './textract-receipt-analyzer.service';
import type { TextractClient } from '@aws-sdk/client-textract';

jest.mock('@services/shared/infrastructure/decorators/trace', () => ({
  trace: () => () => undefined,
}));

describe('normalizeAmount', () => {
  it.each([
    ['$48.900', '48900'],
    ['48,900', '48900'],
    ['COP 1.234.567', '1234567'],
    ['1,234.56', '1234.56'],
    ['1.234,56', '1234.56'],
    ['12000', '12000'],
    ['12.00', '12'],
  ])('normalizes %s to %s', (raw, expected) => {
    expect(normalizeAmount(raw)).toBe(expected);
  });

  it('returns undefined when there are no digits at all', () => {
    expect(normalizeAmount('N/A')).toBeUndefined();
    expect(normalizeAmount('')).toBeUndefined();
  });
});

describe('normalizeDate', () => {
  it('passes through ISO dates', () => {
    expect(normalizeDate('2026-07-20')).toBe('2026-07-20');
    expect(normalizeDate('2026-07-20T10:00:00Z')).toBe('2026-07-20');
  });

  it('reads slashed dates as day-first (the target locale)', () => {
    expect(normalizeDate('20/07/2026')).toBe('2026-07-20');
    expect(normalizeDate('5/7/26')).toBe('2026-07-05');
    expect(normalizeDate('20-07-2026')).toBe('2026-07-20');
  });

  it('returns undefined for shapes it cannot read, instead of guessing', () => {
    expect(normalizeDate('July 20th')).toBeUndefined();
    expect(normalizeDate('20/13/2026')).toBeUndefined();
  });
});

describe('TextractReceiptAnalyzer', () => {
  /** Returns the fake client plus its `send` spy, so calls stay typed. */
  const makeClient = (response: unknown) => {
    const send = jest.fn<Promise<unknown>, [{ input: unknown }]>();
    send.mockResolvedValue(response);
    return { client: { send } as unknown as TextractClient, send };
  };

  const field = (type: string, text: string, confidence = 99) => ({
    Type: { Text: type },
    ValueDetection: { Text: text, Confidence: confidence },
  });

  it('maps Textract summary fields onto the domain shape', async () => {
    const { client } = makeClient({
      ExpenseDocuments: [
        {
          SummaryFields: [
            field('VENDOR_NAME', 'Crepes & Waffles ', 98),
            field('TOTAL', '$48.900', 95),
            field('CURRENCY', 'cop', 90),
            field('INVOICE_RECEIPT_DATE', '20/07/2026', 93),
          ],
        },
      ],
    });

    const result = await new TextractReceiptAnalyzer('bucket', client).analyze({
      s3Key: 'chat-attachments/u/1.jpg',
    });

    expect(result).toEqual({
      merchant: 'Crepes & Waffles',
      total: '48900',
      currency: 'COP',
      date: '2026-07-20',
      // Weakest of the four, not the average or the first.
      confidence: 90,
    });
  });

  it('returns an empty reading when Textract found no summary fields', async () => {
    const { client } = makeClient({ ExpenseDocuments: [] });

    const result = await new TextractReceiptAnalyzer('bucket', client).analyze({
      s3Key: 'chat-attachments/u/1.jpg',
    });

    expect(result).toEqual({});
  });

  it('omits a total it could not normalize and excludes it from confidence', async () => {
    const { client } = makeClient({
      ExpenseDocuments: [
        {
          SummaryFields: [
            field('VENDOR_NAME', 'Tienda', 88),
            field('TOTAL', 'ilegible', 10),
          ],
        },
      ],
    });

    const result = await new TextractReceiptAnalyzer('bucket', client).analyze({
      s3Key: 'chat-attachments/u/1.jpg',
    });

    expect(result.total).toBeUndefined();
    expect(result.merchant).toBe('Tienda');
    // The unreadable total's 10% confidence must not drag the score down for a
    // field we discarded anyway.
    expect(result.confidence).toBe(88);
  });

  it('reads the document straight from S3 rather than downloading bytes', async () => {
    const { client, send } = makeClient({ ExpenseDocuments: [] });

    await new TextractReceiptAnalyzer('my-bucket', client).analyze({
      s3Key: 'chat-attachments/u/1.jpg',
    });

    expect(send.mock.calls[0]?.[0].input).toEqual({
      Document: {
        S3Object: { Bucket: 'my-bucket', Name: 'chat-attachments/u/1.jpg' },
      },
    });
  });

  it('ignores summary fields whose value is blank', async () => {
    const { client } = makeClient({
      ExpenseDocuments: [
        {
          SummaryFields: [
            field('VENDOR_NAME', '   ', 99),
            field('TOTAL', '900', 99),
          ],
        },
      ],
    });

    const result = await new TextractReceiptAnalyzer('bucket', client).analyze({
      s3Key: 'chat-attachments/u/1.jpg',
    });

    expect(result.merchant).toBeUndefined();
    expect(result.total).toBe('900');
  });
});
