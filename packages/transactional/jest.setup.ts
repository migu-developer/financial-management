import React from 'react';

/**
 * Mock Tailwind from @react-email/components to avoid "component suspended" in React 19
 * when using renderToStaticMarkup in tests. The real Tailwind component may use APIs that suspend.
 */
jest.mock('@react-email/components', () => {
  const actual = jest.requireActual<typeof import('@react-email/components')>(
    '@react-email/components',
  );
  return {
    ...actual,
    Tailwind: ({ children }: { children?: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});
