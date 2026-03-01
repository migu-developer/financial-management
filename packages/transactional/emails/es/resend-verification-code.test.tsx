import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResendVerificationCodeEmail from './resend-verification-code';

describe('ResendVerificationCodeEmail (es)', () => {
  it('renders with Cognito placeholder for code', () => {
    const html = renderToStaticMarkup(
      React.createElement(ResendVerificationCodeEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('nuevo código');
    expect(html).toContain('{####}');
  });
});
