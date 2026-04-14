import ServiceAlertEmail from './service-alert';

describe('ServiceAlertEmail (EN)', () => {
  it('exports a function component', () => {
    expect(typeof ServiceAlertEmail).toBe('function');
  });

  it('has PreviewProps defined', () => {
    expect(ServiceAlertEmail.PreviewProps).toBeDefined();
    expect(ServiceAlertEmail.PreviewProps.alarmName).toBe('API-5xx-Errors');
    expect(ServiceAlertEmail.PreviewProps.severity).toBe('CRITICAL');
  });
});
