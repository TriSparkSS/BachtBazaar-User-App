import { logApiEvent } from '../services/apiClient';

export const OFFER_QR_TYPE = 'bachatbazaar_offer';
export const USER_QR_TYPE = 'bachatbazaar_user';
export const STORE_QR_TYPE = 'bachatbazaar_store';
export const SHOP_QR_TYPE = 'bachatbazaar_shop';
export const PRODUCT_QR_TYPE = 'bachatbazaar_product';

export type OfferQrPayload = {
  type: typeof OFFER_QR_TYPE;
  version: 1;
  userId: string;
  merchantId: string;
  offerId: string;
  offerType: string;
  shopId?: string;
  title: string;
  description?: string;
  discountPercentage?: number;
  discountValue?: number | null;
  minimumPurchaseAmount?: number;
  numberOfWinners?: number;
  startDate?: string;
  endDate?: string;
  displayType?: string;
  isActive?: boolean;
  thumbnail?: string;
  shopName?: string;
};

export type UserQrPayload = {
  type: typeof USER_QR_TYPE;
  version: 1;
  userId: string;
  name?: string;
  userName?: string;
  phone?: string;
  email?: string;
  city?: string;
};

export type StoreQrPayload = {
  type: typeof STORE_QR_TYPE | typeof SHOP_QR_TYPE | 'store' | 'shop';
  version?: number;
  /** Real shop `_id` when present. Many store QRs only send merchantId. */
  shopId?: string;
  storeId?: string;
  merchantId?: string;
  name?: string;
  shopName?: string;
  storeName?: string;
  city?: string;
};

export type ProductQrPayload = {
  type: typeof PRODUCT_QR_TYPE | 'product';
  version?: number;
  productId: string;
  shopId?: string;
  title?: string;
  name?: string;
  image?: string;
  thumbnail?: string;
  price?: string | number;
  shopName?: string;
};

/** Flexible offer shape used by Home rewards / shop offers. */
export type OfferQrSource = {
  _id?: string;
  id?: string;
  offerId?: string;
  userId?: string;
  user_id?: string;
  merchantId?: string;
  merchant_id?: string;
  shopId?: string;
  shop_id?: string;
  title?: string;
  description?: string;
  discount_percentage?: number;
  discountPercentage?: number;
  discount_value?: number | null;
  discountValue?: number | null;
  discountBadge?: string;
  minimum_purchase_amount?: number;
  minimumPurchaseAmount?: number;
  number_of_winners?: number;
  numberOfWinners?: number;
  start_date?: string;
  startDate?: string;
  end_date?: string;
  endDate?: string;
  display_type?: string;
  displayType?: string;
  offer_type?: string;
  offerType?: string;
  is_active?: boolean;
  isActive?: boolean;
  thumbnail?: string;
  image?: string;
  shopName?: string;
  shop_name?: string;
};

export type UserQrSource = {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  phone?: string;
  email?: string;
  city?: string;
};

export type ParsedQrField = {
  label: string;
  value: string;
};

export type ParsedQrKind = 'offer' | 'user' | 'store' | 'product' | 'unknown';

export type ParsedQrData = {
  raw: string;
  kind: ParsedQrKind;
  title: string;
  subtitle?: string;
  fields: ParsedQrField[];
  payload?: Record<string, any>;
};

const STORE_TYPE_ALIASES = new Set([
  STORE_QR_TYPE,
  SHOP_QR_TYPE,
  'store',
  'shop',
  'bachatbazaarstore',
  'bachatbazaarshop',
]);

const PRODUCT_TYPE_ALIASES = new Set([
  PRODUCT_QR_TYPE,
  'product',
  'bachatbazaarproduct',
]);

const normalizeQrType = (value: unknown): string =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');

export const isStoreQrType = (type: unknown): boolean =>
  STORE_TYPE_ALIASES.has(normalizeQrType(type));

export const isProductQrType = (type: unknown): boolean =>
  PRODUCT_TYPE_ALIASES.has(normalizeQrType(type));


const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.replace(/[^\d.-]/g, ''));
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim();
      if (trimmed && trimmed !== '[object Object]') {
        return trimmed;
      }
    }
  }
  return undefined;
};

