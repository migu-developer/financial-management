import { PhoneInput } from './index';

describe('PhoneInput', () => {
  it('exports a function', () => {
    expect(typeof PhoneInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(PhoneInput.name).toBe('PhoneInput');
  });
});
