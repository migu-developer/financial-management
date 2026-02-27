import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AttributeVerificationEmail from './attribute-verification';

describe('AttributeVerificationEmail (es)', () => {
  it('renders with verification code', () => {
    const props = AttributeVerificationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AttributeVerificationEmail, props),
    );
    expect(html).toContain('información de contacto');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
