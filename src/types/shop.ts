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
  email?: string;
  rating?: string;
  ratingCount?: string;
  distance?: string;
  isOpen?: boolean;
  isVerified?: boolean;
  categories?: string[];
  categoryIds?: string[];
  openingHours?: ShopOpeningHours;
  merchantId?: string;
  merchantName?: string;
  city?: string;
  /**
   * Whether this shop/merchant offers delivery.
   * Parsed from providesDelivery / deliveryAvailable / aliases (see shopDelivery.ts).
   * Undefined when the API omits recognized fields — Product Detail hides cart/delivery.
   */
  providesDelivery?: boolean;
}

export interface ShopProduct {
  id: string;
  shopId: string;
  title: string;
  category?: string;
  metalType?: string;
  brand?: string;
  description?: string;
  image?: string;
  price?: string;
  originalPrice?: string;
  rating?: string;
  stock?: number;
  isFeatured?: boolean;
  shopName?: string;
  /** Product-level delivery flag when present on inventory/search payloads. */
  providesDelivery?: boolean;
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
  /** Shop / store display name when present on search payloads. */
  shopName?: string;
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
  /** True when the current user has already claimed/redeemed this offer. */
  isClaimed?: boolean;
  createdAt?: string;
}

export interface ShopService {
  id: string;
  shopId: string;
  title: string;
  image?: string;
  price?: string;
  originalPrice?: string;
  pricingType?: string;
  duration?: string;
  rating?: string;
  gender?: string;
  description?: string;
  isFeatured?: boolean;
}

export interface ShopWithOffers extends Shop {
  offers: ShopOffer[];
  products?: ShopProduct[];
  services?: ShopService[];
  productCount?: number;
  offerCount?: number;
  serviceCount?: number;
}
