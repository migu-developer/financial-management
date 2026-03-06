import { primary, accent, success, warning } from '@features/ui/utils/colors';

describe('FeaturesSection — color configuration', () => {
  it('primary[600] is the teal brand color', () => {
    expect(primary[600]).toBe('#2A7C8F');
  });

  it('accent[600] is the lavender brand color', () => {
    expect(accent[600]).toBe('#9A7CD4');
  });

  it('success.DEFAULT is the emerald analytics color', () => {
    expect(success.DEFAULT).toBe('#10B981');
  });

  it('warning.DEFAULT is the amber multi-currency color', () => {
    expect(warning.DEFAULT).toBe('#F59E0B');
  });

  it('all feature icon colors are defined strings', () => {
    const featureColors = [
      primary[600],
      success.DEFAULT,
      warning.DEFAULT,
      accent[600],
    ];
    featureColors.forEach((color) => {
      expect(typeof color).toBe('string');
      expect(color.startsWith('#')).toBe(true);
    });
  });
});
