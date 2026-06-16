import { ShopOffer, ShopWithOffers } from '../types/shop';

export type MainStackParamList = {
  BottomStack: undefined;
  StoreDetail: {
    shop: ShopWithOffers;
  };
  OfferDetail: {
    shop: ShopWithOffers;
    offer: ShopOffer;
  };
};
