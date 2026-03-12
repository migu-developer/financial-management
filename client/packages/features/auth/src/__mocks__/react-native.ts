// Minimal React Native mock for node test environment
const noop = () => null;

module.exports = {
  View: noop,
  Text: noop,
  TextInput: noop,
  TouchableOpacity: noop,
  Pressable: noop,
  ScrollView: noop,
  FlatList: noop,
  Modal: noop,
  Image: noop,
  ActivityIndicator: noop,
  Keyboard: {
    dismiss: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
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
