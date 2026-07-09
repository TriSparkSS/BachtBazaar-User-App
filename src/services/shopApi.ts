import { ADMIN_API_BASE_URL, API_ENDPOINTS, resolveProfileImageUrl, SHOPS_API_BASE_URL } from '../config/api';
import { DailyRewardsCalendar } from '../types/dailyRewards';
import { OfferBanner } from '../types/offerBanner';
import { SearchResults } from '../types/search';
import { OfferDetail, ShopOffer, ShopWithOffers } from '../types/shop';
import { apiRequest } from './apiClient';
import { parseDailyRewardsCalendarResponse } from './dailyRewardsParser';
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
  fetchShopsByLocation(latitude: number, longitude: number, categoryId?: string, token?: string) {
    return apiRequest<unknown>(API_ENDPOINTS.shopsByLocation(latitude, longitude, categoryId), {
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

  fetchDailyRewardsCalendar(date: string, token?: string): Promise<DailyRewardsCalendar> {
    const normalizedDate = date.trim();
    if (!normalizedDate) {
      return Promise.reject(new Error('Date is required.'));
    }

    return apiRequest<unknown>(API_ENDPOINTS.dailyRewardsCalendar(normalizedDate), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(payload => parseDailyRewardsCalendarResponse(payload, normalizedDate));
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

  fetchOfferBanners(categoryId: string, token?: string): Promise<OfferBanner[]> {
    const normalizedCategoryId = categoryId.trim();

    if (!normalizedCategoryId || normalizedCategoryId === 'all') {
      return Promise.resolve([]);
    }

    return apiRequest<unknown>(API_ENDPOINTS.offerBanners(normalizedCategoryId), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(parseOfferBannersResponse);
  },

  fetchHomeBanners(categoryId: string, token?: string): Promise<OfferBanner[]> {
    const normalizedCategoryId = categoryId.trim();

    if (!normalizedCategoryId || normalizedCategoryId === 'all') {
      return this.fetchAdminActiveBanners(token);
    }

    return this.fetchOfferBanners(normalizedCategoryId, token);
  },

  async enrichShopListLogo(shop: ShopWithOffers, token?: string): Promise<ShopWithOffers> {
    if (shop.logo) {
      return shop;
    }

    try {
      const detail = await this.fetchShopById(shop.id, token);
      if (!detail.logo) {
        return shop;
      }

      return {
        ...shop,
        logo: detail.logo,
      };
    } catch {
      return shop;
    }
  },

  async fetchHomeShops(
    categoryId: string,
    token?: string,
    coordinates?: { latitude: number; longitude: number } | null,
  ): Promise<ShopWithOffers[]> {
    const normalizedCategoryId = categoryId.trim();
    const endpoint =
      normalizedCategoryId && normalizedCategoryId !== 'all'
        ? API_ENDPOINTS.shopsAllByCategory(normalizedCategoryId)
        : coordinates
          ? API_ENDPOINTS.shopsByLocation(coordinates.latitude, coordinates.longitude)
          : null;

    if (!endpoint) {
      return [];
    }

    const payload = await apiRequest<unknown>(endpoint, {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    });

    const shops = parseShopsWithOffersResponse(payload);

    return Promise.all(
      shops.map(async shop => {
        let enrichedShop = await this.enrichShopListLogo(shop, token);

        if (enrichedShop.offers.length > 0) {
          return enrichedShop;
        }

        try {
          const offers = await this.fetchShopOffers(enrichedShop.id, token);
          return {
            ...enrichedShop,
            offers,
            offerCount: offers.length || enrichedShop.offerCount || 0,
          };
        } catch {
          return enrichedShop;
        }
      }),
    );
  },

  resolveImageUrl: resolveProfileImageUrl,
};
