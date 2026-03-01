import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountUpdateVerificationEmail from './account-update-verification';

describe('AccountUpdateVerificationEmail (es)', () => {
  it('renders with Cognito placeholder for code', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccountUpdateVerificationEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('cambio en tu cuenta');
    expect(html).toContain('{####}');
  });
});
