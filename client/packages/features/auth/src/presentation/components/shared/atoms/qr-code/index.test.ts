import { QrCode } from './index';

describe('QrCode', () => {
  it('exports a function', () => {
    expect(typeof QrCode).toBe('function');
  });

  it('has the expected name', () => {
    expect(QrCode.name).toBe('QrCode');
  });
});
