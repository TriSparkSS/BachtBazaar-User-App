import {
  WishlistOfferItem,
  WishlistProductItem,
  WishlistShopItem,
  WishlistType,
} from '../types/wishlist';

const asRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

/** Prefer URL/path thumbs; skip huge embedded base64 banners (they blow up list memory). */
const resolveWishlistMedia = (...values: unknown[]): string | undefined => {
  const MAX_EMBEDDED_CHARS = 12_000;

  for (const value of values) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed || trimmed === '[object Object]') {
        continue;
      }
      if (trimmed.startsWith('data:image/') && trimmed.length > MAX_EMBEDDED_CHARS) {
        continue;
      }
      return trimmed;
    }

    const record = asRecord(value);
    if (!record) {
      continue;
    }

    const nestedPath = pickString(record.url, record.uri, record.path, record.secure_url);
    if (nestedPath) {
      return nestedPath;
    }

    if (typeof record.data === 'string') {
      const data = record.data.trim();
      if (!data || data.length > MAX_EMBEDDED_CHARS) {
        continue;
      }
      if (data.startsWith('data:image/')) {
        return data;
      }
      return `data:image/jpeg;base64,${data}`;
    }
  }

  return undefined;
};

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

const pickId = (value: unknown, ...extraKeys: string[]): string | undefined => {
  if (typeof value === 'string' || typeof value === 'number') {
    return pickString(value);
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  const keys = ['_id', 'id', ...extraKeys];
  for (const key of keys) {
    const found = pickString(record[key]);
    if (found) {
      return found;
    }
  }
  return undefined;
};

const typeListKeys = (type: WishlistType): string[] =>
  type === 'offers'
    ? ['offers', 'offer']
    : type === 'shops'
      ? ['shops', 'stores', 'shop', 'store']
      : ['products', 'product'];

const firstTypedArray = (
  record: Record<string, unknown>,
  typeKeys: string[],
): unknown[] | null => {
  for (const key of typeKeys) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
};

const unwrapList = (payload: unknown, type: WishlistType): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (!root) {
    return [];
  }

  const typeKeys = typeListKeys(type);

  // API returns { success, data: { offers, products, shops } } for every typed GET.
  // Always prefer the matching typed array under data first.
  const data = asRecord(root.data);
  if (data) {
    const typedUnderData = firstTypedArray(data, typeKeys);
    if (typedUnderData) {
      return typedUnderData;
    }
  }

  const typedAtRoot = firstTypedArray(root, typeKeys);
  if (typedAtRoot) {
    return typedAtRoot;
  }

  for (const key of ['data', 'wishlist', 'items', 'result', 'results', 'list']) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value;
    }

    const nested = asRecord(value);
    if (nested) {
      const typedNested = firstTypedArray(nested, typeKeys);
      if (typedNested) {
        return typedNested;
      }
      for (const nestedKey of ['wishlist', 'items', 'data', 'list']) {
        const nestedValue = nested[nestedKey];
        if (Array.isArray(nestedValue)) {
          return nestedValue;
        }
      }
    }
  }

  return [];
};

