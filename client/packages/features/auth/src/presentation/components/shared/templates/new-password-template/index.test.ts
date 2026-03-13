import { NewPasswordTemplate } from './index';

describe('NewPasswordTemplate', () => {
  it('exports a function', () => {
    expect(typeof NewPasswordTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(NewPasswordTemplate.name).toBe('NewPasswordTemplate');
  });
});
