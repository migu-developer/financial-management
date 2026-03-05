import { Platform } from 'react-native';

export enum PlatformOS {
  WEB = 'web',
  MOBILE = 'mobile',
  ANDROID = 'android',
  IOS = 'ios',
  WINDOWS = 'windows',
  MACOS = 'macos',
}

export const isWeb = () => Platform.OS === PlatformOS.WEB;

export const isMobile = () =>
  Platform.OS === PlatformOS.IOS || Platform.OS === PlatformOS.ANDROID;

export const isAndroid = () => Platform.OS === PlatformOS.ANDROID;

export const isIOS = () => Platform.OS === PlatformOS.IOS;

export const isWindows = () => Platform.OS === PlatformOS.WINDOWS;

export const isMacOS = () => Platform.OS === PlatformOS.MACOS;