const pickObjectId = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    const direct = pickString(value);
    if (direct) {
      return direct;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const record = value as Record<string, unknown>;
      const nested = pickString(record._id, record.id);
      if (nested) {
        return nested;
      }
    }
  }
  return undefined;
};

export const resolveMerchantIdFromQrPayload = (
  payload?: Record<string, unknown> | null,
): string => {
  if (!payload) {
    return '';
  }
  const nestedShop =
    payload.shop && typeof payload.shop === 'object' && !Array.isArray(payload.shop)
      ? (payload.shop as Record<string, unknown>)
      : null;
  const nestedMerchant =
    payload.merchant && typeof payload.merchant === 'object' && !Array.isArray(payload.merchant)
      ? (payload.merchant as Record<string, unknown>)
      : null;
  return (
    pickObjectId(
      payload.merchantId,
      payload.merchant_id,
      nestedShop?.merchantId,
      nestedShop?.merchant_id,
      nestedMerchant?._id,
      nestedMerchant?.id,
    ) || ''
  );
};

export const resolveShopIdFromQrPayload = (
  payload?: Record<string, unknown> | null,
  options?: { allowGenericId?: boolean; allowMerchantIdFallback?: boolean },
): string => {
  if (!payload) {
    return '';
  }
  const nestedShop =
    payload.shop && typeof payload.shop === 'object' && !Array.isArray(payload.shop)
      ? (payload.shop as Record<string, unknown>)
      : null;
  const nestedStore =
    payload.store && typeof payload.store === 'object' && !Array.isArray(payload.store)
      ? (payload.store as Record<string, unknown>)
      : null;
  // Prefer real shop/store ids. merchantId is last-resort only when opted in —
  // many store QRs encode merchantId as the only navigable id.
  const explicit =
    pickObjectId(
      payload.shopId,
      payload.shop_id,
      payload.storeId,
      payload.store_id,
      nestedShop?._id,
      nestedShop?.id,
      nestedStore?._id,
      nestedStore?.id,
    ) || '';
  if (explicit) {
    return explicit;
  }
  if (options?.allowGenericId) {
    const generic = pickObjectId(payload.id, payload._id) || '';
    if (generic) {
      return generic;
    }
  }
  if (options?.allowMerchantIdFallback) {
    return resolveMerchantIdFromQrPayload(payload);
  }
  return '';
};

export const resolveProductIdFromQrPayload = (
  payload?: Record<string, unknown> | null,
): string => {
  if (!payload) {
    return '';
  }
  return (
    pickObjectId(payload.productId, payload.product_id, payload.id, payload._id) || ''
  );
};

export const buildOfferQrPayload = (offer: OfferQrSource): OfferQrPayload => {
  const offerId = pickObjectId(offer.offerId, offer._id, offer.id) || '';
  const userId = pickObjectId(offer.userId, offer.user_id) || '';
  const merchantId = pickObjectId(offer.merchantId, offer.merchant_id) || '';
  const shopId = pickObjectId(offer.shopId, offer.shop_id);
  const offerType =
    pickString(offer.offerType, offer.offer_type, offer.displayType, offer.display_type) ||
    'offer';
  const discountFromBadge = offer.discountBadge
    ? Number(String(offer.discountBadge).replace(/[^\d.]/g, ''))
    : undefined;

  return {
    type: OFFER_QR_TYPE,
    version: 1,
    userId,
    merchantId,
    offerId,
    offerType,
    shopId,
    title: pickString(offer.title) || 'Untitled Offer',
    description: pickString(offer.description),
    discountPercentage:
      pickNumber(offer.discountPercentage, offer.discount_percentage, discountFromBadge) ??
      undefined,
    discountValue: pickNumber(offer.discountValue, offer.discount_value) ?? null,
    minimumPurchaseAmount: pickNumber(
      offer.minimumPurchaseAmount,
      offer.minimum_purchase_amount,
    ),
    numberOfWinners: pickNumber(offer.numberOfWinners, offer.number_of_winners),
    startDate: pickString(offer.startDate, offer.start_date),
    endDate: pickString(offer.endDate, offer.end_date),
    displayType: pickString(offer.displayType, offer.display_type),
    isActive: offer.isActive ?? offer.is_active ?? true,
    thumbnail: pickString(offer.thumbnail, offer.image),
    shopName: pickString(offer.shopName, offer.shop_name),
  };
};

