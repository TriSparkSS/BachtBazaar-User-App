import { PermissionsAndroid, Platform } from 'react-native';
import messaging from '@react-native-firebase/messaging';
import { logApiEvent } from './apiClient';

let cachedToken: string | null = null;
let inflight: Promise<string | undefined> | null = null;

const requestAndroidNotificationPermission = async () => {
  if (Platform.OS !== 'android' || Platform.Version < 33) {
    return true;
  }

  try {
    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    return result === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
};

/**
 * Create / refresh an FCM device token for push notifications.
 * Safe to call on login — returns undefined if unavailable (login still proceeds).
 */
export const getFcmToken = async (): Promise<string | undefined> => {
  if (cachedToken) {
    return cachedToken;
  }
  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      await requestAndroidNotificationPermission();

      if (Platform.OS === 'ios') {
        await messaging().registerDeviceForRemoteMessages();
      }

      await messaging().requestPermission();
      const token = (await messaging().getToken())?.trim();
      if (!token) {
        logApiEvent('FCM token missing', { platform: Platform.OS });
        return undefined;
      }

      cachedToken = token;
      logApiEvent('FCM token ready', {
        platform: Platform.OS,
        tokenPreview: `${token.slice(0, 12)}…`,
      });
      return token;
    } catch (error) {
      logApiEvent('FCM token error', {
        platform: Platform.OS,
        error: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
};

export const clearCachedFcmToken = () => {
  cachedToken = null;
};

/** Prefer server-returned FCM token when verify/login responses include one. */
export const cacheFcmTokenFromResponse = (token?: string | null) => {
  const normalized = token?.trim();
  if (!normalized) {
    return;
  }
  cachedToken = normalized;
  logApiEvent('FCM token from API', {
    tokenPreview: `${normalized.slice(0, 12)}…`,
  });
};
