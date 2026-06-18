import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OfferDetailScreenView from './OfferDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { OfferDetail as OfferDetailType } from '../../../types/shop';

const OFFER_PLACEHOLDER =
  'https://images.pexels.com/photos/5632402/pexels-photo-5632402.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const OfferDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'OfferDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const { shop, offer: initialOffer } = route.params as MainStackParamList['OfferDetail'];
  const [offer, setOffer] = useState<OfferDetailType>(initialOffer);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadOfferDetail = async () => {
      try {
        setIsLoading(true);
        const detail = await shopApi.fetchOfferById(initialOffer.id, shop.id, authToken ?? undefined);

        if (!cancelled) {
          setOffer(detail);
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

  return (
    <OfferDetailScreenView
      shop={shop}
      offer={offer}
      merchantName={merchantName}
      heroImageUri={heroImageUri}
      shopLogoUri={shopLogoUri}
      isLoading={isLoading}
      onBack={() => navigation.goBack()}
      resolveImageUrl={shopApi.resolveImageUrl}
    />
  );
};

export default OfferDetail;
