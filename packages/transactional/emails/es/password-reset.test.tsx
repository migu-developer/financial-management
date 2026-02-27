import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordResetEmail from './password-reset';

describe('PasswordResetEmail (es)', () => {
  it('renders with password reset code', () => {
    const props = PasswordResetEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(PasswordResetEmail, props),
    );
    expect(html).toContain('Recuperación de contraseña');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
