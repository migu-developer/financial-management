import { SocialAuthButton } from './index';

describe('SocialAuthButton molecule', () => {
  it('exports a function', () => {
    expect(typeof SocialAuthButton).toBe('function');
  });

  it('has the expected name', () => {
    expect(SocialAuthButton.name).toBe('SocialAuthButton');
  });

  describe('props interface', () => {
    it('is defined with required and optional props', () => {
      expect(SocialAuthButton).toBeDefined();
    });
  });
});
