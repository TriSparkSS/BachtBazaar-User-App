import {
  ADMIN_API_BASE_URL,
  API_BASE_URL,
  API_ENDPOINTS,
  resolveProfileImageUrl,
  SHOPS_API_BASE_URL,
} from '../config/api';
import { DailyRewardHistoryItem, DailyRewardsCalendar } from '../types/dailyRewards';
import { OfferBanner } from '../types/offerBanner';
import { SearchResults } from '../types/search';
import { OfferDetail, Shop, ShopOffer, ShopWithOffers } from '../types/shop';
import { parseMerchantDeliveryStatusResponse } from '../utils/shopDelivery';
import { apiRequest, logApiEvent } from './apiClient';
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

const shopMatchesMerchantId = (shop: Shop | undefined, merchantId: string): boolean =>
  Boolean(shop?.merchantId && shop.merchantId.trim() === merchantId);

const findShopIdByMerchantId = (shops: Shop[], merchantId: string): string | null => {
  const hit = shops.find(shop => shopMatchesMerchantId(shop, merchantId));
  return hit?.id?.trim() || null;
};

export const shopApi = {
  fetchShopsByCity(city: string, categoryId?: string, token?: string) {
    const normalizedCity = city.trim();
    if (!normalizedCity) {
      return Promise.resolve([] as Shop[]);
    }

    return apiRequest<unknown>(API_ENDPOINTS.shopsByCity(normalizedCity, categoryId), {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    }).then(parseShopsResponse);
  },

  /**
   * Store QR often encodes merchantId (not shop `_id`).
   * Resolve via search (`/shop/search?q=`) then city list (`/shop?city=`), matching merchantId.
   * Never treat merchantId as shopId.
   */
  async resolveShopIdByMerchantId(
    params: { merchantId: string; shopName?: string; city?: string },
    token?: string,
  ): Promise<string | null> {
    const merchantId = params.merchantId.trim();
    if (!merchantId) {
      return null;
    }

    const shopName = params.shopName?.trim() || '';
    const city = params.city?.trim() || '';

    logApiEvent('QR merchant→shop lookup start', {
      merchantId,
      shopName: shopName || undefined,
      city: city || undefined,
    });

    const verifyCandidate = async (candidateId: string): Promise<string | null> => {
      const normalized = candidateId.trim();
      if (!normalized || normalized === merchantId) {
        return null;
      }
      try {
        const detail = await this.fetchShopById(normalized, token);
        if (shopMatchesMerchantId(detail, merchantId)) {
          return detail.id;
        }
        // Detail parsers may omit merchantId on some payloads; accept name-matched id
        // only when detail fetch succeeds and QR had that exact shop name.
        if (
          shopName &&
          detail.name.trim().toLowerCase() === shopName.toLowerCase() &&
          !detail.merchantId
        ) {
          return detail.id;
        }
      } catch {
        return null;
      }
      return null;
    };

    // 1) Search by shop name — match merchantId on results (or verify name hits).
    if (shopName) {
      try {
        const search = await this.searchShopsProductsAndOffers(shopName, token);
        const direct = findShopIdByMerchantId(search.shops, merchantId);
        if (direct && direct !== merchantId) {
          logApiEvent('QR merchant→shop via search merchantId', {
            merchantId,
            shopId: direct,
            query: shopName,
          });
          return direct;
        }

        const nameNorm = shopName.toLowerCase();
        const nameHits = search.shops.filter(shop => {
          const n = shop.name.trim().toLowerCase();
          return n === nameNorm || n.includes(nameNorm);
        });

        for (const hit of nameHits) {
          const verified = await verifyCandidate(hit.id);
          if (verified) {
            logApiEvent('QR merchant→shop via search name verify', {
              merchantId,
              shopId: verified,
              query: shopName,
            });
            return verified;
          }
        }
      } catch (error) {
        logApiEvent('QR merchant→shop search failed', {
          merchantId,
          query: shopName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // 2) City shop list — API returns nested merchantId on shop objects.
    if (city) {
      try {
        const cityShops = await this.fetchShopsByCity(city, undefined, token);
        const direct = findShopIdByMerchantId(cityShops, merchantId);
        if (direct && direct !== merchantId) {
          logApiEvent('QR merchant→shop via city list', {
            merchantId,
            shopId: direct,
            city,
          });
          return direct;
        }

        if (shopName) {
          const nameNorm = shopName.toLowerCase();
          const nameHits = cityShops.filter(shop => {
            const n = shop.name.trim().toLowerCase();
            return n === nameNorm || n.includes(nameNorm);
          });
          for (const hit of nameHits) {
            const verified = await verifyCandidate(hit.id);
            if (verified) {
              logApiEvent('QR merchant→shop via city name verify', {
                merchantId,
                shopId: verified,
                city,
              });
              return verified;
            }
          }
        }
      } catch (error) {
        logApiEvent('QR merchant→shop city list failed', {
          merchantId,
          city,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    logApiEvent('QR merchant→shop lookup miss', { merchantId, shopName, city });
    return null;
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

  searchShopsProductsAndOffers(
    query: string,
    token?: string,
    options?: { offerTypeId?: string },
  ): Promise<SearchResults> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return Promise.resolve(parseSearchResponse({ query: '', results: {} }));
    }

    return apiRequest<unknown>(
      API_ENDPOINTS.shopSearch(normalizedQuery, options?.offerTypeId),
      {
        method: 'GET',
        token,
        baseUrl: SHOPS_API_BASE_URL,
      },
    ).then(parseSearchResponse);
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

  redeemUserOffer(offerId: string, token: string) {
    const normalizedOfferId = offerId.trim();
    if (!normalizedOfferId) {
      return Promise.reject(new Error('Offer id is required.'));
    }

    return apiRequest<{ success: boolean; message?: string }>(
      API_ENDPOINTS.redeemUserOffer(normalizedOfferId),
      {
        method: 'POST',
        token,
        baseUrl: ADMIN_API_BASE_URL,
      },
    );
  },

  claimDirectUserOffer(offerId: string, userId: string, token: string) {
    const normalizedOfferId = offerId.trim();
    const normalizedUserId = userId.trim();
    if (!normalizedOfferId) {
      return Promise.reject(new Error('Offer id is required.'));
    }
    if (!normalizedUserId) {
      return Promise.reject(new Error('User id is required.'));
    }

    const body = new URLSearchParams();
    body.append('offerId', normalizedOfferId);
    body.append('userId', normalizedUserId);

    return apiRequest<{
      success?: boolean;
      message?: string;
      data?: {
        offerTitle?: string;
        claimedAt?: string;
        status?: string;
      };
    }>(API_ENDPOINTS.claimDirectUserOffer(normalizedOfferId), {
      method: 'POST',
      token,
      body,
      baseUrl: ADMIN_API_BASE_URL,
    });
  },

  fetchOfferRedemptionHistory(token: string): Promise<DailyRewardHistoryItem[]> {
    const toRecord = (value: unknown): Record<string, unknown> | null =>
      value && typeof value === 'object' && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null;

    const pickArray = (...candidates: unknown[]): unknown[] => {
      for (const candidate of candidates) {
        if (Array.isArray(candidate)) {
          return candidate;
        }
      }
      return [];
    };

    const parseHistoryItem = (value: unknown): DailyRewardHistoryItem | null => {
      const row = toRecord(value);
      if (!row) {
        return null;
      }

      const offerDetails = toRecord(row.offerDetails);
      const shopDetails = toRecord(row.shopDetails);

      const id = String(
        row.redemptionId ??
          row._id ??
          row.id ??
          offerDetails?._id ??
          offerDetails?.offerId ??
          row.offerId ??
          row.offer_id ??
          '',
      ).trim();
      const title = String(
        offerDetails?.title ??
          row.title ??
          row.offerTitle ??
          row.offer_title ??
          row.name ??
          '',
      ).trim();
      if (!id || !title) {
        return null;
      }

      return {
        id,
        offerId: String(
          offerDetails?.offerId ??
            offerDetails?.offer_id ??
            offerDetails?._id ??
            row.offerId ??
            row.offer_id ??
            '',
        ).trim() || undefined,
        title,
        subtitle:
          String(
            shopDetails?.shopName ??
              shopDetails?.name ??
              shopDetails?.city ??
              row.subtitle ??
              row.shopName ??
              row.shop_name ??
              row.merchantName ??
              '',
          ).trim() || undefined,
        claimedAt:
          String(
            row.redeemedAt ??
              row.claimedAt ??
              row.claimed_at ??
              row.createdAt ??
              row.created_at ??
              '',
          ).trim() ||
          undefined,
        image:
          String(
            offerDetails?.thumbnail ??
              offerDetails?.image ??
              row.image ??
              row.offerImage ??
              row.offer_image ??
              '',
          ).trim() || undefined,
        statusLabel: String(
          row.status ?? row.statusLabel ?? row.redemptionStatus ?? 'Redeemed',
        ).trim(),
      };
    };

    return apiRequest<unknown>(API_ENDPOINTS.offerRedemptionHistory, {
      method: 'GET',
      token,
      baseUrl: ADMIN_API_BASE_URL,
    }).then(payload => {
      const root = toRecord(payload);
      const list = pickArray(
        payload,
        root?.data,
        toRecord(root?.data)?.history,
        toRecord(root?.data)?.items,
        root?.history,
        root?.items,
      );

      return list
        .map(parseHistoryItem)
        .filter((item): item is DailyRewardHistoryItem => Boolean(item));
    });
  },

  fetchHomeBanners(categoryId: string, token?: string): Promise<OfferBanner[]> {
    const normalizedCategoryId = categoryId.trim();

    if (!normalizedCategoryId || normalizedCategoryId === 'all') {
      return this.fetchAdminActiveBanners(token);
    }

    return this.fetchOfferBanners(normalizedCategoryId, token);
  },

  async fetchHomeShops(
    categoryId: string,
    token?: string,
  ): Promise<ShopWithOffers[]> {
    const normalizedCategoryId = categoryId.trim();
    const endpoint =
      normalizedCategoryId && normalizedCategoryId !== 'all'
        ? API_ENDPOINTS.shopsAllByCategory(normalizedCategoryId)
        : API_ENDPOINTS.shopsAll;

    const payload = await apiRequest<unknown>(endpoint, {
      method: 'GET',
      token,
      baseUrl: SHOPS_API_BASE_URL,
    });

    // List payload only — never GET /shop/:id (store detail) from Home or refresh.
    return parseShopsWithOffersResponse(payload);
  },

  /**
   * GET /api/merchants/:id/delivery-status — source of truth for Product Detail
   * Add to Cart / Request Delivery gating. Uses logged-in user Bearer token.
   * Tries ADMIN base first (`/api`), then shops (`/api/users`) and user (`/api/user`) on 404.
   */
  async fetchMerchantDeliveryStatus(
    merchantId: string,
    token: string,
  ): Promise<{ providesDelivery: boolean; url: string }> {
    const normalizedId = merchantId.trim();
    if (!normalizedId) {
      throw new Error('Merchant id is required.');
    }
    if (!token.trim()) {
      throw new Error('Auth token is required.');
    }

    const path = API_ENDPOINTS.merchantDeliveryStatus(normalizedId);
    const bases = [
      { label: 'admin', baseUrl: ADMIN_API_BASE_URL },
      { label: 'shops', baseUrl: SHOPS_API_BASE_URL },
      { label: 'user', baseUrl: API_BASE_URL },
    ];

    let lastError: Error | undefined;

    for (const { label, baseUrl } of bases) {
      const url = `${baseUrl}${path}`;
      try {
        const payload = await apiRequest<unknown>(path, {
          method: 'GET',
          token,
          baseUrl,
        });
        const providesDelivery = parseMerchantDeliveryStatusResponse(payload);
        logApiEvent('merchant delivery-status', {
          merchantId: normalizedId,
          base: label,
          url,
          isDeliveryEnabled: providesDelivery,
          providesDelivery,
        });
        return { providesDelivery, url };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const is404 =
          message.toLowerCase().includes('404') ||
          message.toLowerCase().includes('not found');
        logApiEvent('merchant delivery-status miss', {
          merchantId: normalizedId,
          base: label,
          url,
          error: message,
          willRetry: is404,
        });
        lastError = error instanceof Error ? error : new Error(message);
        if (!is404) {
          throw lastError;
        }
      }
    }

    throw lastError ?? new Error('Merchant delivery-status request failed.');
  },

  resolveImageUrl: resolveProfileImageUrl,
};
