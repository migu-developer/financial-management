import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminInvitationEmail from './admin-invitation';

describe('AdminInvitationEmail (es)', () => {
  it('renders with username and temporary password', () => {
    const props = AdminInvitationEmail.PreviewProps;
    const html = renderToStaticMarkup(
      React.createElement(AdminInvitationEmail, props),
    );
    expect(html).toContain('Te hemos creado una cuenta');
    expect(html).toContain(props.username ?? '');
    expect(html).toContain(props.temporaryPassword ?? '');
  });
});
