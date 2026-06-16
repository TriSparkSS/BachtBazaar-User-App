export interface Shop {
  id: string;
  name: string;
  logo?: string;
  coverImage?: string;
  tagline?: string;
  rating?: string;
  ratingCount?: string;
  distance?: string;
  isOpen?: boolean;
  isVerified?: boolean;
  categories?: string[];
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
  redeemSteps?: Array<{
    title: string;
    description: string;
  }>;
}

export interface ShopWithOffers extends Shop {
  offers: ShopOffer[];
}
