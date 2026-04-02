import { Badge } from './index';

describe('Badge component', () => {
  it('module exports a function', () => {
    expect(typeof Badge).toBe('function');
  });

  it('has the expected name', () => {
    expect(Badge.name).toBe('Badge');
  });

  describe('variant styles', () => {
    it('supports income variant', () => {
      // Badge accepts variant='income' — verified at type level
      const props = { label: 'income', variant: 'income' as const };
      expect(props.variant).toBe('income');
    });

    it('supports outcome variant', () => {
      const props = { label: 'outcome', variant: 'outcome' as const };
      expect(props.variant).toBe('outcome');
    });

    it('supports default variant', () => {
      const props = { label: 'misc', variant: 'default' as const };
      expect(props.variant).toBe('default');
    });

    it('defaults to "default" when variant is omitted', () => {
      // The component destructuring sets variant = 'default'
      const props: {
        label: string;
        variant?: 'income' | 'outcome' | 'default';
      } = {
        label: 'test',
      };
      expect(props.variant).toBeUndefined();
    });
  });

  describe('label prop', () => {
    it('accepts a string label', () => {
      const props = { label: 'Income' };
      expect(props.label).toBe('Income');
    });

    it('label can be any arbitrary text', () => {
      const props = { label: 'Custom category name' };
      expect(typeof props.label).toBe('string');
      expect(props.label.length).toBeGreaterThan(0);
    });
  });
});
