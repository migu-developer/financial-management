import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountVerificationEmail from './account-verification';

describe('AccountVerificationEmail (es)', () => {
  it('renders with Cognito placeholder for code', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccountVerificationEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('Verifica tu correo');
    expect(html).toContain('Verifica tu correo electrónico');
    expect(html).toContain('{####}');
  });
});
