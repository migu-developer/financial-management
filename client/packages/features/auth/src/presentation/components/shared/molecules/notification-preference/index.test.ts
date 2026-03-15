import { NotificationChannelEnum, NotificationPreference } from './index';
import type { NotificationChannel } from './index';

describe('NotificationPreference', () => {
  it('exports a function', () => {
    expect(typeof NotificationPreference).toBe('function');
  });

  it('has the expected name', () => {
    expect(NotificationPreference.name).toBe('NotificationPreference');
  });

  it('exports NotificationChannel type with correct options', () => {
    const channels: NotificationChannel[] = [
      NotificationChannelEnum.EMAIL,
      NotificationChannelEnum.SMS,
      NotificationChannelEnum.BOTH,
    ];
    expect(channels).toHaveLength(3);
    expect(channels).toContain('email');
    expect(channels).toContain('sms');
    expect(channels).toContain('both');
  });
});
