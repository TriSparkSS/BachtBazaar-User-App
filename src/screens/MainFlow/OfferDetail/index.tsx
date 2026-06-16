import React, { useMemo } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import OfferDetailScreenView from './OfferDetailScreenView';
import { MainStackParamList } from '../../../navigation/types';
import { shopApi } from '../../../services/shopApi';

const OFFER_PLACEHOLDER =
  'https://images.pexels.com/photos/1191531/pexels-photo-1191531.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=800';

const SHOP_LOGO_PLACEHOLDER =
  'https://images.pexels.com/photos/248077/pexels-photo-248077.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=200';

const OfferDetail = () => {
  const navigation = useNavigation<StackNavigationProp<MainStackParamList, 'OfferDetail'>>();
  const route = useRoute();
  const { shop, offer } = route.params as MainStackParamList['OfferDetail'];

  const heroImageUri = useMemo(
    () => shopApi.resolveImageUrl(offer.image) ?? OFFER_PLACEHOLDER,
    [offer.image],
  );

  const shopLogoUri = useMemo(
    () => shopApi.resolveImageUrl(shop.logo) ?? SHOP_LOGO_PLACEHOLDER,
    [shop.logo],
  );

  return (
    <OfferDetailScreenView
      shop={shop}
      offer={offer}
      heroImageUri={heroImageUri}
      shopLogoUri={shopLogoUri}
      onBack={() => navigation.goBack()}
    />
  );
};

export default OfferDetail;
