export type WishlistType = 'offers' | 'shops' | 'products';

export type WishlistOfferItem = {
  id: string;
  offerId: string;
  shopId?: string;
  title: string;
  subtitle?: string;
  discount?: string;
  image?: string;
  shopName?: string;
  expiresAt?: string;
  description?: string;
  minimumPurchaseAmount?: number;
  createdAt?: string;
};

export type WishlistShopItem = {
  id: string;
  shopId: string;
  name: string;
  address?: string;
  logo?: string;
  city?: string;
  phone?: string;
  isVerified?: boolean;
  createdAt?: string;
};

export type WishlistProductItem = {
  id: string;
  productId: string;
  shopId?: string;
  title: string;
  subtitle?: string;
  price?: string;
  originalPrice?: string;
  image?: string;
  shopName?: string;
  category?: string;
  brand?: string;
  createdAt?: string;
};
