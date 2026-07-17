import React, { useEffect, useMemo, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import StoreDetailScreenView from './StoreDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { useAppContext } from '../../../context/AppContext';
import { shopApi } from '../../../services/shopApi';
import { ShopOffer, ShopWithOffers } from '../../../types/shop';

const GROCERY_HERO_PLACEHOLDER =
  'https://images.pexels.com/photos/264636/pexels-photo-264636.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const StoreDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'StoreDetail'>>();
  const route = useRoute();
  const { authToken } = useAppContext();
  const initialShop = (route.params as MainStackParamList['StoreDetail']).shop;
  const [shop, setShop] = useState<ShopWithOffers>(initialShop);
  const [isLoadingShop, setIsLoadingShop] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadShopDetail = async () => {
      try {
        setIsLoadingShop(true);
        const detail = await shopApi.fetchShopByIdWithOffers(
          initialShop.id,
          authToken ?? undefined,
        );

        if (!cancelled) {
          setShop(detail);
        }
      } catch {
        // Keep shop data passed from the previous screen when refresh fails.
      } finally {
        if (!cancelled) {
          setIsLoadingShop(false);
        }
      }
    };

    loadShopDetail();

    return () => {
      cancelled = true;
    };
  }, [authToken, initialShop.id]);

  const heroImageUri = useMemo(() => {
    const bannerUri = shopApi.resolveImageUrl(shop.coverImage);
    if (bannerUri) {
      return bannerUri;
    }

    return (
      shopApi.resolveImageUrl(shop.products?.find(product => product.image)?.image) ??
      GROCERY_HERO_PLACEHOLDER
    );
  }, [shop.coverImage, shop.products, isLoadingShop]);

  const products = shop.products ?? [];

  const openOfferDetail = (offer: ShopOffer) => {
    navigation.navigate('OfferDetail', { shop, offer });
  };

  return (
    <StoreDetailScreenView
      shop={shop}
      heroImageUri={heroImageUri}
      products={products}
      isLoadingOffers={isLoadingShop}
      onBack={() => navigation.goBack()}
      onOfferPress={openOfferDetail}
      resolveImageUrl={shopApi.resolveImageUrl}
    />
  );
};

export default StoreDetail;
