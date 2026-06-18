import { API_ENDPOINTS, resolveProfileImageUrl, SHOPS_API_BASE_URL } from '../config/api';
import { OfferDetail, ShopOffer, ShopWithOffers } from '../types/shop';
import { apiRequest } from './apiClient';
import { parseOfferDetailResponse } from './offerResponseParser';
import { parseShopDetailResponse, parseShopOffersResponse, parseShopsResponse } from './shopResponseParser';

export const shopApi = {
  fetchShopsByCity(city: string, token?: string) {
    const normalizedCity = city.trim();
    if (!normalizedCity) {
      return Promise.resolve([]);
    }

    return apiRequest<unknown>(API_ENDPOINTS.shopsByCity(normalizedCity), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(parseShopsResponse);
  },

  fetchShopOffers(shopId: string, token?: string) {
    return apiRequest<unknown>(API_ENDPOINTS.shopOffers(shopId), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(payload => parseShopOffersResponse(payload, shopId));
  },

  fetchShopById(shopId: string, token?: string) {
    const normalizedId = shopId.trim();
    if (!normalizedId) {
      return Promise.reject(new Error('Shop id is required.'));
    }

    return apiRequest<unknown>(API_ENDPOINTS.shopById(normalizedId), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(payload => {
      const shop = parseShopDetailResponse(payload, normalizedId);
      if (!shop) {
        throw new Error('Shop not found.');
      }

      return shop;
    });
  },

  fetchOfferById(offerId: string, shopId: string, token?: string) {
    const normalizedId = offerId.trim();
    if (!normalizedId) {
      return Promise.reject(new Error('Offer id is required.'));
    }

    return apiRequest<unknown>(API_ENDPOINTS.offerById(normalizedId), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(payload => {
      const offer = parseOfferDetailResponse(payload, normalizedId, shopId);
      if (!offer) {
        throw new Error('Offer not found.');
      }

      return offer;
    });
  },

  async fetchShopByIdWithOffers(shopId: string, token?: string): Promise<ShopWithOffers> {
    const shop = await this.fetchShopById(shopId, token);

    if (shop.offers.length > 0) {
      return shop;
    }

    try {
      const offers = await this.fetchShopOffers(shopId, token);
      return { ...shop, offers };
    } catch {
      return shop;
    }
  },

  async fetchShopsWithOffersByCity(city: string, token?: string): Promise<ShopWithOffers[]> {
    const shops = await this.fetchShopsByCity(city, token);

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
