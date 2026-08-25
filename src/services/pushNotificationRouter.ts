import { CommonActions } from '@react-navigation/native';
import { FirebaseMessagingTypes } from '@react-native-firebase/messaging';
import { navigationRef } from '../navigation/navigationService';
import { authStorage } from './authStorage';
import { bestRequestApi } from './bestRequestApi';
import { shopApi } from './shopApi';
import { logApiEvent } from './apiClient';
import { showAppAlert } from './appAlert';

export type PushNotificationPayload = {
  type: string;
  title?: string;
  body?: string;
  data: Record<string, string | undefined>;
};

const waitForNavigationReady = async (timeoutMs = 8000) => {
  const started = Date.now();
  while (!navigationRef.isReady()) {
    if (Date.now() - started > timeoutMs) {
      return false;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  return true;
};

const pickDataString = (
  data: Record<string, string | undefined>,
  ...keys: string[]
): string | undefined => {
  for (const key of keys) {
    const value = data[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
};

export const parsePushMessage = (
  remoteMessage?: FirebaseMessagingTypes.RemoteMessage | null,
): PushNotificationPayload | null => {
  if (!remoteMessage) {
    return null;
  }

  const rawData = remoteMessage.data ?? {};
  const data: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (value == null) {
      continue;
    }
    data[key] = String(value);
  }

  const type = pickDataString(data, 'type', 'notificationType', 'event') || '';
  if (!type) {
    return null;
  }

  return {
    type: type.toUpperCase(),
    title: remoteMessage.notification?.title ?? undefined,
    body: remoteMessage.notification?.body ?? undefined,
    data,
  };
};

export const parsePushFromAppNotification = (item: {
  type?: string;
  title?: string;
  body?: string;
  data?: Record<string, string | undefined>;
}): PushNotificationPayload | null => {
  const type = item.type?.trim();
  if (!type) {
    return null;
  }
  return {
    type: type.toUpperCase(),
    title: item.title,
    body: item.body,
    data: item.data ?? {},
  };
};

const navigateMain = (screen: string, params?: object) => {
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainStack',
      params: params !== undefined ? { screen, params } : { screen },
    }),
  );
};

const navigateHome = () => {
  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainStack',
      params: {
        screen: 'BottomStack',
        params: { screen: 'HomeScreen' },
      },
    }),
  );
};

const openBestPriceBid = async (
  payload: PushNotificationPayload,
  token?: string,
) => {
  const requestId = pickDataString(payload.data, 'requestId', 'request_id');
  const bidId = pickDataString(payload.data, 'bidId', 'bid_id');
  const shopName = pickDataString(payload.data, 'shopName', 'shop_name');
  const offerPrice = pickDataString(payload.data, 'offerPrice', 'offer_price');

  if (!requestId) {
    navigateMain('CreateRequestForm');
    return;
  }

  const title = shopName
    ? `Offer from ${shopName}`
    : payload.title || 'New offer';

  if (token && bidId) {
    try {
      const bids = await bestRequestApi.fetchBidsForRequest(requestId, token);
      const match = bids.find(bid => bid._id === bidId);
      if (match) {
        navigateMain('MerchantBidDetail', {
          bid: match,
          requestId,
          requestTitle: match.requestTitle || title,
        });
        return;
      }
    } catch {
      // Fall through to offers list.
    }
  }

  navigateMain('CreateRequestOffers', {
    requestId,
    title,
    budget: offerPrice ? Number(offerPrice) || undefined : undefined,
  });
};

const openProductById = async (productId: string, token?: string) => {
  try {
    const search = await shopApi.searchShopsProductsAndOffers(productId, token);
    const productHit =
      search.products.find(item => item.id === productId) || search.products[0];
    const shopId = productHit?.shopId?.trim();
    if (shopId) {
      const shop = await shopApi.fetchShopByIdWithOffers(shopId, token);
      const product =
        shop.products?.find(item => item.id === productId) || productHit;
      if (product) {
        navigateMain('ProductDetail', {
          shop,
          product: {
            ...product,
            id: product.id || productId,
            shopId: product.shopId || shopId,
            title: product.title || 'Product',
          },
        });
        return;
      }
    }
  } catch {
    // Fall through.
  }

  navigateMain('SavedOffers', { initialTab: 'products' });
};

export const routePushNotification = async (
  payload: PushNotificationPayload,
  options?: { requireAuth?: boolean },
): Promise<boolean> => {
  const ready = await waitForNavigationReady();
  if (!ready) {
    return false;
  }

  const session = await authStorage.getSession();
  const token = session.token?.trim() || undefined;
  const isAuthenticated = Boolean(token);

  if (options?.requireAuth !== false && !isAuthenticated) {
    logApiEvent('Push nav skipped (logged out)', { type: payload.type });
    navigationRef.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'AuthFlow',
            state: {
              index: 0,
              routes: [{ name: 'Login' }],
            },
          },
        ],
      }),
    );
    return true;
  }

  logApiEvent('Push nav', { type: payload.type, data: payload.data });

  switch (payload.type) {
    case 'BEST_PRICE_NEW_BID':
      await openBestPriceBid(payload, token);
      return true;

    case 'BIRTHDAY_WISH':
      navigateHome();
      return true;

    case 'CIRCLE_INVITATION':
      navigateMain('BachatCircle');
      return true;

    case 'REFERRAL_JOINED':
      navigateMain('InviteEarn');
      return true;

    case 'MILESTONE_UNLOCKED':
      navigateHome();
      return true;

    case 'PRICE_DROP': {
      const productId = pickDataString(payload.data, 'productId', 'product_id');
      if (productId) {
        await openProductById(productId, token);
      } else {
        navigateMain('SavedOffers', { initialTab: 'products' });
      }
      return true;
    }

    case 'CIRCLE_SHARED_OFFER': {
      const circleId = pickDataString(payload.data, 'circleId', 'circle_id');
      const sharedOfferId = pickDataString(
        payload.data,
        'sharedOfferId',
        'shared_offer_id',
      );
      if (circleId && sharedOfferId) {
        navigateMain('BachatCircleOfferDetail', { circleId, sharedOfferId });
      } else if (circleId) {
        navigateMain('BachatCircleFeed', { circleId });
      } else {
        navigateMain('BachatCircle');
      }
      return true;
    }

    default:
      navigateMain('Notifications');
      return true;
  }
};

export const presentForegroundPush = (payload: PushNotificationPayload) => {
  const title = payload.title || 'Notification';
  const body = payload.body || 'You have a new update.';

  showAppAlert(title, body, [
    { text: 'Dismiss', style: 'cancel' },
    {
      text: 'Open',
      onPress: () => {
        void routePushNotification(payload);
      },
    },
  ]);
};
