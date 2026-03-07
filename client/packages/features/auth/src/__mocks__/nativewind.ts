// Minimal nativewind mock for node test environment
module.exports = {
  useColorScheme: () => ({
    colorScheme: 'light',
    toggleColorScheme: () => {},
    setColorScheme: () => {},
  }),
};
