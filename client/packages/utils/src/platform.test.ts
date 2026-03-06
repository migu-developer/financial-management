jest.mock('react-native', () => ({
  Platform: { OS: 'ios' as string },
}));

import { Platform } from 'react-native';
import {
  PlatformOS,
  isAndroid,
  isIOS,
  isMacOS,
  isMobile,
  isWeb,
  isWindows,
} from './platform';

const platform = Platform as { OS: string };

beforeEach(() => {
  platform.OS = 'ios';
});

describe('PlatformOS', () => {
  it('defines the expected platform values', () => {
    expect(PlatformOS.WEB).toBe('web');
    expect(PlatformOS.MOBILE).toBe('mobile');
    expect(PlatformOS.ANDROID).toBe('android');
    expect(PlatformOS.IOS).toBe('ios');
    expect(PlatformOS.WINDOWS).toBe('windows');
    expect(PlatformOS.MACOS).toBe('macos');
  });
});

describe('isWeb', () => {
  it('returns true when Platform.OS is web', () => {
    platform.OS = 'web';
    expect(isWeb()).toBe(true);
  });

  it.each(['ios', 'android', 'windows', 'macos'])(
    'returns false when Platform.OS is %s',
    (os) => {
      platform.OS = os;
      expect(isWeb()).toBe(false);
    },
  );
});

describe('isMobile', () => {
  it('returns true when Platform.OS is ios', () => {
    platform.OS = 'ios';
    expect(isMobile()).toBe(true);
  });

  it('returns true when Platform.OS is android', () => {
    platform.OS = 'android';
    expect(isMobile()).toBe(true);
  });

  it.each(['web', 'windows', 'macos'])(
    'returns false when Platform.OS is %s',
    (os) => {
      platform.OS = os;
      expect(isMobile()).toBe(false);
    },
  );
});

describe('isAndroid', () => {
  it('returns true when Platform.OS is android', () => {
    platform.OS = 'android';
    expect(isAndroid()).toBe(true);
  });

  it.each(['ios', 'web', 'windows', 'macos'])(
    'returns false when Platform.OS is %s',
    (os) => {
      platform.OS = os;
      expect(isAndroid()).toBe(false);
    },
  );
});

describe('isIOS', () => {
  it('returns true when Platform.OS is ios', () => {
    platform.OS = 'ios';
    expect(isIOS()).toBe(true);
  });

  it.each(['android', 'web', 'windows', 'macos'])(
    'returns false when Platform.OS is %s',
    (os) => {
      platform.OS = os;
      expect(isIOS()).toBe(false);
    },
  );
});

describe('isWindows', () => {
  it('returns true when Platform.OS is windows', () => {
    platform.OS = 'windows';
    expect(isWindows()).toBe(true);
  });

  it.each(['ios', 'android', 'web', 'macos'])(
    'returns false when Platform.OS is %s',
    (os) => {
      platform.OS = os;
      expect(isWindows()).toBe(false);
    },
  );
});

describe('isMacOS', () => {
  it('returns true when Platform.OS is macos', () => {
    platform.OS = 'macos';
    expect(isMacOS()).toBe(true);
  });

  it.each(['ios', 'android', 'web', 'windows'])(
    'returns false when Platform.OS is %s',
    (os) => {
      platform.OS = os;
      expect(isMacOS()).toBe(false);
    },
  );
});
