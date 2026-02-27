import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordResetEmail from './password-reset';

describe('PasswordResetEmail (en)', () => {
  it('renders with password reset code', () => {
    const props = PasswordResetEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(PasswordResetEmail, props),
    );
    expect(html).toContain('Password recovery');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
