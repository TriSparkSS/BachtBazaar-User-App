export interface ShopOpeningDay {
  open?: string;
  close?: string;
  isClosed?: boolean;
}

export interface ShopOpeningHours {
  monday?: ShopOpeningDay;
  tuesday?: ShopOpeningDay;
  wednesday?: ShopOpeningDay;
  thursday?: ShopOpeningDay;
  friday?: ShopOpeningDay;
  saturday?: ShopOpeningDay;
  sunday?: ShopOpeningDay;
}

export interface Shop {
  id: string;
  name: string;
  logo?: string;
  coverImage?: string;
  tagline?: string;
  address?: string;
  address1?: string;
  phone?: string;
  rating?: string;
  ratingCount?: string;
  distance?: string;
  isOpen?: boolean;
  isVerified?: boolean;
  categories?: string[];
  openingHours?: ShopOpeningHours;
  merchantName?: string;
  city?: string;
}

export interface ShopProduct {
  id: string;
  shopId: string;
  title: string;
  category?: string;
  metalType?: string;
  image?: string;
  price?: string;
  originalPrice?: string;
  rating?: string;
  stock?: number;
  isFeatured?: boolean;
}

export interface ShopOffer {
  id: string;
  shopId: string;
  title: string;
  subtitle?: string;
  discount?: string;
  image?: string;
  countdown?: string;
  expiresAt?: string;
  description?: string;
  minimumPurchaseAmount?: number;
  offerType?: string;
  redeemSteps?: Array<{
    title: string;
    description: string;
  }>;
}

export interface OfferMechanicType {
  id?: string;
  value?: string;
  label?: string;
  description?: string;
  icon?: string;
}

export interface OfferTimeline {
  startDate?: string;
  endDate?: string;
  isExpired?: boolean;
  isUpcoming?: boolean;
  remainingDays?: number;
}

export interface OfferMerchant {
  storeName?: string;
  avatar?: string;
}

export interface OfferOperationalRules {
  walkInOnly?: boolean;
  qrRequired?: boolean;
  nearbyOnly?: boolean;
}

export interface OfferDetail extends ShopOffer {
  code?: string;
  displayType?: string;
  discountExpression?: string;
  timeline?: OfferTimeline;
  merchant?: OfferMerchant;
  mechanics?: {
    parentType?: OfferMechanicType;
    subType?: OfferMechanicType;
    freeQuantity?: number | null;
    maxFreeLimit?: number | null;
    campaignPoolWinners?: number;
  };
  linkedProducts?: ShopProduct[];
  operationalRules?: OfferOperationalRules;
  isActive?: boolean;
  createdAt?: string;
}

export interface ShopWithOffers extends Shop {
  offers: ShopOffer[];
  products?: ShopProduct[];
  productCount?: number;
  offerCount?: number;
  serviceCount?: number;
}
