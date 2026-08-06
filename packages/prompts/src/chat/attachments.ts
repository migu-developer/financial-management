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

/**
 * Marker that opens the block describing a receipt read on an EARLIER turn.
 *
 * Deliberately worded differently from `RECEIPT_BLOCK_HEADER` so the model can
 * tell "here is a receipt I just read" from "here is what we already knew":
 * on a follow-up turn the user's message is usually a single word answering a
 * question, and it must be merged with these fields rather than replacing them.
 */
export const PRIOR_RECEIPT_BLOCK_HEADER =
  'Datos ya extraídos del recibo en un mensaje anterior de esta conversación';

/**
 * Collapses a value Textract returned into something safe to put on one line.
 *
 * Two problems, both seen in production on a real receipt whose vendor block
 * was `"S.A.S\nINVERVARI\nS.A.S\nINVERVARI"`:
 *
 *  1. EMBEDDED NEWLINES. The block below is a line-per-field list the prompts
 *     parse structurally; a value containing newlines turns into extra
 *     unlabelled lines and corrupts every field after it.
 *  2. REPEATED TEXT. AnalyzeExpense concatenates each detected block, so a
 *     logo printed twice yields the name twice. Harmless to structure, but it
 *     becomes the expense's name, which the user then has to fix by hand.
 */
export const sanitizeReceiptFieldValue = (raw: string): string => {
  const flat = raw.replace(/\s+/g, ' ').trim();
  if (!flat) return '';

  // Exactly-doubled value ("X X") → "X". Anchored on the whole string so a
  // legitimately repeating name ("Pan Pan Pan Bakery") is left alone unless it
  // is precisely two identical halves.
  const words = flat.split(' ');
  if (words.length % 2 === 0) {
    const half = words.length / 2;
    const first = words.slice(0, half).join(' ');
    const second = words.slice(half).join(' ');
    if (first.toLowerCase() === second.toLowerCase()) return first;
  }

  return flat;
};

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

  const lines = buildFieldLines(fields);

  if (lines.length === 0) {
    return `${head}\n\n${RECEIPT_UNREADABLE_NOTE}`;
  }

  return `${head}\n\n${RECEIPT_BLOCK_HEADER}:\n${lines.join('\n')}`;
};

/** Shared line renderer: every value is sanitized before it reaches a prompt. */
const buildFieldLines = (fields: ReceiptTextFields): string[] => {
  const label = (name: string, value: string | undefined): string | null => {
    const clean = value ? sanitizeReceiptFieldValue(value) : '';
    return clean ? `- ${name}: ${clean}` : null;
  };

  return [
    label('Comercio', fields.merchant),
    label('Total', fields.total),
    label('Moneda', fields.currency),
    label('Fecha', fields.date),
  ].filter((line): line is string => line !== null);
};

/**
 * Renders a receipt read on an EARLIER turn, for the extraction prompt to merge
 * with the user's current message.
 *
 * Returns '' when there is nothing stored, so the caller can always interpolate
 * it — the state machine passes this as a plain string field, exactly like
 * `history`, which avoids a missing-path `States.Runtime` error.
 */
export const buildPriorReceiptContext = (fields: ReceiptTextFields): string => {
  const lines = buildFieldLines(fields);
  if (lines.length === 0) return '';

  return `${PRIOR_RECEIPT_BLOCK_HEADER}:\n${lines.join('\n')}`;
};
