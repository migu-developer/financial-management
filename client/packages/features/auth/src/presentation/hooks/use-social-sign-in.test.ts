import { useSocialSignIn } from './use-social-sign-in';

describe('useSocialSignIn', () => {
  it('exports useSocialSignIn as a function', () => {
    expect(typeof useSocialSignIn).toBe('function');
  });

  it('has the expected name', () => {
    expect(useSocialSignIn.name).toBe('useSocialSignIn');
  });
});
