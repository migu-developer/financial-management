module.exports = {
  openURL: jest.fn().mockResolvedValue(undefined),
  createURL: jest.fn().mockReturnValue(''),
  canOpenURL: jest.fn().mockResolvedValue(true),
};
