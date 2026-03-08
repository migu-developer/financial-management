// Minimal React Native mock for node test environment
const noop = () => null;

module.exports = {
  View: noop,
  Text: noop,
  TextInput: noop,
  TouchableOpacity: noop,
  Pressable: noop,
  ScrollView: noop,
  Image: noop,
  ActivityIndicator: noop,
  useColorScheme: jest.fn(() => 'light'),
  ColorSchemeName: undefined,
  StyleSheet: {
    create: (styles: unknown) => styles,
    flatten: (style: unknown) => style,
  },
  Platform: {
    OS: 'web',
    select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
};
