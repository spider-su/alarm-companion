import type { ExpoConfig, ConfigContext } from 'expo/config';

const appName = process.env.APP_NAME ?? 'Mobile Starter';
const slug = process.env.APP_SLUG ?? 'mobile-starter';

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
  android: {
    ...config.android,
    ...(process.env.ANDROID_PACKAGE ? { package: process.env.ANDROID_PACKAGE } : {})
  },
  plugins: ['expo-system-ui'],
  extra: {
    ...config.extra,
    ...(process.env.EAS_PROJECT_ID
      ? { eas: { ...config.extra?.eas, projectId: process.env.EAS_PROJECT_ID } }
      : {})
  }
});
