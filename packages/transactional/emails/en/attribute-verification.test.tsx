import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AttributeVerificationEmail from './attribute-verification';

describe('AttributeVerificationEmail (en)', () => {
  it('renders with verification code', () => {
    const props = AttributeVerificationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AttributeVerificationEmail, props),
    );
    expect(html).toContain('contact information');
    expect(html).toContain(props.verificationCode ?? '');
  });
});
