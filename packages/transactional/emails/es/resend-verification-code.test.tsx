import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ResendVerificationCodeEmail from './resend-verification-code';

describe('ResendVerificationCodeEmail (es)', () => {
  it('renders with new verification code', () => {
    const props = ResendVerificationCodeEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(ResendVerificationCodeEmail, props),
    );
    expect(html).toContain('nuevo código');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
