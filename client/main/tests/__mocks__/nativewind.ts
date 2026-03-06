module.exports = {
  useColorScheme: jest.fn(() => ({
    colorScheme: 'light',
    toggleColorScheme: jest.fn(),
    setColorScheme: jest.fn(),
  })),
};