export const encodeOfferQrValue = (offer: OfferQrSource) =>
  JSON.stringify(buildOfferQrPayload(offer));

/**
 * Builds offer QR JSON with required ids. Explicit `offer` fields win;
 * missing values can be filled from an existing API `qrValue` string.
 */
export const resolveOfferQrValue = (offer: OfferQrSource, existingQr?: string | null) => {
  let fromExisting: OfferQrSource = {};

  if (existingQr?.trim()) {
    try {
      const parsed = JSON.parse(existingQr.trim());
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const record = parsed as Record<string, unknown>;
        fromExisting = {
          userId: pickObjectId(record.userId, record.user_id),
          merchantId: pickObjectId(record.merchantId, record.merchant_id),
          shopId: pickObjectId(record.shopId, record.shop_id),
          offerId: pickObjectId(record.offerId, record.offer_id, record._id, record.id),
          offerType: pickString(record.offerType, record.offer_type),
          displayType: pickString(record.displayType, record.display_type),
          title: pickString(record.title),
          description: pickString(record.description),
          discountPercentage: pickNumber(record.discountPercentage, record.discount_percentage),
          discountValue: pickNumber(record.discountValue, record.discount_value) ?? null,
          minimumPurchaseAmount: pickNumber(
            record.minimumPurchaseAmount,
            record.minimum_purchase_amount,
          ),
          numberOfWinners: pickNumber(record.numberOfWinners, record.number_of_winners),
          startDate: pickString(record.startDate, record.start_date),
          endDate: pickString(record.endDate, record.end_date),
          thumbnail: pickString(record.thumbnail, record.image),
          shopName: pickString(record.shopName, record.shop_name),
          isActive:
            typeof record.isActive === 'boolean'
              ? record.isActive
              : typeof record.is_active === 'boolean'
                ? record.is_active
                : undefined,
        };
      }
    } catch {
      // Existing value is not JSON — rebuild from structured offer fields.
    }
  }

  const encoded = encodeOfferQrValue({
    ...fromExisting,
    userId: offer.userId || offer.user_id || fromExisting.userId,
    merchantId: offer.merchantId || offer.merchant_id || fromExisting.merchantId,
    shopId: offer.shopId || offer.shop_id || fromExisting.shopId,
    offerId: offer.offerId || offer._id || offer.id || fromExisting.offerId,
    offerType: offer.offerType || offer.offer_type || fromExisting.offerType,
    displayType: offer.displayType || offer.display_type || fromExisting.displayType,
    title: offer.title || fromExisting.title,
    description: offer.description || fromExisting.description,
    discountPercentage:
      offer.discountPercentage ?? offer.discount_percentage ?? fromExisting.discountPercentage,
    discountValue:
      offer.discountValue ?? offer.discount_value ?? fromExisting.discountValue ?? null,
    discountBadge: offer.discountBadge,
    minimumPurchaseAmount:
      offer.minimumPurchaseAmount ??
      offer.minimum_purchase_amount ??
      fromExisting.minimumPurchaseAmount,
    numberOfWinners:
      offer.numberOfWinners ?? offer.number_of_winners ?? fromExisting.numberOfWinners,
    startDate: offer.startDate || offer.start_date || fromExisting.startDate,
    endDate: offer.endDate || offer.end_date || fromExisting.endDate,
    thumbnail: offer.thumbnail || offer.image || fromExisting.thumbnail,
    shopName: offer.shopName || offer.shop_name || fromExisting.shopName,
    isActive: offer.isActive ?? offer.is_active ?? fromExisting.isActive ?? true,
  });

  try {
    logApiEvent('QR encode offer', {
      payload: JSON.parse(encoded),
      raw: encoded,
    });
  } catch {
    logApiEvent('QR encode offer', { raw: encoded });
  }

  return encoded;
};

export const buildUserQrPayload = (user: UserQrSource): UserQrPayload => ({
  type: USER_QR_TYPE,
  version: 1,
  userId: pickObjectId(user.userId, user.id, user._id) || '',
  name: pickString(user.name),
  userName: pickString(user.name),
  phone: pickString(user.phone),
  email: pickString(user.email),
  city: pickString(user.city),
});

