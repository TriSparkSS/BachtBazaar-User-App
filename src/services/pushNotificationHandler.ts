import messaging, {
  FirebaseMessagingTypes,
} from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logApiEvent } from './apiClient';
import {
  parsePushMessage,
  presentForegroundPush,
  PushNotificationPayload,
  routePushNotification,
} from './pushNotificationRouter';

const PENDING_PUSH_KEY = '@bachatbazaar/pending_push_notification';

let lastOpenedMessageId: string | null = null;
let listenersReady = false;

const messageKey = (message?: FirebaseMessagingTypes.RemoteMessage | null) => {
  if (!message) {
    return null;
  }
  return (
    message.messageId ||
    `${message.sentTime || ''}:${JSON.stringify(message.data || {})}`
  );
};

export const savePendingPush = async (
  payload: PushNotificationPayload,
): Promise<void> => {
  await AsyncStorage.setItem(PENDING_PUSH_KEY, JSON.stringify(payload));
};

export const consumePendingPush = async (): Promise<PushNotificationPayload | null> => {
  const raw = await AsyncStorage.getItem(PENDING_PUSH_KEY);
  if (!raw) {
    return null;
  }
  await AsyncStorage.removeItem(PENDING_PUSH_KEY);
  try {
    return JSON.parse(raw) as PushNotificationPayload;
  } catch {
    return null;
  }
};

const handleOpenedMessage = async (
  remoteMessage?: FirebaseMessagingTypes.RemoteMessage | null,
) => {
  const key = messageKey(remoteMessage);
  if (key && key === lastOpenedMessageId) {
    return;
  }
  if (key) {
    lastOpenedMessageId = key;
  }

  const payload = parsePushMessage(remoteMessage);
  if (!payload) {
    logApiEvent('Push open ignored', {
      data: remoteMessage?.data,
    });
    return;
  }

  logApiEvent('Push opened', { type: payload.type, data: payload.data });
  await routePushNotification(payload);
};

export const registerBackgroundPushHandler = () => {
  messaging().setBackgroundMessageHandler(async remoteMessage => {
    const payload = parsePushMessage(remoteMessage);
    logApiEvent('Push background', {
      type: payload?.type,
      data: remoteMessage.data,
    });
    if (payload) {
      await savePendingPush(payload);
    }
  });
};

export const consumePendingPushAfterAuth = async (): Promise<boolean> => {
  const pending = await consumePendingPush();
  if (!pending) {
    return false;
  }
  await routePushNotification(pending);
  return true;
};

export const initPushNotificationListeners = (): (() => void) => {
  if (listenersReady) {
    return () => undefined;
  }
  listenersReady = true;

  const unsubForeground = messaging().onMessage(async remoteMessage => {
    const payload = parsePushMessage(remoteMessage);
    if (!payload) {
      return;
    }
    logApiEvent('Push foreground', { type: payload.type, data: payload.data });
    presentForegroundPush(payload);
  });

  const unsubOpened = messaging().onNotificationOpenedApp(remoteMessage => {
    void handleOpenedMessage(remoteMessage);
  });

  void messaging()
    .getInitialNotification()
    .then(remoteMessage => {
      if (remoteMessage) {
        void handleOpenedMessage(remoteMessage);
      }
    });

  return () => {
    listenersReady = false;
    unsubForeground();
    unsubOpened();
  };
};
