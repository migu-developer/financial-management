import ServiceAlertEmail from './service-alert';
import { ALERT_STAGE } from '@utils/alert-constants';

describe('ServiceAlertEmail (ES)', () => {
  it('exports a function component', () => {
    expect(typeof ServiceAlertEmail).toBe('function');
  });

  it('has PreviewProps defined', () => {
    expect(ServiceAlertEmail.PreviewProps).toBeDefined();
    expect(ServiceAlertEmail.PreviewProps.severity).toBe('CRITICAL');
  });

  it('accepts stage prop with default placeholder', () => {
    expect(ALERT_STAGE).toBe('{{stage}}');
  });

  it('accepts explicit stage value', () => {
    const el = ServiceAlertEmail({ stage: 'PROD' });
    expect(el).toBeDefined();
  });
});
