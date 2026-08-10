import { ShopOffer, ShopProduct, ShopWithOffers } from '../types/shop';
import {
  CreateRequestFormParams,
  CreateRequestShopOffer,
} from '../types/createRequest';
import { MerchantBidData } from '../services/bestRequestApi';

export type MainStackParamList = {
  BottomStack: undefined;
  StoreDetail: {
    /** Preferred when opening from QR / deep link — Store Detail fetches by this id. */
    shopId?: string;
    /** Full shop from lists, or a minimal `{ id }` stub from scanner. */
    shop?: ShopWithOffers | { id: string };
  };
  OfferDetail: {
    shop: ShopWithOffers;
    offer: ShopOffer;
  };
  ProductDetail: {
    shop: ShopWithOffers;
    product: ShopProduct;
  };
  Cart: undefined;
  DeliveryOrders: undefined;
  DeliveryOrderDetail: {
    orderId: string;
  };
  RequestDelivery: {
    shop: ShopWithOffers;
    product: ShopProduct;
    /** Set by AddAddress when user saves/selects a delivery address. */
    selectedAddress?: string;
    selectedCity?: string;
  };
  AddAddress: {
    initialAddress?: string;
    initialCity?: string;
    initialLatitude?: number;
    initialLongitude?: number;
  } | undefined;
  RequestDeliverySent: {
    shop: ShopWithOffers;
    product: ShopProduct;
    requestId: string;
    /** All delivery order ids for this wait (multi-item cart). */
    orderIds?: string[];
    address: string;
    mobile: string;
    note?: string;
    itemPrice: number;
    deliveryFee: number;
    platformFee: number;
    totalAmount: number;
  };
  RequestDeliveryAccepted: {
    shop: ShopWithOffers;
    product: ShopProduct;
    requestId: string;
    orderId: string;
    deliveryFee: number;
    eta?: string;
    bidId?: string;
  };
  CreateRequestForm: {
    initialProduct?: string;
  } | undefined;
  CreateRequestOffers: {
    requestId: string;
    title: string;
    status?: string;
    budget?: number;
    timeframe?: string;
  };
  MerchantBidDetail: {
    bid: MerchantBidData;
    requestId: string;
    requestTitle: string;
    requestStatus?: string;
    budget?: number;
    timeframe?: string;
  };
  ScannerScreen:
    | {
        expectedOfferId?: string;
        expectedOfferTitle?: string;
      }
    | undefined;
  MyQrScreen: undefined;
  OfferRedemptionHistory: undefined;
  SavedOffers:
    | {
        initialTab?: 'offers' | 'shops' | 'products';
      }
    | undefined;
  CreateRequestSearching: CreateRequestFormParams;
  CreateRequestResults: CreateRequestFormParams & {
    bestPrice: number;
    marketPrice: number;
    youSave: number;
    offers: CreateRequestShopOffer[];
  };
  LegalWebScreen: {
    title: string;
    url: string;
  };
};
