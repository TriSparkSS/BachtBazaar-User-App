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

export interface ShopManualOverride {
  status?: string;
  reason?: string;
  closedUntil?: string | null;
  updatedAt?: string;
}

export interface ShopDeliveryPricingWindow {
  isEnabled?: boolean;
  ratePerKm?: number;
  flatSurcharge?: number;
  startTime?: string;
  endTime?: string;
}

export interface ShopDeliveryPricing {
  baseFee?: number;
  ratePerKm?: number;
  minimumDeliveryFee?: number;
  nightConfig?: ShopDeliveryPricingWindow;
  peakConfig?: ShopDeliveryPricingWindow;
}

export interface ShopDeliveryQuote {
  isAvailable?: boolean;
  distanceKm?: number;
  /** Merchant delivery fee only — never includes platform fee. */
  deliveryFee?: number;
  tierApplied?: string;
}

export interface Shop {
  id: string;
  name: string;
  logo?: string;
  /** True when the API sent a logo field (even if bytes were omitted from the list payload). */
  hasLogoAsset?: boolean;
  coverImage?: string;
  tagline?: string;
  address?: string;
  address1?: string;
  phone?: string;
  email?: string;
  rating?: string;
  ratingCount?: string;
  distance?: string;
  latitude?: number;
  longitude?: number;
  isOpen?: boolean;
  /** Blue tick on Home / Store Detail — only from API `isBlueTickEnabled`. */
  isVerified?: boolean;
  isBlueTickEnabled?: boolean;
  categories?: string[];
  categoryIds?: string[];
  openingHours?: ShopOpeningHours;
  /** Merchant-set override, e.g. FORCE_CLOSED after weekly hours. */
  manualOverride?: ShopManualOverride;
  merchantId?: string;
  merchantName?: string;
  city?: string;
  /**
   * Whether this shop/merchant offers delivery.
   * Parsed from providesDelivery / deliveryAvailable / aliases (see shopDelivery.ts).
   * Undefined when the API omits recognized fields — Product Detail hides cart/delivery.
   */
  providesDelivery?: boolean;
  /** Live quote from shop detail `delivery` (peak/night already applied by API). */
  delivery?: ShopDeliveryQuote;
  deliveryPricing?: ShopDeliveryPricing;
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
  /** Payable / discounted amount. */
  priceAmount?: number;
  /** MRP / original amount when a discount exists. */
  originalPriceAmount?: number;
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

export interface ShopServiceProvider {
  name: string;
  profileImage?: string;
  experienceYears?: number;
  designation?: string;
  gender?: string;
  specialisation?: string[];
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
  provider?: ShopServiceProvider;
}

export interface ShopWithOffers extends Shop {
  offers: ShopOffer[];
  products?: ShopProduct[];
  services?: ShopService[];
  productCount?: number;
  offerCount?: number;
  serviceCount?: number;
}