export const parseOfferWishlistResponse = (payload: unknown): WishlistOfferItem[] =>
  unwrapList(payload, 'offers')
    .map(value => {
      const row = asRecord(value);
      if (!row) {
        return null;
      }

      const nestedOffer =
        asRecord(row.offer) ??
        asRecord(row.offerId) ??
        asRecord(row.offerDetails) ??
        asRecord(row.offer_details) ??
        asRecord(row.item);
      const nestedShop =
        asRecord(row.shop) ??
        asRecord(row.shopId) ??
        asRecord(row.shopDetails) ??
        asRecord(row.shop_details) ??
        asRecord(nestedOffer?.shop) ??
        asRecord(nestedOffer?.shopId);

      // Wishlist payloads are full offer docs (`_id`), not `{ offerId }` wrappers.
      const offerId =
        pickId(row.offerId, 'offerId', 'offer_id') ??
        pickId(nestedOffer, 'offerId', 'offer_id') ??
        pickId(row.offer) ??
        pickString(row.offer_id) ??
        pickString(row._id, row.id);
      const id = pickString(row._id, row.id) || offerId;
      if (!id || !offerId) {
        return null;
      }

      return {
        id,
        offerId,
        shopId:
          pickId(row.shopId, 'shopId', 'shop_id') ??
          pickId(nestedShop) ??
          pickId(nestedOffer?.shopId) ??
          pickId(row.merchant_id) ??
          pickId(row.merchantId) ??
          pickString(row.shop_id),
        title:
          pickString(
            row.title,
            row.name,
            nestedOffer?.title,
            nestedOffer?.name,
            nestedOffer?.offerTitle,
            nestedOffer?.offer_title,
          ) || 'Saved offer',
        subtitle: pickString(
          row.subtitle,
          nestedOffer?.subtitle,
          nestedOffer?.shortDescription,
          nestedOffer?.short_description,
        ),
        discount: (() => {
          const label = pickString(
            row.discount,
            row.discountLabel,
            row.discount_label,
            row.discountBadge,
            nestedOffer?.discount,
            nestedOffer?.discountLabel,
            nestedOffer?.discount_label,
            nestedOffer?.badge,
            nestedOffer?.discountBadge,
          );
          if (label) {
            return label;
          }
          const pct = row.discount_percentage ?? nestedOffer?.discount_percentage;
          if (typeof pct === 'number' && Number.isFinite(pct)) {
            return `${pct}% off`;
          }
          const amount = row.discount_value ?? nestedOffer?.discount_value;
          if (typeof amount === 'number' && Number.isFinite(amount)) {
            return `₹${amount} off`;
          }
          return undefined;
        })(),
        image: pickString(
          row.image,
          row.thumbnail,
          row.imageUrl,
          row.image_url,
          nestedOffer?.image,
          nestedOffer?.thumbnail,
          nestedOffer?.imageUrl,
          nestedOffer?.image_url,
        ),
        shopName: pickString(
          row.shopName,
          row.shop_name,
          nestedShop?.shopName,
          nestedShop?.shop_name,
          nestedShop?.name,
          nestedOffer?.storeName,
        ),
        expiresAt: pickString(
          row.expiresAt,
          row.expires_at,
          row.endDate,
          row.end_date,
          nestedOffer?.expiresAt,
          nestedOffer?.expires_at,
          nestedOffer?.endDate,
          nestedOffer?.end_date,
        ),
        description: pickString(row.description, nestedOffer?.description, nestedOffer?.details),
        minimumPurchaseAmount:
          typeof row.minimumPurchaseAmount === 'number'
            ? row.minimumPurchaseAmount
            : typeof row.minimum_purchase_amount === 'number'
              ? row.minimum_purchase_amount
              : typeof nestedOffer?.minimumPurchaseAmount === 'number'
                ? nestedOffer.minimumPurchaseAmount
                : typeof nestedOffer?.minimum_purchase_amount === 'number'
                  ? nestedOffer.minimum_purchase_amount
                  : undefined,
        createdAt: pickString(row.createdAt, row.created_at, row.addedAt, row.added_at),
      } satisfies WishlistOfferItem;
    })
    .filter((item): item is WishlistOfferItem => Boolean(item));

