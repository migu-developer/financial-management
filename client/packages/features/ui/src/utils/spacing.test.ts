import {
  spacing,
  borderRadius,
  boxShadow,
  lightboxInset,
  mediaSize,
  space,
} from './spacing';

describe('spacing — design system tokens', () => {
  describe('spacing', () => {
    it('exports custom spacing steps', () => {
      expect(spacing['18']).toBe('4.5rem');
      expect(spacing['22']).toBe('5.5rem');
      expect(spacing['128']).toBe('32rem');
      expect(spacing['144']).toBe('36rem');
    });

    it('all values are rem strings', () => {
      Object.values(spacing).forEach((v) => {
        expect(v).toMatch(/^\d+(\.\d+)?rem$/);
      });
    });
  });

  describe('borderRadius', () => {
    it('exports 2xl and 4xl variants', () => {
      expect(borderRadius['2xl']).toBe('1rem');
      expect(borderRadius['4xl']).toBe('2rem');
    });

    it('all values are rem strings', () => {
      Object.values(borderRadius).forEach((v) => {
        expect(v).toMatch(/^\d+(\.\d+)?rem$/);
      });
    });
  });

  describe('boxShadow', () => {
    it('exports card and card-md', () => {
      expect(boxShadow.card).toBeDefined();
      expect(boxShadow['card-md']).toBeDefined();
    });

    it('card is a valid CSS box-shadow string', () => {
      expect(typeof boxShadow.card).toBe('string');
      expect(boxShadow.card.length).toBeGreaterThan(0);
    });

    it('card-md is more complex than card (more shadows)', () => {
      expect(boxShadow['card-md']).not.toBe(boxShadow.card);
    });
  });
});

describe('mediaSize — chat attachment', () => {
  it('fixes BOTH axes', () => {
    // The bug: `width: '100%'` made the image inherit the bubble width, which is
    // set by the text — so the same photo rendered wide next to a long caption
    // and narrow next to "ok".
    expect(typeof mediaSize.chatAttachment.width).toBe('number');
    expect(typeof mediaSize.chatAttachment.height).toBe('number');
  });

  it('fits the narrowest drawer a phone can give', () => {
    // 375dp phone → 85% drawer → 80% bubble → less 2×space.sm of padding.
    const usable = 375 * 0.85 * 0.8 - space.sm * 2;
    expect(mediaSize.chatAttachment.width).toBeLessThanOrEqual(usable);
  });

  it('leaves room for the lightbox inset inside the web drawer', () => {
    // 380dp is the web drawer; an expanded photo must still fit with its inset.
    expect(380 - lightboxInset * 2).toBeGreaterThan(
      mediaSize.chatAttachment.width,
    );
  });
});
