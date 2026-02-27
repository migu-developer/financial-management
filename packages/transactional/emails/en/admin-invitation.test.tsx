import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminInvitationEmail from './admin-invitation';

describe('AdminInvitationEmail (en)', () => {
  it('renders with username and temporary password', () => {
    const props = AdminInvitationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AdminInvitationEmail, props),
    );
    expect(html).toContain('account has been created');
    expect(html).toContain(props.username ?? '');
    expect(html).toContain(props.temporaryPassword ?? '');
  });
});
