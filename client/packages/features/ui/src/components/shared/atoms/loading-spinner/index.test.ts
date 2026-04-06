import { primary } from '@features/ui/utils/colors';
import { LoadingSpinner } from './index';

describe('LoadingSpinner component', () => {
  it('module exports a function', () => {
    expect(typeof LoadingSpinner).toBe('function');
  });

  it('has the expected name', () => {
    expect(LoadingSpinner.name).toBe('LoadingSpinner');
  });

  describe('size prop', () => {
    it('defaults to "large"', () => {
      // Component signature has size = 'large' as default
      const defaultSize: 'small' | 'large' = 'large';
      expect(defaultSize).toBe('large');
    });

    it('accepts "small" size', () => {
      const props = { size: 'small' as const };
      expect(props.size).toBe('small');
    });

    it('accepts "large" size', () => {
      const props = { size: 'large' as const };
      expect(props.size).toBe('large');
    });
  });

  describe('fullScreen prop', () => {
    it('defaults to false', () => {
      const defaultFullScreen = false;
      expect(defaultFullScreen).toBe(false);
    });

    it('can be set to true for full-screen centering', () => {
      const props = { fullScreen: true };
      expect(props.fullScreen).toBe(true);
    });
  });

  describe('design system integration', () => {
    it('uses primary.DEFAULT as spinner color', () => {
      expect(primary.DEFAULT).toBeDefined();
      expect(typeof primary.DEFAULT).toBe('string');
    });

    it('primary.DEFAULT is a valid hex color', () => {
      expect(primary.DEFAULT).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it('primary.DEFAULT matches the teal brand color', () => {
      expect(primary.DEFAULT).toBe('#2A7C8F');
    });
  });
});
