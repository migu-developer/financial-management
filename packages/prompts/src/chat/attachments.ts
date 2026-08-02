/**
 * Receipt-attachment text templates.
 *
 * When a user sends a photo of a receipt, Textract `AnalyzeExpense` returns
 * labelled fields — not prose. Those fields are rendered into Spanish text
 * and spliced into `$.content` BEFORE intent classification, so the whole
 * existing pipeline (classify → extract → validate → preview) keeps working
 * unchanged and sees the receipt as if the user had typed it out.
 *
 * This lives in `@packages/prompts` rather than in the Lambda because it is
 * prompt-visible text: the intent classifier and the field extractor both
 * read it, so a wording change here changes model behaviour.
 */

/**
 * Marker that opens the machine-extracted block. The extraction prompt keys
 * off this phrase to prefer receipt data over anything ambiguous in the
 * user's caption.
 */
export const RECEIPT_BLOCK_HEADER = 'Datos extraídos del recibo adjunto';

/** Caption used when the user sends a photo with no text of their own. */
export const RECEIPT_DEFAULT_CAPTION =
  'Registra este gasto a partir de la foto del recibo que adjunté.';

/** Shown when Textract read the image but found no usable expense fields. */
export const RECEIPT_UNREADABLE_NOTE =
  'No se pudieron leer datos del recibo adjunto; pide los datos al usuario.';

export interface ReceiptTextFields {
  merchant?: string;
  total?: string;
  currency?: string;
  date?: string;
}

/**
 * Renders the extracted fields as a labelled Spanish block appended to the
 * user's caption. Only fields that were actually extracted are listed, so the
 * model is never shown an empty or `null` label it might hallucinate around.
 *
 * @param caption - the user's own message; may be empty
 * @param fields - whatever Textract managed to read
 */
export const buildReceiptContent = (
  caption: string,
  fields: ReceiptTextFields,
): string => {
  const head = caption.trim() || RECEIPT_DEFAULT_CAPTION;

  const lines = [
    fields.merchant && `- Comercio: ${fields.merchant}`,
    fields.total && `- Total: ${fields.total}`,
    fields.currency && `- Moneda: ${fields.currency}`,
    fields.date && `- Fecha: ${fields.date}`,
  ].filter((line): line is string => Boolean(line));

  if (lines.length === 0) {
    return `${head}\n\n${RECEIPT_UNREADABLE_NOTE}`;
  }

  return `${head}\n\n${RECEIPT_BLOCK_HEADER}:\n${lines.join('\n')}`;
};
