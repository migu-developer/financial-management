import ServiceAlertEmail from './service-alert';

describe('ServiceAlertEmail (ES)', () => {
  it('exports a function component', () => {
    expect(typeof ServiceAlertEmail).toBe('function');
  });

  it('has PreviewProps defined', () => {
    expect(ServiceAlertEmail.PreviewProps).toBeDefined();
    expect(ServiceAlertEmail.PreviewProps.severity).toBe('CRITICAL');
  });
});
