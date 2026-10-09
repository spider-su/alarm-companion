import type { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.APP_NAME ?? 'Alarm Companion';
const slug = process.env.APP_SLUG ?? 'alarm-companion';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug,
  version: process.env.APP_VERSION ?? '1.0.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    supportsTablet: false,
    ...(process.env.IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER } : {})
  },
  plugins: ['expo-system-ui', 'expo-asset', ['expo-notifications', { defaultChannel: 'routines' }]],
  android: {
    ...config.android,
    package: process.env.ANDROID_PACKAGE ?? 'com.spidersu.alarmcompanion',
    permissions: ['POST_NOTIFICATIONS', 'VIBRATE'],
    blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW', 'android.permission.READ_EXTERNAL_STORAGE', 'android.permission.WRITE_EXTERNAL_STORAGE']
  },
  extra: {
    ...config.extra,
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { ...config.extra?.eas, projectId: process.env.EAS_PROJECT_ID } }
      : {})
  }
});
