// Minimal React Native mock for node test environment
const noop = () => null;

const animatedValue = (value: number) => ({
  _value: value,
  setValue: jest.fn(),
  interpolate: jest.fn(() => ({ __interpolation: true })),
});

module.exports = {
  View: noop,
  Text: noop,
  TouchableOpacity: noop,
  Pressable: noop,
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
  Animated: {
    Value: jest.fn((v: number) => animatedValue(v)),
    View: noop,
    timing: jest.fn(() => ({
      start: jest.fn((cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
      }),
    })),
    spring: jest.fn(() => ({
      start: jest.fn((cb?: (result: { finished: boolean }) => void) => {
        cb?.({ finished: true });
      }),
    })),
  },
};
