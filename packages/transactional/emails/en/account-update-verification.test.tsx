import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AccountUpdateVerificationEmail from './account-update-verification';

describe('AccountUpdateVerificationEmail (en)', () => {
  it('renders with change verification code', () => {
    const props = AccountUpdateVerificationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AccountUpdateVerificationEmail, props),
    );
    expect(html).toContain('change to your account');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
