import {
  AnalyzeExpenseCommand,
  TextractClient,
  type ExpenseField,
} from '@aws-sdk/client-textract';
import type {
  AnalyzedReceipt,
  AnalyzeReceiptInput,
  ReceiptAnalyzerService,
} from '@services/chat/domain/services/receipt-analyzer.service';
import { trace } from '@services/shared/infrastructure/decorators/trace';

/**
 * Textract `AnalyzeExpense` summary-field labels we care about.
 *
 * Textract normalizes many printed variants ("TOTAL", "Importe total",
 * "Amount Due") onto these canonical types, which is precisely why this is
 * preferable to raw OCR plus an LLM guess.
 */
const FIELD_TYPES = {
  merchant: ['VENDOR_NAME', 'SUPPLIER_NAME'],
  total: ['TOTAL', 'AMOUNT_PAID'],
  currency: ['CURRENCY'],
  date: ['INVOICE_RECEIPT_DATE'],
} as const;

/**
 * Strips currency symbols and separators off a printed total.
 *
 * `.` and `,` swap roles between locales, so which one is the decimal point
 * has to be inferred from the shape of the number rather than assumed:
 *
 * - **Both separators present** → the rightmost one is the decimal point.
 *   `1.234,56` (es-CO) and `1,234.56` (en-US) both give `1234.56`.
 * - **One separator, appearing more than once** → thousands.
 *   `1.234.567` → `1234567`.
 * - **One separator, appearing once** → decided by the trailing group length:
 *   exactly 3 digits means thousands (`$48.900` in es-CO is forty-eight
 *   thousand nine hundred, NOT 48.9); 1 or 2 digits means a decimal
 *   (`12.00` → `12`).
 *
 * The last rule mis-reads a US price written as `1.500` for one dollar fifty,
 * but that shape is not how prices are printed (they carry 2 decimals), while
 * 3-digit thousands groups are on every Colombian receipt.
 */
export const normalizeAmount = (raw: string): string | undefined => {
  const cleaned = raw.replace(/[^\d.,]/g, '');
  if (!/\d/.test(cleaned)) return undefined;

  const commas = (cleaned.match(/,/g) ?? []).length;
  const dots = (cleaned.match(/\./g) ?? []).length;

  const splitAt = (index: number): string =>
    `${cleaned.slice(0, index).replace(/[.,]/g, '')}.${cleaned.slice(index + 1).replace(/[.,]/g, '')}`;

  let normalized: string;
  if (commas > 0 && dots > 0) {
    normalized = splitAt(
      Math.max(cleaned.lastIndexOf(','), cleaned.lastIndexOf('.')),
    );
  } else if (commas + dots === 0) {
    normalized = cleaned;
  } else if (commas + dots > 1) {
    // Repeated single separator can only be a thousands grouping.
    normalized = cleaned.replace(/[.,]/g, '');
  } else {
    const index = commas === 1 ? cleaned.indexOf(',') : cleaned.indexOf('.');
    const trailing = cleaned.length - index - 1;
    normalized = trailing === 3 ? cleaned.replace(/[.,]/g, '') : splitAt(index);
  }

  // Drop a trailing `.00` so whole amounts read cleanly in the preview.
  const asNumber = Number(normalized);
  if (!Number.isFinite(asNumber)) return undefined;
  return String(asNumber);
};

/** Normalizes the many printed date shapes onto `YYYY-MM-DD` when possible. */
export const normalizeDate = (raw: string): string | undefined => {
  const trimmed = raw.trim();

  // Already ISO.
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  // DD/MM/YYYY or DD-MM-YYYY. Latin-American receipts are day-first, and that
  // is the locale this product targets — an en-US month-first reading would
  // silently mis-date every expense from the 13th onward.
  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(trimmed);
  if (dmy) {
    const [, d, m, y] = dmy;
    const year = y!.length === 2 ? `20${y}` : y!;
    const month = m!.padStart(2, '0');
    const day = d!.padStart(2, '0');
    if (Number(month) >= 1 && Number(month) <= 12) {
      return `${year}-${month}-${day}`;
    }
  }

  // Unrecognized shape: hand the raw text to the model rather than guessing.
  return undefined;
};

const findField = (
  fields: ExpenseField[],
  types: readonly string[],
): ExpenseField | undefined =>
  fields.find(
    (field) =>
      field.Type?.Text !== undefined &&
      types.includes(field.Type.Text) &&
      Boolean(field.ValueDetection?.Text?.trim()),
  );

/**
 * Textract adapter for `ReceiptAnalyzerService`.
 *
 * Uses the SYNCHRONOUS `AnalyzeExpense` API: it accepts a single-page image
 * straight from S3 and returns labelled summary fields in one call, so the
 * Step Function needs no polling loop (unlike the async document APIs).
 */
export class TextractReceiptAnalyzer implements ReceiptAnalyzerService {
  constructor(
    private readonly bucketName: string,
    private readonly client: TextractClient = new TextractClient({}),
  ) {}

  @trace('Textract:analyzeExpense')
  async analyze(input: AnalyzeReceiptInput): Promise<AnalyzedReceipt> {
    const response = await this.client.send(
      new AnalyzeExpenseCommand({
        Document: {
          S3Object: { Bucket: this.bucketName, Name: input.s3Key },
        },
      }),
    );

    const summaryFields = (response.ExpenseDocuments ?? []).flatMap(
      (doc) => doc.SummaryFields ?? [],
    );

    if (summaryFields.length === 0) return {};

    const merchant = findField(summaryFields, FIELD_TYPES.merchant);
    const total = findField(summaryFields, FIELD_TYPES.total);
    const currency = findField(summaryFields, FIELD_TYPES.currency);
    const date = findField(summaryFields, FIELD_TYPES.date);

    const normalizedTotal = total?.ValueDetection?.Text
      ? normalizeAmount(total.ValueDetection.Text)
      : undefined;
    const normalizedDate = date?.ValueDetection?.Text
      ? normalizeDate(date.ValueDetection.Text)
      : undefined;

    // Report the WEAKEST confidence among the fields we actually kept, so a
    // caller deciding whether to trust the reading is not misled by one
    // high-confidence field next to a barely-legible total.
    const confidences = [
      merchant,
      normalizedTotal ? total : undefined,
      currency,
      normalizedDate ? date : undefined,
    ]
      .map((field) => field?.ValueDetection?.Confidence)
      .filter((value): value is number => typeof value === 'number');

    return {
      ...(merchant?.ValueDetection?.Text && {
        merchant: merchant.ValueDetection.Text.trim(),
      }),
      ...(normalizedTotal && { total: normalizedTotal }),
      ...(currency?.ValueDetection?.Text && {
        currency: currency.ValueDetection.Text.trim().toUpperCase(),
      }),
      ...(normalizedDate && { date: normalizedDate }),
      ...(confidences.length > 0 && {
        confidence: Math.min(...confidences),
      }),
    };
  }
}
