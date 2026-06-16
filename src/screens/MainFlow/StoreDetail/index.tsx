import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import StoreDetailScreenView from './StoreDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { ShopOffer, ShopWithOffers } from '../../../types/shop';
import { mapOffersToProducts } from '../../../utils/shop';

const HERO_PLACEHOLDER =
  'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const StoreDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'StoreDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const initialShop = (route.params as MainStackParamList['StoreDetail']).shop;
  const [shop, setShop] = useState<ShopWithOffers>(initialShop);
  const [isLoadingOffers, setIsLoadingOffers] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      try {
        setIsLoadingOffers(true);
        const offers = await shopApi.fetchShopOffers(initialShop.id, authToken ?? undefined);

        if (!cancelled) {
          setShop(current => ({ ...current, offers }));
        }
      } catch {
        // Keep offers passed from the previous screen when refresh fails.
      } finally {
        if (!cancelled) {
          setIsLoadingOffers(false);
        }
      }
    };

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, [authToken, initialShop.id]);

  const heroImageUri = useMemo(() => {
    return (
      shopApi.resolveImageUrl(shop.coverImage) ??
      shopApi.resolveImageUrl(shop.logo) ??
      shopApi.resolveImageUrl(shop.offers[0]?.image) ??
      HERO_PLACEHOLDER
    );
  }, [shop.coverImage, shop.logo, shop.offers]);

  const products = useMemo(() => mapOffersToProducts(shop.offers), [shop.offers]);

  const openOfferDetail = (offer: ShopOffer) => {
    navigation.navigate('OfferDetail', { shop, offer });
  };

  return (
    <StoreDetailScreenView
      shop={shop}
      heroImageUri={heroImageUri}
      products={products}
      isLoadingOffers={isLoadingOffers}
      onBack={() => navigation.goBack()}
      onOfferPress={openOfferDetail}
      resolveImageUrl={shopApi.resolveImageUrl}
    />
  );
};

export default StoreDetail;
