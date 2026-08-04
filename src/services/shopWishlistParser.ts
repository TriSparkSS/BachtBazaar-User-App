import { WishlistShopItem } from '../types/wishlist';
import { resolveShopMediaFromApiValue } from './shopResponseParser';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed && trimmed !== '[object Object]') {
        return trimmed;
      }
    }
  }
  return undefined;
};

const pickId = (value: unknown): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return pickString(value);
  }
  const record = asRecord(value);
  return pickString(record?._id, record?.id, record?.shopId, record?.shop_id);
};

const unwrapList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  for (const key of ['data', 'wishlist', 'items', 'shops', 'stores', 'result', 'results']) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value;
    }

    const nested = asRecord(value);
    if (nested) {
      for (const nestedKey of ['wishlist', 'items', 'shops', 'stores', 'data', 'list']) {
        const nestedValue = nested[nestedKey];
        if (Array.isArray(nestedValue)) {
          return nestedValue;
        }
      }
    }
  }

  return [];
};

const parseShopWishlistItem = (value: unknown): WishlistShopItem | null => {
  const row = asRecord(value);
  if (!row) {
    return null;
  }

  const nestedShop =
    asRecord(row.shop) ??
    asRecord(row.shopId) ??
    asRecord(row.shopDetails) ??
    asRecord(row.shop_details) ??
    asRecord(row.store);

  const shopId =
    pickId(row.shopId) ??
    pickId(nestedShop) ??
    pickId(row.shop) ??
    pickString(row.shop_id);
  const id = pickString(row._id, row.id) || shopId;

  if (!id || !shopId) {
    return null;
  }

  return {
    id,
    shopId,
    name:
      pickString(
        row.name,
        row.shopName,
        row.shop_name,
        nestedShop?.shopName,
        nestedShop?.shop_name,
        nestedShop?.name,
      ) || 'Saved store',
    address: pickString(
      row.address,
      row.address1,
      nestedShop?.address,
      nestedShop?.address1,
    ),
    logo:
      resolveShopMediaFromApiValue(row.logo) ??
      resolveShopMediaFromApiValue(nestedShop?.logo) ??
      pickString(row.image, row.thumbnail, nestedShop?.image),
    city: pickString(row.city, nestedShop?.city),
    phone: pickString(row.phone, nestedShop?.phone),
    isVerified: Boolean(row.isVerified ?? row.is_verified ?? nestedShop?.isVerified),
    createdAt: pickString(row.createdAt, row.created_at, row.addedAt, row.added_at),
  };
};

export const parseShopWishlistResponse = (payload: unknown): WishlistShopItem[] =>
  unwrapList(payload)
    .map(parseShopWishlistItem)
    .filter((item): item is WishlistShopItem => Boolean(item));

export const extractShopWishlistMessage = (payload: unknown, fallback: string) => {
  const root = asRecord(payload);
  return pickString(root?.message, root?.msg) || fallback;
};
