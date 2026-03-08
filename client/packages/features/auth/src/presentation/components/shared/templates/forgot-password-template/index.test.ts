import { ForgotPasswordTemplate } from './index';

describe('ForgotPasswordTemplate', () => {
  it('exports a function', () => {
    expect(typeof ForgotPasswordTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(ForgotPasswordTemplate.name).toBe('ForgotPasswordTemplate');
  });
});
