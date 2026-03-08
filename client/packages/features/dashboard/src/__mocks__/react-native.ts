// Minimal React Native mock for node test environment
const noop = () => null;

module.exports = {
  View: noop,
  Text: noop,
  TouchableOpacity: noop,
  ScrollView: noop,
  ActivityIndicator: noop,
  useColorScheme: jest.fn(() => 'light'),
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
  Platform: {
    OS: 'web',
    select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
  },
};
