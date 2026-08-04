import { API_ENDPOINTS } from '../config/api';
import {
  WishlistOfferItem,
  WishlistProductItem,
  WishlistShopItem,
  WishlistType,
} from '../types/wishlist';
import { apiRequest, logApiEvent } from './apiClient';
import {
  extractWishlistMessage,
  parseOfferWishlistResponse,
  parseProductWishlistResponse,
  parseShopWishlistResponse,
} from './offerWishlistParser';

type WishlistMutationResponse = {
  success?: boolean;
  message?: string;
};

const typeLabel = (type: WishlistType) => {
  if (type === 'offers') {
    return 'Offer';
  }
  if (type === 'shops') {
    return 'Store';
  }
  return 'Product';
};

export type WishlistCollections = {
  offers: WishlistOfferItem[];
  shops: WishlistShopItem[];
  products: WishlistProductItem[];
};

/** One GET — backend returns offers + products + shops together on every typed path. */
export async function fetchAllWishlist(token: string): Promise<WishlistCollections> {
  const payload = await apiRequest<unknown>(API_ENDPOINTS.wishlistByType('offers'), {
    method: 'GET',
    token,
  });

  const offers = parseOfferWishlistResponse(payload);
  const shops = parseShopWishlistResponse(payload);
  const products = parseProductWishlistResponse(payload);

  logApiEvent('wishlist parsed', {
    offers: offers.length,
    shops: shops.length,
    products: products.length,
    offerTitles: offers.map(item => item.title),
    shopNames: shops.map(item => item.name),
    productTitles: products.map(item => item.title),
  });

  return { offers, shops, products };
}

async function fetchWishlistByType(
  type: 'offers',
  token: string,
): Promise<WishlistOfferItem[]>;
async function fetchWishlistByType(
  type: 'shops',
  token: string,
): Promise<WishlistShopItem[]>;
async function fetchWishlistByType(
  type: 'products',
  token: string,
): Promise<WishlistProductItem[]>;
async function fetchWishlistByType(type: WishlistType, token: string) {
  const all = await fetchAllWishlist(token);
  if (type === 'offers') {
    return all.offers;
  }
  if (type === 'shops') {
    return all.shops;
  }
  return all.products;
}

export const wishlistApi = {
  fetchByType: fetchWishlistByType,
  fetchAll: fetchAllWishlist,

  async add(type: WishlistType, id: string, token: string): Promise<string> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new Error(`${typeLabel(type)} id is required.`);
    }

    const payload = await apiRequest<WishlistMutationResponse>(
      API_ENDPOINTS.addWishlistItem(type, normalizedId),
      {
        method: 'POST',
        token,
      },
    );

    return extractWishlistMessage(payload, `${typeLabel(type)} saved to wishlist.`);
  },

  async remove(type: WishlistType, id: string, token: string): Promise<string> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      throw new Error(`${typeLabel(type)} id is required.`);
    }

    const payload = await apiRequest<WishlistMutationResponse>(
      API_ENDPOINTS.removeWishlistItem(type, normalizedId),
      {
        method: 'DELETE',
        token,
      },
    );

    return extractWishlistMessage(payload, `${typeLabel(type)} removed from wishlist.`);
  },

  async clear(token: string): Promise<string> {
    const payload = await apiRequest<WishlistMutationResponse>(API_ENDPOINTS.clearOfferWishlist, {
      method: 'DELETE',
      token,
    });
    return extractWishlistMessage(payload, 'Wishlist cleared.');
  },

  async isSaved(type: WishlistType, id: string, token: string): Promise<boolean> {
    const normalizedId = id.trim();
    if (!normalizedId) {
      return false;
    }

    const all = await fetchAllWishlist(token);
    if (type === 'offers') {
      return all.offers.some(item => item.offerId === normalizedId || item.id === normalizedId);
    }
    if (type === 'shops') {
      return all.shops.some(item => item.shopId === normalizedId || item.id === normalizedId);
    }
    return all.products.some(
      item => item.productId === normalizedId || item.id === normalizedId,
    );
  },
};

/** @deprecated Use wishlistApi — kept for existing call sites during migration. */
export const offerWishlistApi = {
  fetchWishlist(token: string) {
    return wishlistApi.fetchByType('offers', token);
  },
  addToWishlist(offerId: string, token: string) {
    return wishlistApi.add('offers', offerId, token);
  },
  removeFromWishlist(offerId: string, token: string) {
    return wishlistApi.remove('offers', offerId, token);
  },
  clearWishlist(token: string) {
    return wishlistApi.clear(token);
  },
  isOfferWishlisted(offerId: string, token: string) {
    return wishlistApi.isSaved('offers', offerId, token);
  },
};
