import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Share } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OfferDetailScreenView from './OfferDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { offerWishlistApi } from '../../../services/offerWishlistApi';
import { showAppAlert } from '../../../services/appAlert';
import { normalizeRedemptionStatusLabel } from '../../../services/dailyRewardsParser';
import { buildOfferDeepLink } from '../../../config/deepLinks';
import { OfferDetail as OfferDetailType, ShopOffer, ShopWithOffers } from '../../../types/shop';
import { DailyRewardHistoryItem } from '../../../types/dailyRewards';

const OFFER_PLACEHOLDER =
  'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const isRedemptionHistoryClaimed = (item: DailyRewardHistoryItem): boolean => {
  const statusLabel = normalizeRedemptionStatusLabel(item.statusLabel);
  return statusLabel === 'Claimed' || statusLabel === 'Redeem';
};

const stubOffer = (offerId: string, shopId: string): OfferDetailType => ({
  id: offerId,
  shopId,
  title: 'Offer',
});

const stubShop = (shopId: string, name?: string): ShopWithOffers => ({
  id: shopId,
  name: name || 'Store',
  offers: [],
  products: [],
});

const OfferDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'OfferDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const params = route.params as MainStackParamList['OfferDetail'];

  const resolvedOfferId =
    params.offer?.id?.trim() || params.offerId?.trim() || '';
  const resolvedShopId =
    params.shop?.id?.trim() || params.shopId?.trim() || params.offer?.shopId?.trim() || '';

  const [shop, setShop] = useState<ShopWithOffers | { id: string; name?: string; logo?: string }>(
    params.shop || stubShop(resolvedShopId),
  );
  const [offer, setOffer] = useState<OfferDetailType>(
    (params.offer as OfferDetailType) || stubOffer(resolvedOfferId, resolvedShopId),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [isClaimed, setIsClaimed] = useState(
    Boolean((params.offer as OfferDetailType | undefined)?.isClaimed),
  );

  useEffect(() => {
    let cancelled = false;

    const loadOfferDetail = async () => {
      if (!resolvedOfferId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const detail = await shopApi.fetchOfferById(
          resolvedOfferId,
          resolvedShopId,
          authToken ?? undefined,
        );

        if (!cancelled) {
          setOffer(detail);
          if (detail.isClaimed) {
            setIsClaimed(true);
          }
        }

        const shopIdForFetch = resolvedShopId || detail.shopId?.trim();
        if (shopIdForFetch) {
          try {
            const shopDetail = await shopApi.fetchShopById(
              shopIdForFetch,
              authToken ?? undefined,
            );
            if (!cancelled && shopDetail) {
              setShop(shopDetail);
            }
          } catch {
            // Keep stub shop.
          }
        }
      } catch {
        // Keep offer passed from previous screen when refresh fails.
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadOfferDetail();

    return () => {
      cancelled = true;
    };
  }, [authToken, resolvedOfferId, resolvedShopId]);

  useEffect(() => {
    let cancelled = false;
    const token = authToken?.trim();
    const offerId = resolvedOfferId;

    if (!token || !offerId) {
      return;
    }

    const loadClaimStatusFromHistory = async () => {
      try {
        const history = await shopApi.fetchOfferRedemptionHistory(token);
        if (cancelled) {
          return;
        }

        const match = history.find(item => {
          const historyOfferId = item.offerId?.trim() || item.id.trim();
          return historyOfferId === offerId;
        });

        if (match && isRedemptionHistoryClaimed(match)) {
          setIsClaimed(true);
          setOffer(prev => (prev.isClaimed ? prev : { ...prev, isClaimed: true }));
        }
      } catch {
        // Offer-detail claim flags remain the source of truth on failure.
      }
    };

    void loadClaimStatusFromHistory();

    return () => {
      cancelled = true;
    };
  }, [authToken, resolvedOfferId]);

  useEffect(() => {
    let cancelled = false;
    const token = authToken?.trim();
    const offerId = resolvedOfferId;

    if (!token || !offerId) {
      setIsSaved(false);
      return;
    }

    const loadWishlistState = async () => {
      try {
        const wishlisted = await offerWishlistApi.isOfferWishlisted(offerId, token);
        if (!cancelled) {
          setIsSaved(wishlisted);
        }
      } catch {
        if (!cancelled) {
          setIsSaved(false);
        }
      }
    };

    void loadWishlistState();

    return () => {
      cancelled = true;
    };
  }, [authToken, resolvedOfferId]);

  const heroImageUri = useMemo(
    () => shopApi.resolveImageUrl(offer.image) ?? OFFER_PLACEHOLDER,
    [offer.image],
  );

  const shopLogoUri = useMemo(
    () =>
      shopApi.resolveImageUrl(offer.merchant?.avatar) ??
      shopApi.resolveImageUrl((shop as ShopWithOffers).logo) ??
      SHOP_LOGO_PLACEHOLDER,
    [offer.merchant?.avatar, shop],
  );

  const merchantName =
    offer.merchant?.storeName || ('name' in shop ? shop.name : undefined) || 'Store';

  const handleToggleWishlist = useCallback(async () => {
    const token = authToken?.trim();
    const offerId = offer.id?.trim() || resolvedOfferId;

    if (!token) {
      showAppAlert('Login required', 'Please log in again to save offers.');
      return;
    }
    if (!offerId) {
      showAppAlert('Offer unavailable', 'Offer id is missing for this item.');
      return;
    }

    try {
      setIsTogglingWishlist(true);
      if (isSaved) {
        const message = await offerWishlistApi.removeFromWishlist(offerId, token);
        setIsSaved(false);
        showAppAlert('Removed', message);
      } else {
        const message = await offerWishlistApi.addToWishlist(offerId, token);
        setIsSaved(true);
        showAppAlert('Saved', message);
      }
    } catch (error) {
      showAppAlert(
        isSaved ? 'Could not remove offer' : 'Could not save offer',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setIsTogglingWishlist(false);
    }
  }, [authToken, isSaved, offer.id, resolvedOfferId]);

  const handleShareLink = useCallback(async () => {
    const offerId = offer.id?.trim() || resolvedOfferId;
    const shopId =
      ('id' in shop ? shop.id : undefined)?.trim() ||
      resolvedShopId ||
      offer.shopId?.trim();
    if (!offerId) {
      return;
    }

    const link = buildOfferDeepLink(offerId, shopId);
    const title = offer.title || 'Bachat Bazaar offer';
    try {
      await Share.share({
        message: `Check out this offer on Bachat Bazaar: ${title}\n\n${link}`,
        title,
        url: link,
      });
    } catch {
      // User cancelled or share unavailable.
    }
  }, [offer.id, offer.shopId, offer.title, resolvedOfferId, resolvedShopId, shop]);

  const viewShop = shop as ShopWithOffers;
  const viewOffer = offer as ShopOffer & OfferDetailType;

  return (
    <OfferDetailScreenView
      shop={viewShop}
      offer={viewOffer}
      merchantName={merchantName}
      heroImageUri={heroImageUri}
      shopLogoUri={shopLogoUri}
      isLoading={isLoading}
      isSaved={isSaved}
      isClaimed={isClaimed}
      isTogglingWishlist={isTogglingWishlist}
      onBack={() => navigation.goBack()}
      onToggleWishlist={handleToggleWishlist}
      onOpenScanner={() =>
        navigation.navigate('ScannerScreen', {
          expectedOfferId: offer.id?.trim() || resolvedOfferId,
          expectedOfferTitle: offer.title,
        })
      }
      onShareToCircle={() =>
        navigation.navigate('BachatCircleShareOffer', {
          offerId: offer.id?.trim() || resolvedOfferId,
          offerTitle: offer.title,
          offerSubtitle: offer.subtitle || merchantName,
          discount: offer.discount,
          offerImage: offer.image,
        })
      }
      onShareLink={() => {
        void handleShareLink();
      }}
      onAlreadyClaimedPress={() =>
        showAppAlert('Already Claimed', 'You have already claimed this offer.')
      }
      resolveImageUrl={shopApi.resolveImageUrl}
    />
  );
};

export default OfferDetail;
