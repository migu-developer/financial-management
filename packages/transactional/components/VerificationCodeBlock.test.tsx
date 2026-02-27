import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { VerificationCodeBlock } from './VerificationCodeBlock';

describe('VerificationCodeBlock', () => {
  it('renders label and code', () => {
    const html = renderToStaticMarkup(
      React.createElement(VerificationCodeBlock, {
        label: 'Verification code',
        code: '123456',
      }),
    );
    expect(html).toContain('Verification code');
    expect(html).toContain('123456');
  });

  it('renders hint when provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(VerificationCodeBlock, {
        label: 'Code',
        code: '000000',
        hint: 'Valid for 10 minutes',
      }),
    );
    expect(html).toContain('Valid for 10 minutes');
  });

  it('does not render hint when not provided', () => {
    const html = renderToStaticMarkup(
      React.createElement(VerificationCodeBlock, {
        label: 'Code',
        code: '111111',
      }),
    );
    expect(html).toContain('111111');
    expect(html).not.toContain('Valid for');
  });
});
