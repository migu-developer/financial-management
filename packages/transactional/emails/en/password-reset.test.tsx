import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordResetEmail from './password-reset';

describe('PasswordResetEmail (en)', () => {
  it('renders with password reset code', () => {
    const html = renderToStaticMarkup(
      React.createElement(PasswordResetEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('Password recovery');
    expect(html).toContain('{####}');
  });
});
