import { LoginTemplate } from './index';

describe('LoginTemplate', () => {
  it('exports a function', () => {
    expect(typeof LoginTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(LoginTemplate.name).toBe('LoginTemplate');
  });
});
