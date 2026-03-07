import { RegisterTemplate } from './index';

describe('RegisterTemplate', () => {
  it('exports a function', () => {
    expect(typeof RegisterTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(RegisterTemplate.name).toBe('RegisterTemplate');
  });
});
