import { ConfirmForgotPasswordTemplate } from './index';

describe('ConfirmForgotPasswordTemplate', () => {
  it('exports a function', () => {
    expect(typeof ConfirmForgotPasswordTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(ConfirmForgotPasswordTemplate.name).toBe(
      'ConfirmForgotPasswordTemplate',
    );
  });
});
