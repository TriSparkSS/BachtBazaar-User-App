import { ADMIN_API_BASE_URL, API_ENDPOINTS, resolveProfileImageUrl, SHOPS_API_BASE_URL } from '../config/api';
import { OfferBanner } from '../types/offerBanner';
import { SearchResults } from '../types/search';
import { OfferDetail, ShopOffer, ShopWithOffers } from '../types/shop';
import { apiRequest } from './apiClient';
import { parseAdminBannersResponse, parseOfferBannersResponse } from './offerBannerParser';
import { parseOfferDetailResponse } from './offerResponseParser';
import { parseSearchResponse } from './searchResponseParser';
import {
  parseShopDetailResponse,
  parseShopOffersResponse,
  parseShopsResponse,
  parseShopsWithOffersResponse,
} from './shopResponseParser';

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

  searchShopsProductsAndOffers(query: string, token?: string): Promise<SearchResults> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return Promise.resolve(parseSearchResponse({ query: '', results: {} }));
    }

    return apiRequest<unknown>(API_ENDPOINTS.shopSearch(normalizedQuery), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(parseSearchResponse);
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

  fetchAdminActiveBanners(token?: string): Promise<OfferBanner[]> {
    return apiRequest<unknown>(API_ENDPOINTS.adminBannerActiveFeed, {
      method: 'GET',
      token,
      baseUrl: ADMIN_API_BASE_URL,
    }).then(parseAdminBannersResponse);
  },

  fetchOfferBanners(city: string, categoryId: string, token?: string): Promise<OfferBanner[]> {
    const normalizedCity = city.trim();
    const normalizedCategoryId = categoryId.trim();

    if (!normalizedCity || !normalizedCategoryId || normalizedCategoryId === 'all') {
      return Promise.resolve([]);
    }

    return apiRequest<unknown>(API_ENDPOINTS.offerBanners(normalizedCity, normalizedCategoryId), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(parseOfferBannersResponse);
  },

  fetchHomeBanners(city: string, categoryId: string, token?: string): Promise<OfferBanner[]> {
    if (categoryId === 'all') {
      return this.fetchAdminActiveBanners(token);
    }

    return this.fetchOfferBanners(city, categoryId, token);
  },

  async fetchShopsWithOffersByCity(city: string, token?: string): Promise<ShopWithOffers[]> {
    const normalizedCity = city.trim();
    if (!normalizedCity) {
      return [];
    }

    const payload = await apiRequest<unknown>(API_ENDPOINTS.shopsByCity(normalizedCity), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    });

    const shops = parseShopsWithOffersResponse(payload);

    return Promise.all(
      shops.map(async shop => {
        if (shop.offers.length > 0) {
          return shop;
        }

        try {
          const offers = await this.fetchShopOffers(shop.id, token);
          return {
            ...shop,
            offers,
            offerCount: offers.length || shop.offerCount || 0,
          };
        } catch {
          return shop;
        }
      }),
    );
  },

  resolveImageUrl: resolveProfileImageUrl,
};
