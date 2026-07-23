import { ShopOffer, ShopWithOffers } from '../types/shop';
import {
  CreateRequestFormParams,
  CreateRequestShopOffer,
} from '../types/createRequest';

export type MainStackParamList = {
  BottomStack: undefined;
  StoreDetail: {
    shop: ShopWithOffers;
  };
  OfferDetail: {
    shop: ShopWithOffers;
    offer: ShopOffer;
  };
  CreateRequestForm: undefined;
  CreateRequestOffers: {
    requestId: string;
    title: string;
    status?: string;
    budget?: number;
    timeframe?: string;
  };
  CreateRequestSearching: CreateRequestFormParams;
  CreateRequestResults: CreateRequestFormParams & {
    bestPrice: number;
    marketPrice: number;
    youSave: number;
    offers: CreateRequestShopOffer[];
  };
};
