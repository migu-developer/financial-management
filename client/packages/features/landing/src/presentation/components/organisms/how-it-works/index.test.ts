import { primary, accent } from '@features/ui/utils/colors';

describe('HowItWorksSection — color configuration', () => {
  it('primary[600] is used for the first step icon (create)', () => {
    expect(primary[600]).toBe('#2A7C8F');
  });

  it('accent[600] is used for the second step icon (analyze)', () => {
    expect(accent[600]).toBe('#9A7CD4');
  });

  it('step icon colors are distinct', () => {
    expect(primary[600]).not.toBe(accent[600]);
  });

  it('both step icon colors are valid hex strings', () => {
    [primary[600], accent[600]].forEach((color) => {
      expect(typeof color).toBe('string');
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });
});
