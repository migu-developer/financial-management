import { OtpInput } from './index';

describe('OtpInput', () => {
  it('exports a function', () => {
    expect(typeof OtpInput).toBe('function');
  });

  it('has the expected name', () => {
    expect(OtpInput.name).toBe('OtpInput');
  });
});
