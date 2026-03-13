import { MfaVerifyTemplate } from './index';

describe('MfaVerifyTemplate', () => {
  it('exports a function', () => {
    expect(typeof MfaVerifyTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(MfaVerifyTemplate.name).toBe('MfaVerifyTemplate');
  });
});
