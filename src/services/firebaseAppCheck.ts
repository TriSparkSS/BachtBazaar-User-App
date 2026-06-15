import { Platform } from 'react-native';
import appCheck from '@react-native-firebase/app-check';
import { APP_CHECK_DEBUG_TOKEN } from '../config/debug';
import { logApiEvent } from './apiClient';

let initPromise: Promise<void> | null = null;

export const initializeFirebaseAppCheck = (): Promise<void> => {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
      const debugTokenConfig =
        __DEV__ && APP_CHECK_DEBUG_TOKEN.trim().length > 0
          ? { debugToken: APP_CHECK_DEBUG_TOKEN.trim() }
          : {};

      provider.configure({
        android: {
          provider: __DEV__ ? 'debug' : 'playIntegrity',
          ...debugTokenConfig,
        },
        apple: {
          provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback',
          ...debugTokenConfig,
        },
      });

      await appCheck().initializeAppCheck({
        provider,
        isTokenAutoRefreshEnabled: true,
      });

      if (__DEV__) {
        try {
          const { token } = await appCheck().getToken(true);
          logApiEvent('Firebase App Check ready (debug)', {
            platform: Platform.OS,
            tokenPreview: token ? `${token.slice(0, 12)}…` : undefined,
            hint: 'Register this debug token in Firebase Console → App Check if phone OTP fails.',
          });
        } catch (tokenError) {
          logApiEvent('Firebase App Check token note', {
            platform: Platform.OS,
            error: tokenError instanceof Error ? tokenError.message : String(tokenError),
          });
        }
      } else {
        logApiEvent('Firebase App Check ready (production)', {
          platform: Platform.OS,
        });
      }
    } catch (error) {
      logApiEvent('Firebase App Check init failed', {
        platform: Platform.OS,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  })();

  return initPromise;
};

export const ensureFirebaseAppCheck = () => initializeFirebaseAppCheck();
