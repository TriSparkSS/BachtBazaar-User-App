import { ADMIN_API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { RequestUrgency } from '../types/createRequest';
import { Shop } from '../types/shop';
import { formatShopAddress } from '../utils/shop';
import { apiRequest } from './apiClient';
import { resolveShopMediaFromApiValue } from './shopResponseParser';
import { shopApi } from './shopApi';

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
  merchantId?: string;
  shopId?: string;
  address?: string;
  city?: string;
  details?: string;
  email?: string;
  logo?: string;
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
  whatsapp?: string;
};

type CreateBestRequestResponse = {
  success: boolean;
  message?: string;
  data: BestRequestData;
};

type EditBestRequestResponse = {
  success: boolean;
  message?: string;
  data: BestRequestData;
};

type CancelBestRequestResponse = {
  success: boolean;
  message?: string;
  data?: BestRequestData | null;
};

type DeleteBestRequestResponse = {
  success: boolean;
  message?: string;
  data?: BestRequestData | null;
};

type CloseMerchantBidResponse = {
  success: boolean;
  message?: string;
  data?: MerchantBidData | null;
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

const parseObjectIdLike = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed && trimmed !== '[object Object]' ? trimmed : undefined;
  }

  const record = asRecord(value);
  if (!record) {
    return undefined;
  }

  return (
    String(record._id ?? record.id ?? record.categoryId ?? '')
      .trim() || undefined
  );
};

const pickTrimmedString = (...candidates: unknown[]): string | undefined => {
  for (const candidate of candidates) {
    if (typeof candidate === 'number' && Number.isFinite(candidate)) {
      return String(candidate);
    }
    if (typeof candidate === 'string') {
      const trimmed = candidate.trim();
      if (trimmed && trimmed !== '[object Object]') {
        return trimmed;
      }
    }
  }
  return undefined;
};

const pickPhoneValue = (...sources: Array<Record<string, unknown> | null | undefined>) => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const phone = pickTrimmedString(
      source.phone,
      source.mobile,
      source.mobileNumber,
      source.mobile_number,
      source.contactNumber,
      source.contact_number,
      source.contactPhone,
      source.contact_phone,
      source.whatsapp,
      source.whatsappNumber,
      source.whatsapp_number,
      source.ownerPhone,
      source.owner_phone,
    );

    if (phone) {
      return phone;
    }
  }

  return undefined;
};

