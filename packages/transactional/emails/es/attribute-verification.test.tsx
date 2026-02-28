import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AttributeVerificationEmail from './attribute-verification';

describe('AttributeVerificationEmail (es)', () => {
  it('renders with Cognito placeholder for code', () => {
    const html = renderToStaticMarkup(
      React.createElement(AttributeVerificationEmail, {
        verificationCode: '{####}',
      }),
    );
    expect(html).toContain('información de contacto');
    expect(html).toContain('{####}');
  });
});
