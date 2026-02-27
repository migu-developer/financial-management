import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountVerificationEmail from './account-verification';

describe('AccountVerificationEmail (es)', () => {
  it('renders with preview and verification code', () => {
    const props = AccountVerificationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AccountVerificationEmail, props),
    );
    expect(html).toContain('Verifica tu correo');
    expect(html).toContain('Verifica tu correo electrónico');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
