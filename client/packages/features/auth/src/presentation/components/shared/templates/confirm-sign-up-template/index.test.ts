import { ConfirmSignUpTemplate } from './index';

describe('ConfirmSignUpTemplate', () => {
  it('exports a function', () => {
    expect(typeof ConfirmSignUpTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(ConfirmSignUpTemplate.name).toBe('ConfirmSignUpTemplate');
  });
});
