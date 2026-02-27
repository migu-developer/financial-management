import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountVerificationEmail from './account-verification';

describe('AccountVerificationEmail (en)', () => {
  it('renders with preview and verification code', () => {
    const props = AccountVerificationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AccountVerificationEmail, props),
    );
    expect(html).toContain('Verify your email');
    expect(html).toContain('Verify your email address');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
