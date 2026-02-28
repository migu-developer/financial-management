import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import PasswordResetEmail from './password-reset';

describe('PasswordResetEmail (es)', () => {
  it('renders with Cognito placeholder for code', () => {
    const html = renderToStaticMarkup(
      React.createElement(PasswordResetEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('Recuperación de contraseña');
    expect(html).toContain('{####}');
  });
});