const buildMerchantAddress = (
  ...sources: Array<Record<string, unknown> | null | undefined>
): string | undefined => {
  for (const source of sources) {
    if (!source) {
      continue;
    }

    const direct = pickTrimmedString(
      source.formattedAddress,
      source.formatted_address,
      source.fullAddress,
      source.full_address,
      source.address,
      source.shopAddress,
      source.shop_address,
    );
    if (direct) {
      return direct;
    }

    const parts = [
      pickTrimmedString(source.address1, source.address_1, source.street, source.landmark),
      pickTrimmedString(source.city),
      pickTrimmedString(source.state),
      pickTrimmedString(source.pincode, source.pinCode, source.pin_code, source.zip),
    ].filter(Boolean);

    if (parts.length) {
      return parts.join(', ');
    }
  }

  return undefined;
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

  const nestedCategory = asRecord(row.category) ?? asRecord(row.categoryId);

  return {
    _id: id,
    userId: row.userId ? String(row.userId) : undefined,
    title,
    description: row.description ? String(row.description) : undefined,
    categoryId:
      parseObjectIdLike(row.categoryId) ??
      parseObjectIdLike(row.category) ??
      parseObjectIdLike(nestedCategory?._id) ??
      undefined,
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
  // Bids API often nests shop under `shopId` (populated object), not `shop`
  const nestedShop =
    asRecord(row.shopId) ??
    asRecord(row.shop) ??
    asRecord(row.shopDetails) ??
    asRecord(row.shop_details) ??
    asRecord(row.merchantShop);
  const nestedMerchant =
    asRecord(row.merchant) ??
    asRecord(row.merchantId) ??
    asRecord(row.merchantDetails) ??
    asRecord(row.merchant_details) ??
    asRecord(row.owner) ??
    asRecord(nestedShop?.merchant) ??
    asRecord(nestedShop?.merchantId) ??
    asRecord(nestedShop?.owner);

  const amountRaw =
    row.bidAmount ??
    row.quotedPrice ??
    row.quoted_price ??
    row.offeredPrice ??
    row.offered_price ??
    row.offerPrice ??
    row.price ??
    row.amount;
  const amount =
    typeof amountRaw === 'number'
      ? amountRaw
      : Number(String(amountRaw ?? '').replace(/[^\d.]/g, '')) || undefined;

  const shopName =
    pickTrimmedString(
      row.shopName,
      row.shop_name,
      row.storeName,
      nestedShop?.shopName,
      nestedShop?.shop_name,
      nestedShop?.name,
      nestedShop?.businessName,
      nestedShop?.business_name,
    ) || undefined;

  const merchantId =
    pickTrimmedString(row.merchantId, nestedMerchant?._id, nestedMerchant?.id) || undefined;

  const merchantName =
    pickTrimmedString(
      row.merchantName,
      row.merchant_name,
      nestedMerchant?.name,
      nestedMerchant?.fullName,
      nestedMerchant?.full_name,
      nestedMerchant?.ownerName,
      nestedMerchant?.owner_name,
      nestedShop?.merchantName,
      nestedShop?.ownerName,
    ) || undefined;

  const phone = pickPhoneValue(row, nestedShop, nestedMerchant);
  const whatsapp =
    pickTrimmedString(
      row.whatsapp,
      row.whatsappNumber,
      row.whatsapp_number,
      nestedShop?.whatsapp,
      nestedShop?.whatsappNumber,
      nestedShop?.whatsapp_number,
      nestedMerchant?.whatsapp,
      nestedMerchant?.whatsappNumber,
      nestedMerchant?.whatsapp_number,
    ) || phone;

  const address = buildMerchantAddress(row, nestedShop, nestedMerchant);
  const city = pickTrimmedString(row.city, nestedShop?.city, nestedMerchant?.city);
  const details =
    pickTrimmedString(
      row.details,
      row.description,
      row.offerDetails,
      row.offer_details,
      nestedShop?.description,
      nestedShop?.about,
      nestedShop?.tagline,
      nestedMerchant?.about,
    ) || undefined;

  const message =
    pickTrimmedString(row.message, row.note, row.remark, row.offerMessage, row.offer_message) ||
    undefined;

  const distanceRaw = row.distanceKm ?? row.distance_km ?? row.distance ?? nestedShop?.distanceKm;
  const distanceKm =
    typeof distanceRaw === 'number'
      ? distanceRaw
      : Number(String(distanceRaw ?? '').replace(/[^\d.]/g, '')) || undefined;

  const ratingRaw =
    row.rating ?? row.avgRating ?? row.avg_rating ?? nestedShop?.rating ?? nestedShop?.avgRating;
  const rating =
    typeof ratingRaw === 'number'
      ? ratingRaw
      : Number(String(ratingRaw ?? '').replace(/[^\d.]/g, '')) || undefined;

  const shopId =
    pickTrimmedString(
      typeof row.shopId === 'string' || typeof row.shopId === 'number' ? row.shopId : undefined,
      nestedShop?._id,
      nestedShop?.id,
      nestedShop?.shopId,
      row.shop_id,
    ) || undefined;

  return {
    _id: id,
    requestId:
      pickTrimmedString(row.requestId, nestedRequest?._id, nestedRequest?.id) || undefined,
    requestTitle:
      pickTrimmedString(
        row.requestTitle,
        row.title,
        nestedRequest?.title,
        nestedRequest?.product,
      ) || undefined,
    title: pickTrimmedString(row.title) || undefined,
    shopName: shopName || 'Merchant',
    merchantName,
    merchantId,
    shopId,
    address,
    city,
    details,
    email: pickTrimmedString(row.email, nestedMerchant?.email, nestedShop?.email) || undefined,
    logo:
      resolveShopMediaFromApiValue(nestedShop?.logo) ??
      resolveShopMediaFromApiValue(row.logo) ??
      resolveShopMediaFromApiValue(nestedMerchant?.logo) ??
      undefined,
    bidAmount: amount,
    price: amount,
    offerPrice: amount,
    status: pickTrimmedString(row.status) || 'received',
    message,
    note: pickTrimmedString(row.note) || undefined,
    createdAt: pickTrimmedString(row.createdAt) || undefined,
    updatedAt: pickTrimmedString(row.updatedAt) || undefined,
    distanceKm,
    rating,
    phone,
    whatsapp,
  };
};

const mergeShopIntoBid = (bid: MerchantBidData, shop: Shop): MerchantBidData => {
  const address = formatShopAddress(shop) || bid.address;
  const ratingNumber =
    shop.rating != null && shop.rating !== ''
      ? Number(String(shop.rating).replace(/[^\d.]/g, '')) || bid.rating
      : bid.rating;

  return {
    ...bid,
    shopId: shop.id || bid.shopId,
    shopName:
      (shop.name && shop.name.trim()) ||
      (bid.shopName && bid.shopName !== 'Merchant' ? bid.shopName : undefined) ||
      'Merchant',
    merchantName: shop.merchantName?.trim() || bid.merchantName,
    merchantId: bid.merchantId,
    address,
    city: shop.city?.trim() || bid.city,
    details: shop.tagline?.trim() || bid.details,
    phone: shop.phone?.trim() || bid.phone,
    whatsapp: shop.phone?.trim() || bid.whatsapp || bid.phone,
    email: shop.email?.trim() || bid.email,
    logo: shop.logo || bid.logo,
    rating: ratingNumber,
  };
};

const enrichBidsWithShopDetails = async (
  bids: MerchantBidData[],
  token: string,
): Promise<MerchantBidData[]> => {
  const shopCache = new Map<string, Shop | null>();

  return Promise.all(
    bids.map(async bid => {
      const shopId = bid.shopId?.trim();
      if (!shopId) {
        return bid;
      }

      if (!shopCache.has(shopId)) {
        try {
          const shop = await shopApi.fetchShopById(shopId, token);
          shopCache.set(shopId, shop);
        } catch {
          shopCache.set(shopId, null);
        }
      }

      const shop = shopCache.get(shopId);
      return shop ? mergeShopIntoBid(bid, shop) : bid;
    }),
  );
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

  edit(
    requestId: string,
    payload: CreateBestRequestPayload,
    token: string,
  ): Promise<EditBestRequestResponse> {
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

    return apiRequest<EditBestRequestResponse>(API_ENDPOINTS.editBestRequest(requestId), {
      method: 'PUT',
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

  delete(requestId: string, token: string): Promise<DeleteBestRequestResponse> {
    return apiRequest<DeleteBestRequestResponse>(API_ENDPOINTS.deleteBestRequest(requestId), {
      method: 'DELETE',
      token,
    });
  },

  closeBid(requestId: string, token: string): Promise<CloseMerchantBidResponse> {
    const normalizedId = requestId.trim();
    if (!normalizedId) {
      return Promise.reject(new Error('Request id is required.'));
    }

    return apiRequest<CloseMerchantBidResponse>(API_ENDPOINTS.closeBestRequest(normalizedId), {
      method: 'PUT',
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

    return enrichBidsWithShopDetails(
      list.map(parseMerchantBid).filter((item): item is MerchantBidData => Boolean(item)),
      token,
    );
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

    const bids = list
      .map(parseMerchantBid)
      .filter((item): item is MerchantBidData => Boolean(item));

    return enrichBidsWithShopDetails(bids, token);
  },
};
