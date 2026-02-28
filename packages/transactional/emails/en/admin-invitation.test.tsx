import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminInvitationEmail from './admin-invitation';

describe('AdminInvitationEmail (en)', () => {
  it('renders with Cognito placeholders for username and password', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminInvitationEmail, {
        username: '{username}',
        temporaryPassword: '{####}',
      }),
    );
    expect(html).toContain('account has been created');
    expect(html).toContain('{username}');
    expect(html).toContain('{####}');
  });
});
