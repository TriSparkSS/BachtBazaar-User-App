import { ADMIN_API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { apiRequest } from './apiClient';
import { RequestUrgency } from '../types/createRequest';

export type CreateBestRequestPayload = {
  title: string;
  categoryId: string;
  description?: string;
  budget?: string;
  urgency: RequestUrgency;
  formattedAddress: string;
};

export type BestRequestData = {
  _id: string;
  userId?: string;
  title: string;
  description?: string;
  categoryId?: string;
  budget?: number;
  timeframe?: string;
  latitude?: number;
  longitude?: number;
  formattedAddress?: string;
  city?: string;
  status?: string;
  bidCount?: number;
  expiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type MerchantBidData = {
  _id: string;
  requestId?: string;
  requestTitle?: string;
  title?: string;
  shopName?: string;
  merchantName?: string;
  shopId?: string;
  bidAmount?: number;
  price?: number;
  offerPrice?: number;
  status?: string;
  message?: string;
  note?: string;
  createdAt?: string;
  updatedAt?: string;
  distanceKm?: number;
  rating?: number;
  phone?: string;
};

type CreateBestRequestResponse = {
  success: boolean;
  message?: string;
  data: BestRequestData;
};

type CancelBestRequestResponse = {
  success: boolean;
  message?: string;
  data?: BestRequestData | null;
};

export const mapUrgencyToTimeframe = (urgency: RequestUrgency): string => {
  switch (urgency) {
    case 'today':
      return 'today';
    case 'soon':
      return 'within 2 days';
    case 'flexible':
    default:
      return 'flexible';
  }
};

const encodeFormBody = (fields: Record<string, string>) =>
  Object.entries(fields)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

const asRecord = (value: unknown): Record<string, unknown> | null =>
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

const parseBestRequest = (item: unknown): BestRequestData | null => {
  const row = asRecord(item);
  if (!row) {
    return null;
  }

  const id = String(row._id ?? row.id ?? '').trim();
  const title = String(row.title ?? row.product ?? row.name ?? '').trim();
  if (!id || !title) {
    return null;
  }

  const budgetRaw = row.budget;
  const budget =
    typeof budgetRaw === 'number'
      ? budgetRaw
      : Number(String(budgetRaw ?? '').replace(/[^\d.]/g, '')) || undefined;

  return {
    _id: id,
    userId: row.userId ? String(row.userId) : undefined,
    title,
    description: row.description ? String(row.description) : undefined,
    categoryId: row.categoryId ? String(row.categoryId) : undefined,
    budget,
    timeframe: row.timeframe ? String(row.timeframe) : undefined,
    latitude: typeof row.latitude === 'number' ? row.latitude : undefined,
    longitude: typeof row.longitude === 'number' ? row.longitude : undefined,
    formattedAddress: row.formattedAddress
      ? String(row.formattedAddress)
      : row.address
        ? String(row.address)
        : undefined,
    city: row.city ? String(row.city) : undefined,
    status: row.status ? String(row.status) : 'active',
    bidCount:
      typeof row.bidCount === 'number'
        ? row.bidCount
        : typeof row.bidsCount === 'number'
          ? row.bidsCount
          : undefined,
    expiresAt: row.expiresAt ? String(row.expiresAt) : undefined,
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
  };
};

const parseMerchantBid = (item: unknown): MerchantBidData | null => {
  const row = asRecord(item);
  if (!row) {
    return null;
  }

  const id = String(row._id ?? row.id ?? '').trim();
  if (!id) {
    return null;
  }

  const nestedRequest = asRecord(row.request) ?? asRecord(row.bestRequest);
  const nestedShop = asRecord(row.shop) ?? asRecord(row.merchant);

  const amountRaw = row.bidAmount ?? row.price ?? row.offerPrice ?? row.amount;
  const amount =
    typeof amountRaw === 'number'
      ? amountRaw
      : Number(String(amountRaw ?? '').replace(/[^\d.]/g, '')) || undefined;

  return {
    _id: id,
    requestId: String(row.requestId ?? nestedRequest?._id ?? nestedRequest?.id ?? '').trim() || undefined,
    requestTitle:
      String(
        row.requestTitle ??
          row.title ??
          nestedRequest?.title ??
          nestedRequest?.product ??
          '',
      ).trim() || undefined,
    title: row.title ? String(row.title) : undefined,
    shopName:
      String(
        row.shopName ??
          row.merchantName ??
          nestedShop?.name ??
          nestedShop?.shopName ??
          row.storeName ??
          'Merchant',
      ).trim() || 'Merchant',
    merchantName: row.merchantName ? String(row.merchantName) : undefined,
    shopId: String(row.shopId ?? nestedShop?._id ?? nestedShop?.id ?? '').trim() || undefined,
    bidAmount: amount,
    price: amount,
    offerPrice: amount,
    status: row.status ? String(row.status) : 'received',
    message: String(row.message ?? row.note ?? row.remark ?? '').trim() || undefined,
    note: row.note ? String(row.note) : undefined,
    createdAt: row.createdAt ? String(row.createdAt) : undefined,
    updatedAt: row.updatedAt ? String(row.updatedAt) : undefined,
    distanceKm: typeof row.distanceKm === 'number' ? row.distanceKm : undefined,
    rating: typeof row.rating === 'number' ? row.rating : undefined,
    phone: String(row.phone ?? nestedShop?.phone ?? '').trim() || undefined,
  };
};

export const bestRequestApi = {
  create(payload: CreateBestRequestPayload, token: string): Promise<CreateBestRequestResponse> {
    const budgetValue = String(payload.budget ?? '').replace(/[^\d.]/g, '') || '0';

    const body = encodeFormBody({
      title: payload.title.trim(),
      categoryId: payload.categoryId.trim(),
      description: (
        payload.description?.trim() || `Looking for best offers on ${payload.title.trim()}`
      ).trim(),
      budget: budgetValue,
      timeframe: mapUrgencyToTimeframe(payload.urgency),
      formattedAddress: payload.formattedAddress.trim(),
    });

    return apiRequest<CreateBestRequestResponse>(API_ENDPOINTS.createBestRequest, {
      method: 'POST',
      token,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });
  },

  async fetchMyRequests(token: string): Promise<BestRequestData[]> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.myBestRequests, {
      method: 'GET',
      token,
    });

    const root = asRecord(payload);
    const list = pickArray(
      payload,
      root?.data,
      asRecord(root?.data)?.requests,
      asRecord(root?.data)?.items,
      root?.requests,
      root?.items,
    );

    return list.map(parseBestRequest).filter((item): item is BestRequestData => Boolean(item));
  },

  cancel(requestId: string, token: string): Promise<CancelBestRequestResponse> {
    return apiRequest<CancelBestRequestResponse>(API_ENDPOINTS.cancelBestRequest(requestId), {
      method: 'POST',
      token,
    });
  },

  async fetchMerchantBidHistory(token: string): Promise<MerchantBidData[]> {
    const payload = await apiRequest<unknown>(API_ENDPOINTS.merchantBidHistory, {
      method: 'GET',
      token,
      baseUrl: ADMIN_API_BASE_URL,
    });

    const root = asRecord(payload);
    const list = pickArray(
      payload,
      root?.data,
      asRecord(root?.data)?.bids,
      asRecord(root?.data)?.history,
      asRecord(root?.data)?.items,
      root?.bids,
      root?.history,
      root?.items,
    );

    return list.map(parseMerchantBid).filter((item): item is MerchantBidData => Boolean(item));
  },

  async fetchBidsForRequest(requestId: string, token: string): Promise<MerchantBidData[]> {
    const payload = await apiRequest<unknown>(
      API_ENDPOINTS.merchantBidsForUserRequest(requestId),
      {
        method: 'GET',
        token,
        baseUrl: ADMIN_API_BASE_URL,
      },
    );

    const root = asRecord(payload);
    const list = pickArray(
      payload,
      root?.data,
      asRecord(root?.data)?.bids,
      asRecord(root?.data)?.offers,
      asRecord(root?.data)?.items,
      root?.bids,
      root?.offers,
      root?.items,
    );

    return list.map(parseMerchantBid).filter((item): item is MerchantBidData => Boolean(item));
  },
};
