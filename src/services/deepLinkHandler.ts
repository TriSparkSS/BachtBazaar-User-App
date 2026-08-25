import { Linking } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import {
  ParsedDeepLink,
  parseDeepLink,
} from '../config/deepLinks';
import { deepLinkStorage } from './deepLinkStorage';
import { shopApi } from './shopApi';
import { logApiEvent } from './apiClient';
import { navigationRef } from '../navigation/navigationService';
import { authStorage } from './authStorage';

let lastHandledUrl: string | null = null;
let handling = false;

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

const navigateToOffer = async (offerId: string, shopId?: string, token?: string) => {
  const ready = await waitForNavigationReady();
  if (!ready) {
    return;
  }

  const resolvedShopId = shopId?.trim();
  let shopName = 'Store';
  let offerTitle = 'Shared offer';
  let offerImage: string | undefined;
  let discount: string | undefined;

  try {
    if (resolvedShopId) {
      const [shop, offer] = await Promise.all([
        shopApi.fetchShopById(resolvedShopId, token).catch(() => null),
        shopApi.fetchOfferById(offerId, resolvedShopId, token).catch(() => null),
      ]);
      if (shop?.name) {
        shopName = shop.name;
      }
      if (offer) {
        offerTitle = offer.title || offerTitle;
        offerImage = offer.image;
        discount = offer.discount;
      }
    } else {
      const offer = await shopApi.fetchOfferById(offerId, '', token).catch(() => null);
      if (offer) {
        offerTitle = offer.title || offerTitle;
        offerImage = offer.image;
        discount = offer.discount;
      }
    }
  } catch {
    // Navigate with stubs even if fetch fails.
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainStack',
      params: {
        screen: 'OfferDetail',
        params: {
          offerId,
          shopId: resolvedShopId,
          shop: { id: resolvedShopId || '', name: shopName },
          offer: {
            id: offerId,
            shopId: resolvedShopId || '',
            title: offerTitle,
            image: offerImage,
            discount,
          },
        },
      },
    }),
  );
};

const navigateLoggedOutInvite = async () => {
  const ready = await waitForNavigationReady();
  if (!ready) {
    return;
  }

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
};

const navigateInviteEarn = async () => {
  const ready = await waitForNavigationReady();
  if (!ready) {
    return;
  }

  navigationRef.dispatch(
    CommonActions.navigate({
      name: 'MainStack',
      params: {
        screen: 'InviteEarn',
      },
    }),
  );
};

export const handleParsedDeepLink = async (
  parsed: ParsedDeepLink,
  options?: { force?: boolean },
): Promise<void> => {
  if (handling && !options?.force) {
    return;
  }

  handling = true;
  try {
    const session = await authStorage.getSession();
    const isAuthenticated = Boolean(session.token?.trim());
    const token = session.token?.trim() || undefined;

    if (parsed.type === 'invite') {
      await deepLinkStorage.savePendingReferralCode(parsed.code);
      logApiEvent('Deep link invite', { code: parsed.code, isAuthenticated });

      if (isAuthenticated) {
        await navigateInviteEarn();
      } else {
        await navigateLoggedOutInvite();
      }
      return;
    }

    if (parsed.type === 'offer') {
      logApiEvent('Deep link offer', {
        offerId: parsed.offerId,
        shopId: parsed.shopId,
        isAuthenticated,
      });

      if (!isAuthenticated) {
        await deepLinkStorage.savePendingOffer({
          offerId: parsed.offerId,
          shopId: parsed.shopId,
        });
        await navigateLoggedOutInvite();
        return;
      }

      await navigateToOffer(parsed.offerId, parsed.shopId, token);
    }
  } finally {
    handling = false;
  }
};

export const handleDeepLinkUrl = async (url?: string | null): Promise<boolean> => {
  if (!url?.trim()) {
    return false;
  }
  if (url === lastHandledUrl) {
    return true;
  }

  const parsed = parseDeepLink(url);
  if (!parsed) {
    logApiEvent('Deep link ignored', { url });
    return false;
  }

  lastHandledUrl = url;
  await handleParsedDeepLink(parsed);
  return true;
};

/** After login/bootstrap: open any pending offer deep link. */
export const consumePendingOfferDeepLink = async (): Promise<boolean> => {
  const pending = await deepLinkStorage.consumePendingOffer();
  if (!pending) {
    return false;
  }
  const session = await authStorage.getSession();
  await navigateToOffer(
    pending.offerId,
    pending.shopId,
    session.token?.trim() || undefined,
  );
  return true;
};

export const initDeepLinkListeners = (): (() => void) => {
  const subscription = Linking.addEventListener('url', event => {
    void handleDeepLinkUrl(event.url);
  });

  void Linking.getInitialURL().then(url => {
    void handleDeepLinkUrl(url);
  });

  return () => {
    subscription.remove();
  };
};
