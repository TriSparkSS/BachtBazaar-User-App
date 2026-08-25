import { ShopOffer, ShopProduct, ShopWithOffers } from '../types/shop';
import {
  CreateRequestFormParams,
  CreateRequestShopOffer,
} from '../types/createRequest';
import { MerchantBidData } from '../services/bestRequestApi';

import { OfferBanner } from '../types/offerBanner';

export type MainStackParamList = {
  BottomStack: undefined;
  StoreDetail: {
    /** Preferred when opening from QR / deep link — Store Detail fetches by this id. */
    shopId?: string;
    /** Full shop from lists, or a minimal `{ id }` stub from scanner. */
    shop?: ShopWithOffers | { id: string };
  };
  BannerDetail: {
    banner: OfferBanner;
  };
  OfferDetail: {
    shop?: ShopWithOffers | { id: string; name?: string };
    offer?: ShopOffer;
    /** Deep link / cold open without full shop+offer objects. */
    offerId?: string;
    shopId?: string;
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
  HelpSupport: undefined;
  CreateHelpTicket: undefined;
  HelpTicketDetail: {
    ticketId: string;
  };
  FAQ: undefined;
  VideoGuide: undefined;
  HelpArticles: undefined;
  Contact: undefined;
  InviteEarn: undefined;
  Notifications: undefined;
  Language: undefined;
  BachatCircle: undefined;
  BachatCircleCreate: undefined;
  BachatCircleAddMembers: {
    circleName: string;
    category: 'Family' | 'Friends' | 'Office Team' | 'Other';
    circleId: string;
    description?: string;
  };
  BachatCircleFeed: {
    circleId?: string;
  } | undefined;
  BachatCircleMembers: {
    circleId?: string;
  } | undefined;
  BachatCircleShareOffer: {
    offerId: string;
    offerTitle?: string;
    offerSubtitle?: string;
    offerImage?: string;
    discount?: string;
    circleId?: string;
  };
  BachatCircleOfferDetail: {
    sharedOfferId: string;
    circleId: string;
  };
  BachatCircleNotifications: undefined;
};
