import {
  RECEIPT_BLOCK_HEADER,
  RECEIPT_DEFAULT_CAPTION,
  RECEIPT_UNREADABLE_NOTE,
  buildReceiptContent,
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
