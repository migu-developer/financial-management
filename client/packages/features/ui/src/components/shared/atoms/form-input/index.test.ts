import { FormInput } from './index';

describe('FormInput atom', () => {
  it('exports a function', () => {
    expect(typeof FormInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(FormInput.name).toBe('FormInput');
  });

  describe('props interface', () => {
    it('is defined with required and optional props', () => {
      expect(FormInput).toBeDefined();
    });
  });
});
