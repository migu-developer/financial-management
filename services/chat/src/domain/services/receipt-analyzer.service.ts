/**
 * Fields lifted off a receipt image. Every field is optional — a crumpled
 * photo may only yield a total, and the workflow must still work with a
 * partial result (the HITL preview lets the user correct it).
 */
export interface AnalyzedReceipt {
  merchant?: string;
  /** Total as printed on the receipt, normalized to a plain number string. */
  total?: string;
  /** ISO-4217 code when the receipt states one, e.g. `COP`, `USD`. */
  currency?: string;
  /** Purchase date as printed, `YYYY-MM-DD` when parseable. */
  date?: string;
  /**
   * Lowest confidence (0-100) among the fields that were extracted. Used to
   * decide whether to trust the reading or ask the user to confirm.
   */
  confidence?: number;
}

export interface AnalyzeReceiptInput {
  /** S3 key of the uploaded image, `chat-attachments/{userId}/{uuid}.{ext}`. */
  s3Key: string;
}

/**
 * Port for reading structured expense data out of a receipt image.
 *
 * The concrete adapter (`TextractReceiptAnalyzer`) calls Textract
 * `AnalyzeExpense`, which is purpose-built for receipts and invoices and
 * returns labelled summary fields rather than raw OCR lines — so we do not
 * need an LLM to guess which number is the total.
 */
export interface ReceiptAnalyzerService {
  analyze(input: AnalyzeReceiptInput): Promise<AnalyzedReceipt>;
}
