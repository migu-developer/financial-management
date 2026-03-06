const noop = () => null;

module.exports = {
  StatusBar: noop,
  setStatusBarStyle: jest.fn(),
  setStatusBarHidden: jest.fn(),
};
