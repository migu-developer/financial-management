module.exports = {
  maybeCompleteAuthSession: jest.fn().mockReturnValue({ type: 'failed' }),
  openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
  openBrowserAsync: jest.fn().mockResolvedValue({ type: 'cancel' }),
  dismissBrowser: jest.fn(),
  WebBrowserResultType: {
    CANCEL: 'cancel',
    DISMISS: 'dismiss',
    OPENED: 'opened',
    LOCKED: 'locked',
  },
};
