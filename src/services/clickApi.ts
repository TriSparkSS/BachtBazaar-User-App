import { ADMIN_API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { apiRequest } from './apiClient';

type ClickResponse = {
  success?: boolean;
  message?: string;
};

const recordQuietly = async (task: Promise<unknown>) => {
  try {
    await task;
  } catch {
    // Click tracking must never block store/offer/redeem flows.
  }
};

export const clickApi = {
  recordShopClick(shopId: string, token: string): Promise<ClickResponse> {
    const id = shopId.trim();
    if (!id) {
      return Promise.reject(new Error('Shop id is required.'));
    }
    return apiRequest<ClickResponse>(API_ENDPOINTS.clickShop(id), {
      method: 'GET',
      token,
      baseUrl: ADMIN_API_BASE_URL,
    });
  },

  recordOfferClick(offerId: string, token: string): Promise<ClickResponse> {
    const id = offerId.trim();
    if (!id) {
      return Promise.reject(new Error('Offer id is required.'));
    }
    return apiRequest<ClickResponse>(API_ENDPOINTS.clickOffer(id), {
      method: 'GET',
      token,
      baseUrl: ADMIN_API_BASE_URL,
    });
  },

  recordRedeemClick(
    payload: {
      offerId: string;
      shopId: string;
    },
    token: string,
  ): Promise<ClickResponse> {
    const offerId = payload.offerId.trim();
    const shopId = payload.shopId.trim();
    if (!offerId) {
      return Promise.reject(new Error('Offer id is required.'));
    }
    if (!shopId || shopId === offerId) {
      return Promise.reject(new Error('Shop id is required.'));
    }
    const body = new URLSearchParams();
    body.append('offerId', offerId);
    body.append('shopId', shopId);
    return apiRequest<ClickResponse>(API_ENDPOINTS.clickUserRedeem, {
      method: 'POST',
      token,
      baseUrl: ADMIN_API_BASE_URL,
      body,
    });
  },

  trackShopClick(shopId?: string | null, token?: string | null) {
    const id = shopId?.trim();
    const auth = token?.trim();
    if (!id || !auth) {
      return;
    }
    void recordQuietly(this.recordShopClick(id, auth));
  },

  trackOfferClick(offerId?: string | null, token?: string | null) {
    const id = offerId?.trim();
    const auth = token?.trim();
    if (!id || !auth) {
      return;
    }
    void recordQuietly(this.recordOfferClick(id, auth));
  },

  trackRedeemClick(
    payload: {
      offerId?: string | null;
      shopId?: string | null;
    },
    token?: string | null,
  ) {
    const offerId = payload.offerId?.trim();
    const shopId = payload.shopId?.trim();
    const auth = token?.trim();
    if (!offerId || !shopId || shopId === offerId || !auth) {
      return;
    }
    void recordQuietly(this.recordRedeemClick({ offerId, shopId }, auth));
  },
};
