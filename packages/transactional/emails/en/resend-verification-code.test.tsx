import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResendVerificationCodeEmail from './resend-verification-code';

describe('ResendVerificationCodeEmail (en)', () => {
  it('renders with new verification code', () => {
    const html = renderToStaticMarkup(
      React.createElement(ResendVerificationCodeEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('new code');
    expect(html).toContain('{####}');
  });
});
