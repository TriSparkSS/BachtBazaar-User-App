import { WishlistShopItem } from '../types/wishlist';
import { wishlistApi } from './offerWishlistApi';

/** Shop wishlist via unified /offer-wishlist/shops APIs. */
export const shopWishlistApi = {
  fetchWishlist(token: string, _userId?: string): Promise<WishlistShopItem[]> {
    return wishlistApi.fetchByType('shops', token);
  },

  async addToWishlist(
    shop: Omit<WishlistShopItem, 'id'> & { id?: string },
    token: string,
    _userId?: string,
  ): Promise<string> {
    return wishlistApi.add('shops', shop.shopId, token);
  },

  removeFromWishlist(shopId: string, token: string, _userId?: string): Promise<string> {
    return wishlistApi.remove('shops', shopId, token);
  },

  clearWishlist(token: string, _userId?: string): Promise<string> {
    return wishlistApi.clear(token);
  },

  isShopWishlisted(shopId: string, token: string, _userId?: string): Promise<boolean> {
    return wishlistApi.isSaved('shops', shopId, token);
  },
};
