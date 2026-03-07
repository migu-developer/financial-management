import { RegisterPage } from './index';

describe('RegisterPage', () => {
  it('exports a function', () => {
    expect(typeof RegisterPage).toBe('function');
  });

  it('has the expected name', () => {
    expect(RegisterPage.name).toBe('RegisterPage');
  });
});
