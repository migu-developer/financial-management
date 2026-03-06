const noop = () => null;

module.exports = {
  Stack: Object.assign(noop, { Screen: noop }),
  Tabs: Object.assign(noop, { Screen: noop }),
  Redirect: noop,
  Link: noop,
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    navigate: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({})),
  usePathname: jest.fn(() => '/'),
  useSegments: jest.fn(() => []),
};
