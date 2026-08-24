import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OfferDetailScreenView from './OfferDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { offerWishlistApi } from '../../../services/offerWishlistApi';
import { showAppAlert } from '../../../services/appAlert';
import { normalizeRedemptionStatusLabel } from '../../../services/dailyRewardsParser';
import { OfferDetail as OfferDetailType } from '../../../types/shop';
import { DailyRewardHistoryItem } from '../../../types/dailyRewards';

const OFFER_PLACEHOLDER =
  'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const isRedemptionHistoryClaimed = (item: DailyRewardHistoryItem): boolean => {
  const statusLabel = normalizeRedemptionStatusLabel(item.statusLabel);
  return statusLabel === 'Claimed' || statusLabel === 'Redeem';
};

const OfferDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'OfferDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const { shop, offer: initialOffer } = route.params as MainStackParamList['OfferDetail'];
  const [offer, setOffer] = useState<OfferDetailType>(initialOffer);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [isTogglingWishlist, setIsTogglingWishlist] = useState(false);
  const [isClaimed, setIsClaimed] = useState(Boolean((initialOffer as OfferDetailType).isClaimed));

  useEffect(() => {
    let cancelled = false;

    const loadOfferDetail = async () => {
      try {
        setIsLoading(true);
        const detail = await shopApi.fetchOfferById(initialOffer.id, shop.id, authToken ?? undefined);

        if (!cancelled) {
          setOffer(detail);
          if (detail.isClaimed) {
            setIsClaimed(true);
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

    loadOfferDetail();

    return () => {
      cancelled = true;
    };
  }, [authToken, initialOffer.id, shop.id]);

  useEffect(() => {
    let cancelled = false;
    const token = authToken?.trim();
    const offerId = initialOffer.id?.trim();

    if (!token || !offerId) {
      return;
    }

    // Same pattern as calendar: merge /offer-redemption/user/history by offerId.
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
        // Offer-detail claim flags (if any) remain the source of truth on failure.
      }
    };

    loadClaimStatusFromHistory();

    return () => {
      cancelled = true;
    };
  }, [authToken, initialOffer.id]);

  useEffect(() => {
    let cancelled = false;
    const token = authToken?.trim();
    const offerId = initialOffer.id?.trim();

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

    loadWishlistState();

    return () => {
      cancelled = true;
    };
  }, [authToken, initialOffer.id]);

  const heroImageUri = useMemo(
    () => shopApi.resolveImageUrl(offer.image) ?? OFFER_PLACEHOLDER,
    [offer.image],
  );

  const shopLogoUri = useMemo(
    () =>
      shopApi.resolveImageUrl(offer.merchant?.avatar) ??
      shopApi.resolveImageUrl(shop.logo) ??
      SHOP_LOGO_PLACEHOLDER,
    [offer.merchant?.avatar, shop.logo],
  );

  const merchantName = offer.merchant?.storeName || shop.name;

  const handleToggleWishlist = useCallback(async () => {
    const token = authToken?.trim();
    const offerId = offer.id?.trim() || initialOffer.id?.trim();

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
  }, [authToken, initialOffer.id, isSaved, offer.id]);

  return (
    <OfferDetailScreenView
      shop={shop}
      offer={offer}
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
          expectedOfferId: offer.id?.trim() || initialOffer.id?.trim(),
          expectedOfferTitle: offer.title || initialOffer.title,
        })
      }
      onShareToCircle={() =>
        navigation.navigate('BachatCircleShareOffer', {
          offerId: offer.id?.trim() || initialOffer.id?.trim(),
          offerTitle: offer.title || initialOffer.title,
          offerSubtitle: offer.subtitle || shop.name,
          discount: offer.discount,
          offerImage: offer.image,
        })
      }
      onAlreadyClaimedPress={() =>
        showAppAlert('Already Claimed', 'You have already claimed this offer.')
      }
      resolveImageUrl={shopApi.resolveImageUrl}
    />
  );
};

export default OfferDetail;
