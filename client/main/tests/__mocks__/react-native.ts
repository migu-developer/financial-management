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
  StyleSheet: {
    create: (s: unknown) => s,
    flatten: (s: unknown) => s,
  },
  Platform: {
    OS: 'web',
    select: (obj: Record<string, unknown>) => obj.web ?? obj.default,
  },
  Dimensions: {
    get: () => ({ width: 375, height: 812 }),
  },
};