export const parseShopWishlistResponse = (payload: unknown): WishlistShopItem[] =>
  unwrapList(payload, 'shops')
    .map(value => {
      const row = asRecord(value);
      if (!row) {
        return null;
      }

      const nestedShop =
        asRecord(row.shop) ??
        asRecord(row.shopId) ??
        asRecord(row.shopDetails) ??
        asRecord(row.shop_details) ??
        asRecord(row.store) ??
        asRecord(row.item);

      // Shop docs use `_id` as the shop id (no separate shopId field).
      const shopId =
        pickId(row.shopId, 'shopId', 'shop_id') ??
        pickId(nestedShop) ??
        pickId(row.shop) ??
        pickString(row.shop_id) ??
        pickString(row._id, row.id);
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
            row.storeName,
            row.businessName,
          ) || 'Saved store',
        address: pickString(row.address, row.address1, nestedShop?.address, nestedShop?.address1),
        logo: resolveWishlistMedia(
          row.logo,
          row.image,
          row.thumbnail,
          nestedShop?.logo,
          nestedShop?.image,
          nestedShop?.thumbnail,
          // banner last — often a huge base64 blob; skipped when too large
          row.banner,
          nestedShop?.banner,
        ),
        city: pickString(row.city, nestedShop?.city),
        phone: pickString(row.phone, nestedShop?.phone),
        isVerified: Boolean(row.isVerified ?? row.is_verified ?? nestedShop?.isVerified),
        createdAt: pickString(row.createdAt, row.created_at, row.addedAt, row.added_at),
      } satisfies WishlistShopItem;
    })
    .filter((item): item is WishlistShopItem => Boolean(item));

export const parseProductWishlistResponse = (payload: unknown): WishlistProductItem[] =>
  unwrapList(payload, 'products')
    .map(value => {
      const row = asRecord(value);
      if (!row) {
        return null;
      }

      const nestedProduct =
        asRecord(row.product) ??
        asRecord(row.productId) ??
        asRecord(row.productDetails) ??
        asRecord(row.product_details) ??
        asRecord(row.item);
      const nestedShop =
        asRecord(row.shop) ??
        asRecord(row.shopId) ??
        asRecord(row.shopDetails) ??
        asRecord(nestedProduct?.shop);

      // Product docs use `_id` as the product id (no separate productId field).
      const productId =
        pickId(row.productId, 'productId', 'product_id') ??
        pickId(nestedProduct) ??
        pickId(row.product) ??
        pickString(row.product_id) ??
        pickString(row._id, row.id);
      const id = pickString(row._id, row.id) || productId;
      if (!id || !productId) {
        return null;
      }

      return {
        id,
        productId,
        shopId:
          pickId(row.shopId, 'shopId', 'shop_id') ??
          pickId(nestedShop) ??
          pickId(nestedProduct?.shopId) ??
          pickId(row.merchant_id) ??
          pickId(row.merchantId) ??
          pickString(row.shop_id),
        title:
          pickString(
            row.title,
            row.name,
            nestedProduct?.title,
            nestedProduct?.name,
            nestedProduct?.productTitle,
          ) || 'Saved product',
        subtitle: pickString(
          row.subtitle,
          nestedProduct?.subtitle,
          nestedProduct?.description,
          row.description,
        ),
        price: pickString(row.discounted_price, row.price, nestedProduct?.discounted_price, nestedProduct?.price),
        originalPrice: pickString(
          row.originalPrice,
          row.original_price,
          row.price,
          nestedProduct?.originalPrice,
          nestedProduct?.original_price,
          nestedProduct?.price,
        ),
        image: pickString(
          row.image,
          row.thumbnail,
          nestedProduct?.image,
          nestedProduct?.thumbnail,
        ),
        shopName: pickString(
          row.shopName,
          row.shop_name,
          nestedShop?.shopName,
          nestedShop?.shop_name,
          nestedShop?.name,
        ),
        category: pickString(row.category, nestedProduct?.category),
        brand: pickString(row.brand, nestedProduct?.brand),
        createdAt: pickString(row.createdAt, row.created_at, row.addedAt, row.added_at),
      } satisfies WishlistProductItem;
    })
    .filter((item): item is WishlistProductItem => Boolean(item));

export const extractWishlistMessage = (payload: unknown, fallback: string) => {
  const root = asRecord(payload);
  return pickString(root?.message, root?.msg) || fallback;
};
