export interface OfferBanner {
  id: string;
  title: string;
  subtitle?: string;
  badgeLabel?: string;
  discount?: string;
  image?: string;
  expiresAt?: string;
  shopId?: string;
  offerId?: string;
  /** Longer offer / sale copy for banner detail. */
  description?: string;
  shopName?: string;
  shopCategory?: string;
  shopLogo?: string;
  rating?: string;
  distance?: string;
  isVerified?: boolean;
  terms?: string[];
  /** True when banner comes from admin active-feed (no store). */
  isAdminBanner?: boolean;
}
