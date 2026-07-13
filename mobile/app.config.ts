import type { ExpoConfig } from 'expo/config'

/**
 * Query & Buy — Expo app config.
 * API host comes from EXPO_PUBLIC_API_URL (defaults to production); the
 * scheme + universal links mirror PRODUCTION_CUTOVER_RUNBOOK deep-link setup.
 */
const config: ExpoConfig = {
  name: 'Query & Buy',
  slug: 'query-and-buy',
  scheme: 'queryandbuy',
  version: '0.1.0',
  orientation: 'portrait',
  userInterfaceStyle: 'automatic',
  newArchEnabled: true,
  ios: {
    bundleIdentifier: 'ae.queryandbuy.app',
    supportsTablet: false,
    associatedDomains: ['applinks:queryandbuy.com'],
  },
  android: {
    package: 'ae.queryandbuy.app',
    edgeToEdgeEnabled: true,
    intentFilters: [
      {
        action: 'VIEW',
        autoVerify: true,
        data: [{ scheme: 'https', host: 'queryandbuy.com', pathPrefix: '/listing' }],
        category: ['BROWSABLE', 'DEFAULT'],
      },
    ],
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-font', 'expo-notifications'],
  experiments: { typedRoutes: true },
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL ?? 'https://queryandbuy.com',
  },
}

export default config
