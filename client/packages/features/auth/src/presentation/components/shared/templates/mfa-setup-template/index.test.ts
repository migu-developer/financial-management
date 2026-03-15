import { MfaSetupTemplate } from './index';

describe('MfaSetupTemplate', () => {
  it('exports a function', () => {
    expect(typeof MfaSetupTemplate).toBe('function');
  });

  it('has the expected name', () => {
    expect(MfaSetupTemplate.name).toBe('MfaSetupTemplate');
  });
});
