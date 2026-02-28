import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountVerificationEmail from './account-verification';

describe('AccountVerificationEmail (en)', () => {
  it('renders with Cognito placeholder for code', () => {
    const html = renderToStaticMarkup(
      React.createElement(AccountVerificationEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('Verify your email');
    expect(html).toContain('Verify your email address');
    expect(html).toContain('{####}');
  });
});
