import {
  PRIOR_RECEIPT_BLOCK_HEADER,
  RECEIPT_BLOCK_HEADER,
  RECEIPT_DEFAULT_CAPTION,
  RECEIPT_UNREADABLE_NOTE,
  buildPriorReceiptContext,
  buildReceiptContent,
  sanitizeReceiptFieldValue,
} from './attachments';

describe('buildReceiptContent', () => {
  it('keeps the user caption and appends the labelled receipt block', () => {
    const result = buildReceiptContent('esto fue el almuerzo', {
      merchant: 'Crepes & Waffles',
      total: '48900',
      currency: 'COP',
      date: '2026-07-20',
    });

    expect(result).toContain('esto fue el almuerzo');
    expect(result).toContain(RECEIPT_BLOCK_HEADER);
    expect(result).toContain('- Comercio: Crepes & Waffles');
    expect(result).toContain('- Total: 48900');
    expect(result).toContain('- Moneda: COP');
    expect(result).toContain('- Fecha: 2026-07-20');
  });

  it('substitutes a default caption when the user sent only a photo', () => {
    const result = buildReceiptContent('   ', { total: '12000' });

    expect(result).toContain(RECEIPT_DEFAULT_CAPTION);
    expect(result).toContain('- Total: 12000');
  });

  it('omits fields Textract could not read instead of emitting empty labels', () => {
    const result = buildReceiptContent('gasto', { total: '5000' });

    expect(result).toContain('- Total: 5000');
    expect(result).not.toContain('Comercio');
    expect(result).not.toContain('Moneda');
    expect(result).not.toContain('Fecha');
  });

  it('falls back to an explicit note when nothing could be extracted', () => {
    const result = buildReceiptContent('mira esto', {});

    expect(result).toContain('mira esto');
    expect(result).toContain(RECEIPT_UNREADABLE_NOTE);
    expect(result).not.toContain(RECEIPT_BLOCK_HEADER);
  });
});

describe('sanitizeReceiptFieldValue', () => {
  it('collapses the newlines Textract puts inside a vendor name', () => {
    // VERBATIM from production (receipt read 2026-08-05): AnalyzeExpense
    // returned the vendor block twice, newline-separated. Left as-is, those
    // newlines become extra unlabelled lines and corrupt every field after it.
    expect(
      sanitizeReceiptFieldValue('S.A.S\nINVERVARI\nS.A.S\nINVERVARI'),
    ).toBe('S.A.S INVERVARI');
  });

  it('collapses an exactly-doubled value', () => {
    expect(sanitizeReceiptFieldValue('EXITO EXITO')).toBe('EXITO');
    expect(sanitizeReceiptFieldValue('Pan Caliente Pan Caliente')).toBe(
      'Pan Caliente',
    );
  });

  it('is case-insensitive when detecting the doubling', () => {
    expect(sanitizeReceiptFieldValue('Exito EXITO')).toBe('Exito');
  });

  it('leaves a name that merely repeats a word alone', () => {
    // Not two identical halves — must not be truncated.
    expect(sanitizeReceiptFieldValue('Pan Pan Pan Bakery')).toBe(
      'Pan Pan Pan Bakery',
    );
    expect(sanitizeReceiptFieldValue('Duo Duo Cafe')).toBe('Duo Duo Cafe');
  });

  it('normalizes tabs and runs of spaces', () => {
    expect(sanitizeReceiptFieldValue('  SUPER \t  MERCADO \n ')).toBe(
      'SUPER MERCADO',
    );
  });

  it('returns empty for whitespace-only input', () => {
    expect(sanitizeReceiptFieldValue('   \n\t ')).toBe('');
  });
});

describe('buildReceiptContent — value sanitation', () => {
  it('never lets a multi-line field break the line-per-field structure', () => {
    const content = buildReceiptContent('mira esto', {
      merchant: 'S.A.S\nINVERVARI\nS.A.S\nINVERVARI',
      total: '251000',
      date: '2026-08-02',
    });

    // Exactly one line per field, plus caption and header.
    const fieldLines = content
      .split('\n')
      .filter((line) => line.startsWith('- '));
    expect(fieldLines).toEqual([
      '- Comercio: S.A.S INVERVARI',
      '- Total: 251000',
      '- Fecha: 2026-08-02',
    ]);
  });

  it('drops a field whose value was only whitespace', () => {
    const content = buildReceiptContent('x', {
      merchant: '   ',
      total: '100',
    });
    expect(content).not.toContain('Comercio');
    expect(content).toContain('- Total: 100');
  });
});

describe('buildPriorReceiptContext', () => {
  it('renders the stored fields under a distinct header', () => {
    const block = buildPriorReceiptContext({
      merchant: 'INVERVARI SAS',
      total: '251000',
      date: '2026-08-02',
    });

    expect(block).toContain(PRIOR_RECEIPT_BLOCK_HEADER);
    expect(block).toContain('- Comercio: INVERVARI SAS');
    expect(block).toContain('- Total: 251000');
    // The currency is precisely what the follow-up turn is asking for, so it
    // must not appear invented here.
    expect(block).not.toContain('Moneda');
  });

  it('uses a header the model cannot confuse with a freshly read receipt', () => {
    // On a follow-up turn the user's message is often one word; the model has to
    // MERGE with these fields rather than replace them.
    expect(PRIOR_RECEIPT_BLOCK_HEADER).not.toBe(RECEIPT_BLOCK_HEADER);
    expect(PRIOR_RECEIPT_BLOCK_HEADER).toContain('anterior');
  });

  it('returns an empty string when nothing was stored', () => {
    // The state machine interpolates this unconditionally, like `history`.
    expect(buildPriorReceiptContext({})).toBe('');
    expect(buildPriorReceiptContext({ merchant: '  ' })).toBe('');
  });
});
