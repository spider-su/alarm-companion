import type { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.APP_NAME ?? 'Alarm Companion';
const slug = process.env.APP_SLUG ?? 'alarm-companion';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug,
  version: process.env.APP_VERSION ?? '1.0.0',
  orientation: 'portrait',
  icon: './assets/alarm-companion-icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    ...config.ios,
    supportsTablet: false,
    ...(process.env.IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER } : {})
  },
  plugins: ['expo-system-ui', 'expo-asset', '@react-native-community/datetimepicker', ['expo-audio', { microphonePermission: 'Allow $(PRODUCT_NAME) to record short voice messages.', recordAudioAndroid: true }], ['expo-notifications', { defaultChannel: 'routines' }], './plugins/withAlarmCompanion'],
  android: {
    ...config.android,
    package: process.env.ANDROID_PACKAGE ?? 'com.spidersu.alarmcompanion',
    adaptiveIcon: {
      foregroundImage: './assets/alarm-companion-icon-foreground.png',
      backgroundColor: '#073B27'
    },
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
