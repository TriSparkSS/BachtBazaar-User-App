import { API_ENDPOINTS, resolveProfileImageUrl } from '../config/api';
import { Shop, ShopOffer, ShopWithOffers } from '../types/shop';
import { apiRequest } from './apiClient';
import { parseShopOffersResponse, parseShopsResponse } from './shopResponseParser';

export const shopApi = {
  fetchShops(token?: string) {
    return apiRequest<unknown>(API_ENDPOINTS.shops, {
      method: 'GET',
      token,
    }).then(parseShopsResponse);
  },

  fetchShopOffers(shopId: string, token?: string) {
    return apiRequest<unknown>(API_ENDPOINTS.shopOffers(shopId), {
      method: 'GET',
      token,
    }).then(payload => parseShopOffersResponse(payload, shopId));
  },

  async fetchShopsWithOffers(token?: string): Promise<ShopWithOffers[]> {
    const shops = await this.fetchShops(token);

    const shopsWithOffers = await Promise.all(
      shops.map(async shop => {
        try {
          const offers = await this.fetchShopOffers(shop.id, token);
          return { ...shop, offers };
        } catch {
          return { ...shop, offers: [] as ShopOffer[] };
        }
      }),
    );

    return shopsWithOffers;
  },

  resolveImageUrl: resolveProfileImageUrl,
};
