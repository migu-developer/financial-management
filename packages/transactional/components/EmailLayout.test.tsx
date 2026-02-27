import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmailLayout, type EmailFooterCopy } from './EmailLayout';

const mockFooter: EmailFooterCopy = {
  help: 'Test help text',
  legal: 'Test legal',
  rights: 'Test rights',
  privacy: 'Test privacy link',
};

describe('EmailLayout', () => {
  it('renders layout with preview, children and footer', () => {
    const html = renderToStaticMarkup(
      React.createElement(
        EmailLayout,
        { preview: 'Test preview', footer: mockFooter },
        React.createElement('span', null, 'Child content'),
      ),
    );
    expect(html).toContain('Test preview');
    expect(html).toContain('Child content');
    expect(html).toContain('Test help text');
    expect(html).toContain('Test legal');
    expect(html).toContain('Test rights');
    expect(html).toContain('Test privacy link');
  });

  it('includes current year in footer', () => {
    const html = renderToStaticMarkup(
      React.createElement(EmailLayout, {
        preview: 'Preview',
        footer: mockFooter,
      }),
    );
    expect(html).toContain(String(new Date().getFullYear()));
  });
});