export const encodeUserQrValue = (user: UserQrSource) => {
  const payload = buildUserQrPayload(user);
  const encoded = JSON.stringify(payload);
  logApiEvent('QR encode user', {
    payload,
    raw: encoded,
  });
  return encoded;
};

const asDisplayValue = (value: unknown) => {
  if (value == null || value === '') {
    return '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
};

const buildFieldsFromRecord = (record: Record<string, any>, skipKeys: string[] = []) =>
  Object.entries(record)
    .filter(([key, value]) => !skipKeys.includes(key) && value != null && value !== '')
    .map(([key, value]) => ({
      label: key
        .replace(/_/g, ' ')
        .replace(/([A-Z])/g, ' $1')
        .replace(/^./, char => char.toUpperCase())
        .trim(),
      value: asDisplayValue(value),
    }));

export const parseQrCodeValue = (raw: string): ParsedQrData => {
  const trimmed = raw.trim();
  if (!trimmed) {
    return {
      raw: trimmed,
      kind: 'unknown',
      title: 'Empty QR code',
      fields: [],
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid QR payload');
    }

    const payload = parsed as Record<string, any>;
    const type = String(payload.type || '').toLowerCase();

    if (type === OFFER_QR_TYPE) {
      return {
        raw: trimmed,
        kind: 'offer',
        title: payload.title || 'Offer details',
        subtitle: payload.offerId ? `Offer ID: ${payload.offerId}` : undefined,
        payload,
        fields: [
          { label: 'User ID', value: asDisplayValue(payload.userId ?? payload.user_id) },
          {
            label: 'Merchant ID',
            value: asDisplayValue(payload.merchantId ?? payload.merchant_id),
          },
          { label: 'Offer ID', value: asDisplayValue(payload.offerId ?? payload.offer_id) },
          {
            label: 'Offer Type',
            value: asDisplayValue(payload.offerType ?? payload.offer_type),
          },
          { label: 'Shop ID', value: asDisplayValue(payload.shopId ?? payload.shop_id) },
          { label: 'Title', value: asDisplayValue(payload.title) },
          { label: 'Description', value: asDisplayValue(payload.description) },
          {
            label: 'Discount',
            value:
              payload.discountPercentage != null ? `${payload.discountPercentage}%` : '—',
          },
          {
            label: 'Min Purchase',
            value:
              payload.minimumPurchaseAmount != null
                ? `₹${payload.minimumPurchaseAmount}`
                : '—',
          },
          { label: 'Winners', value: asDisplayValue(payload.numberOfWinners) },
          { label: 'Start Date', value: asDisplayValue(payload.startDate) },
          { label: 'End Date', value: asDisplayValue(payload.endDate) },
          { label: 'Shop Name', value: asDisplayValue(payload.shopName) },
          { label: 'Status', value: payload.isActive ? 'Active' : 'Inactive' },
        ].filter(field => field.value !== '—'),
      };
    }

    if (type === USER_QR_TYPE) {
      return {
        raw: trimmed,
        kind: 'user',
        title: payload.name || payload.userName || 'User profile',
        subtitle: payload.userId ? `User ID: ${payload.userId}` : undefined,
        payload,
        fields: [
          { label: 'User ID', value: asDisplayValue(payload.userId) },
          ...buildFieldsFromRecord(payload, ['type', 'version', 'userId']),
        ].filter(field => field.value !== '—'),
      };
    }

    if (isStoreQrType(type)) {
      const shopId = resolveShopIdFromQrPayload(payload, { allowGenericId: true });
      const merchantId = resolveMerchantIdFromQrPayload(payload);
      const storeName =
        pickString(payload.shopName, payload.storeName, payload.name, payload.title) ||
        'Store details';
      const city = pickString(payload.city);
      return {
        raw: trimmed,
        kind: 'store',
        title: storeName,
        subtitle: shopId
          ? `Store ID: ${shopId}`
          : merchantId
            ? `Merchant ID: ${merchantId}`
            : undefined,
        payload,
        fields: [
          { label: 'Shop ID', value: asDisplayValue(shopId) },
          { label: 'Merchant ID', value: asDisplayValue(merchantId) },
          { label: 'Store Name', value: asDisplayValue(storeName) },
          { label: 'City', value: asDisplayValue(city) },
          ...buildFieldsFromRecord(payload, [
            'type',
            'version',
            'shopId',
            'shop_id',
            'storeId',
            'store_id',
            'merchantId',
            'merchant_id',
            'name',
            'shopName',
            'storeName',
            'title',
            'city',
            'id',
            '_id',
          ]),
        ].filter(field => field.value !== '—'),
      };
    }

    if (isProductQrType(type)) {
      const productId = resolveProductIdFromQrPayload(payload);
      const shopId = resolveShopIdFromQrPayload(payload);
      const productTitle =
        pickString(payload.title, payload.name, payload.productName) || 'Product details';
      return {
        raw: trimmed,
        kind: 'product',
        title: productTitle,
        subtitle: productId ? `Product ID: ${productId}` : undefined,
        payload,
        fields: [
          { label: 'Product ID', value: asDisplayValue(productId) },
          { label: 'Shop ID', value: asDisplayValue(shopId) },
          { label: 'Title', value: asDisplayValue(productTitle) },
          ...buildFieldsFromRecord(payload, [
            'type',
            'version',
            'productId',
            'product_id',
            'shopId',
            'shop_id',
            'storeId',
            'store_id',
            'title',
            'name',
            'productName',
            'id',
            '_id',
          ]),
        ].filter(field => field.value !== '—'),
      };
    }

    // Legacy calendar QR payloads without type.
    if (payload.offerId || payload.offer_id) {
      return {
        raw: trimmed,
        kind: 'offer',
        title: payload.title || 'Offer details',
        subtitle: payload.offerId || payload.offer_id
          ? `Offer ID: ${payload.offerId || payload.offer_id}`
          : undefined,
        payload,
        fields: buildFieldsFromRecord(payload, ['shop', 'generatedAt']),
      };
    }

    // Legacy product payload without explicit type.
    if (payload.productId || payload.product_id) {
      const productId = resolveProductIdFromQrPayload(payload);
      const shopId = resolveShopIdFromQrPayload(payload);
      const productTitle =
        pickString(payload.title, payload.name, payload.productName) || 'Product details';
      return {
        raw: trimmed,
        kind: 'product',
        title: productTitle,
        subtitle: productId ? `Product ID: ${productId}` : undefined,
        payload,
        fields: buildFieldsFromRecord(payload),
      };
    }

    // Legacy store/shop payload without explicit type.
    if (
      payload.shopId ||
      payload.shop_id ||
      payload.storeId ||
      payload.store_id ||
      // Store QRs sometimes only carry merchantId (+ optional shop name).
      ((payload.merchantId || payload.merchant_id) &&
        (payload.shopName || payload.storeName || payload.shop || payload.store))
    ) {
      const shopId = resolveShopIdFromQrPayload(payload, {
        allowGenericId: true,
        allowMerchantIdFallback: true,
      });
      const storeName =
        pickString(payload.shopName, payload.storeName, payload.name, payload.title) ||
        'Store details';
      return {
        raw: trimmed,
        kind: 'store',
        title: storeName,
        subtitle: shopId ? `Store ID: ${shopId}` : undefined,
        payload,
        fields: buildFieldsFromRecord(payload),
      };
    }

    // Older offer payloads that only carry a title.
    if (payload.title) {
      return {
        raw: trimmed,
        kind: 'offer',
        title: payload.title || 'Offer details',
        subtitle: payload.offerId ? `Offer ID: ${payload.offerId}` : undefined,
        payload,
        fields: buildFieldsFromRecord(payload, ['shop', 'generatedAt']),
      };
    }

    return {
      raw: trimmed,
      kind: 'unknown',
      title: payload.title || payload.name || 'QR data',
      subtitle: type ? `Type: ${type}` : undefined,
      payload,
      fields: buildFieldsFromRecord(payload),
    };
  } catch {
    return {
      raw: trimmed,
      kind: 'unknown',
      title: 'Scanned QR code',
      fields: [{ label: 'Content', value: trimmed }],
    };
  }
};
