import {
  Shop,
  ShopOffer,
  ShopOpeningDay,
  ShopOpeningHours,
  ShopProduct,
  ShopWithOffers,
} from '../types/shop';
import { shouldShowInOffersList } from '../utils/offerDisplayType';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

/**
 * /shop/:id/logo and /banner are not real media endpoints (SPA HTML).
 * Shop logo/banner arrive as Mongo Buffer JSON — convert only when small enough
 * so list/detail images load without freezing the JS thread on multi-MB banners.
 */
const MAX_SHOP_MEDIA_BYTES = 250_000;

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value;
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }
  }

  return undefined;
};

const pickNumberString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
};

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }

    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
};

const resolveImagePath = (value: unknown): string | undefined => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim();
  }

  return undefined;
};

const bytesToBase64 = (bytes: number[]): string => {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';

  for (let index = 0; index < bytes.length; index += 3) {
    const byte1 = bytes[index];
    const byte2 = bytes[index + 1];
    const byte3 = bytes[index + 2];

    output += alphabet[byte1 >> 2];
    output += alphabet[((byte1 & 0x03) << 4) | (byte2 >> 4)];
    output += Number.isFinite(byte2) ? alphabet[((byte2 & 0x0f) << 2) | (byte3 >> 6)] : '=';
    output += Number.isFinite(byte3) ? alphabet[byte3 & 0x3f] : '=';
  }

  return output;
};

const extractBufferBytes = (
  data: unknown,
  maxBytes: number,
): number[] | undefined => {
  if (!isRecord(data) || data.type !== 'Buffer' || !Array.isArray(data.data)) {
    return undefined;
  }

  // Bail before filtering/encoding — huge arrays freeze RN.
  if (data.data.length > maxBytes) {
    return undefined;
  }

  const bytes = data.data.filter(
    (byte): byte is number => typeof byte === 'number' && byte >= 0 && byte <= 255,
  );

  return bytes.length ? bytes : undefined;
};

const resolveBase64ImageData = (
  value: unknown,
  maxBytes = MAX_SHOP_MEDIA_BYTES,
): string | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  // Nested: { data: { type: 'Buffer', data: [...] }, contentType }
  const nestedBytes = extractBufferBytes(value.data, maxBytes);
  const topLevelBytes =
    value.type === 'Buffer' && Array.isArray(value.data)
      ? extractBufferBytes(value, maxBytes)
      : undefined;
  const bytes = nestedBytes ?? topLevelBytes;

  if (bytes?.length) {
    const contentType = pickString(value.contentType, value.content_type) ?? 'image/jpeg';
    return `data:${contentType};base64,${bytesToBase64(bytes)}`;
  }

  if (typeof value.data === 'string' && value.data.trim()) {
    const raw = value.data.trim();
    // Base64 is ~4/3 of binary; reject oversized strings the same way.
    if (raw.length > Math.floor(maxBytes * 1.4)) {
      return undefined;
    }
    if (raw.startsWith('data:image/')) {
      return raw;
    }
    const contentType = pickString(value.contentType, value.content_type) ?? 'image/jpeg';
    return `data:${contentType};base64,${raw}`;
  }

  return undefined;
};

/**
 * Resolve shop media to a usable image URI (path, URL, or size-capped data-URI).
 * Does not use /shop/:id/logo|/banner — those routes serve SPA HTML, not images.
 */
const resolveShopMediaField = (
  value: unknown,
  maxBytes = MAX_SHOP_MEDIA_BYTES,
): string | undefined => {
  const directPath = resolveImagePath(value);
  if (directPath) {
    // Skip huge pre-baked data URIs in list payloads.
    if (directPath.startsWith('data:image/') && directPath.length > Math.floor(maxBytes * 1.4)) {
      return undefined;
    }
    return directPath;
  }

  if (isRecord(value)) {
    const nestedPath = pickString(value.url, value.uri, value.path, value.secure_url);
    if (nestedPath) {
      return nestedPath;
    }

    return resolveBase64ImageData(value, maxBytes);
  }

  return undefined;
};

export const resolveShopMediaFromApiValue = resolveShopMediaField;

const normalizeOpeningDay = (value: unknown): ShopOpeningDay | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    open: pickString(value.open),
    close: pickString(value.close),
    isClosed: Boolean(value.isClosed ?? value.is_closed),
  };
};

const normalizeOpeningHours = (value: unknown): ShopOpeningHours | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  return {
    monday: normalizeOpeningDay(value.monday),
    tuesday: normalizeOpeningDay(value.tuesday),
    wednesday: normalizeOpeningDay(value.wednesday),
    thursday: normalizeOpeningDay(value.thursday),
    friday: normalizeOpeningDay(value.friday),
    saturday: normalizeOpeningDay(value.saturday),
    sunday: normalizeOpeningDay(value.sunday),
  };
};

const buildOfferDiscount = (value: Record<string, unknown>): string | undefined => {
  const offerType = isRecord(value.offer_type_id)
    ? pickString(value.offer_type_id.value, value.offer_type_id.label)?.toLowerCase()
    : undefined;
  const discountValue = pickNumber(value.discount_value);
  const discountPercentage = pickNumber(value.discount_percentage);

  if (discountValue && discountValue > 0) {
    return `₹${discountValue} OFF`;
  }

  if (discountPercentage && discountPercentage > 0) {
    if (offerType?.includes('flat') || offerType?.includes('rupee')) {
      return `₹${discountPercentage} OFF`;
    }

    return `${discountPercentage}% OFF`;
  }

  if (isRecord(value.offer_type_id)) {
    return pickString(value.offer_type_id.label);
  }

  return pickString(value.discount, value.discountLabel, value.discount_label, value.badge, value.tag);
};

const normalizeShop = (value: unknown): Shop | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.shopId, value.shop_id);
  // API often uses shopName only (no `name`). Never reject the whole shop for that.
  const name =
    pickString(value.name, value.shopName, value.shop_name, value.title, value.storeName) ||
    undefined;

  if (!id) {
    return undefined;
  }

  const merchant = isRecord(value.merchantId)
    ? value.merchantId
    : isRecord(value.merchant)
      ? value.merchant
      : undefined;
  const merchantId = pickString(
    isRecord(value.merchantId) ? value.merchantId._id ?? value.merchantId.id : value.merchantId,
    isRecord(value.merchant) ? value.merchant._id ?? value.merchant.id : value.merchant,
    value.merchant_id,
  );
  const openingHours = normalizeOpeningHours(value.openingHours ?? value.opening_hours);
  const address = pickString(value.address);
  const address1 = pickString(value.address1, value.address_1);
  const city = pickString(value.city);

  const logoPath = resolveShopMediaField(value.logo);
  const coverPath = resolveShopMediaField(
    value.banner ?? value.coverImage ?? value.cover_image,
  );

  return {
    id,
    name: name || pickString(merchant?.name) || 'Store',
    logo: logoPath,
    coverImage: coverPath,
    tagline: pickString(value.tagline, value.description, value.about, merchant?.name),
    address,
    address1,
    city,
    phone: pickString(value.phone, merchant?.phone),
    email: pickString(value.email, merchant?.email),
    rating: pickNumberString(value.rating, value.avgRating, value.avg_rating),
    ratingCount: pickNumberString(
      value.ratingCount,
      value.rating_count,
      value.reviewCount,
      value.review_count,
      value.totalReviews,
      value.total_reviews,
    ),
    distance: pickString(value.distance, value.distanceKm, value.distance_km, value.km),
    isOpen:
      value.isOpen !== undefined
        ? Boolean(value.isOpen)
        : value.is_open !== undefined
          ? Boolean(value.is_open)
          : undefined,
    isVerified: Boolean(
      value.isVerified ??
        value.is_verified ??
        value.verified ??
        (merchant?.status === 'verified'),
    ),
    categories: Array.isArray(value.categories)
      ? value.categories.map(item => String(item).trim()).filter(Boolean)
      : isRecord(value.categoryId)
        ? [pickString(value.categoryId.label, value.categoryId.name, value.categoryId.value)].filter(
            Boolean,
          ) as string[]
        : Array.isArray(value.tags)
          ? value.tags.map(item => String(item).trim()).filter(Boolean)
          : undefined,
    categoryIds: isRecord(value.categoryId)
      ? ([pickString(value.categoryId._id, value.categoryId.id)].filter(Boolean) as string[])
      : Array.isArray(value.categoryIds)
        ? value.categoryIds.map(item => String(item).trim()).filter(Boolean)
        : undefined,
    openingHours,
    merchantId,
    merchantName: pickString(merchant?.name),
  };
};

const normalizeOffer = (value: unknown, shopId: string): ShopOffer | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  // Exclude banner/calendar display types — same split as Offer Detail surfaces.
  if (!shouldShowInOffersList(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.offerId, value.offer_id);
  const title = pickString(value.title, value.name, value.offerTitle, value.offer_title);

  if (!id || !title) {
    return undefined;
  }

  const minimumPurchaseAmount = pickNumber(value.minimum_purchase_amount, value.minimumPurchaseAmount);
  const offerType = isRecord(value.offer_type_id)
    ? pickString(value.offer_type_id.label, value.offer_type_id.value)
    : undefined;

  return {
    id,
    shopId: pickString(value.shopId, value.shop_id) ?? shopId,
    title,
    subtitle:
      minimumPurchaseAmount && minimumPurchaseAmount > 0
        ? `Min purchase ₹${minimumPurchaseAmount.toLocaleString('en-IN')}`
        : pickString(value.subtitle, value.shortDescription, value.short_description),
    discount: buildOfferDiscount(value),
    image: resolveImagePath(
      pickString(
        value.thumbnail,
        value.image,
        value.imageUrl,
        value.image_url,
        value.offerImage,
        value.offer_image,
        value.photo,
      ),
    ),
    countdown: pickString(value.countdown, value.remaining, value.timeRemaining, value.time_remaining),
    expiresAt: pickString(value.expiresAt, value.expires_at, value.endDate, value.end_date),
    description: pickString(
      value.description,
      value.offerDescription,
      value.offer_description,
      value.details,
      value.longDescription,
      value.long_description,
    ),
    minimumPurchaseAmount,
    offerType,
  };
};

const normalizeProduct = (value: unknown, shopId: string): ShopProduct | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.productId, value.product_id);
  const title = pickString(value.name, value.title, value.productName, value.product_name);

  if (!id || !title) {
    return undefined;
  }

  const price = pickNumber(value.price);
  const discountedPrice = pickNumber(value.discounted_price, value.discountedPrice);

  return {
    id,
    shopId,
    title,
    category: pickString(value.category, value.productCategory, value.product_category),
    metalType: pickString(value.metalType, value.metal_type),
    brand: pickString(value.brand, value.brandName, value.brand_name),
    description: pickString(
      value.description,
      value.details,
      value.about,
      value.productDescription,
      value.product_description,
    ),
    image: resolveImagePath(
      pickString(value.thumbnail, value.image, value.imageUrl, value.image_url, value.photo),
    ),
    price: discountedPrice != null ? `₹${discountedPrice.toLocaleString('en-IN')}` : price != null ? `₹${price.toLocaleString('en-IN')}` : undefined,
    originalPrice:
      discountedPrice != null && price != null ? `₹${price.toLocaleString('en-IN')}` : undefined,
    rating: pickNumberString(value.rating, value.avgRating, value.avg_rating),
    stock: pickNumber(value.stock),
    isFeatured: Boolean(value.is_featured ?? value.isFeatured),
  };
};

const unwrapList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ['data', 'shops', 'result', 'items', 'offers', 'response']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }

    if (isRecord(value)) {
      for (const nestedKey of ['shops', 'items', 'offers', 'products', 'data', 'list']) {
        const nested = value[nestedKey];
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  return [];
};

export const parseShopsResponse = (payload: unknown): Shop[] =>
  unwrapList(payload)
    .map(item => normalizeShop(item))
    .filter((shop): shop is Shop => Boolean(shop));

const extractShopOffers = (record: Record<string, unknown>, shopId: string): ShopOffer[] => {
  for (const key of ['offers', 'shopOffers', 'shop_offers', 'activeOffers', 'active_offers']) {
    const value = record[key];
    if (Array.isArray(value)) {
      return value
        .map(item => normalizeOffer(item, shopId))
        .filter((offer): offer is ShopOffer => Boolean(offer));
    }
  }

  return [];
};

export const parseShopsWithOffersResponse = (payload: unknown): ShopWithOffers[] =>
  unwrapList(payload)
    .map(item => {
      if (!isRecord(item)) {
        return undefined;
      }

      const shop = normalizeShop(item);
      if (!shop) {
        return undefined;
      }

      const shopId = shop.id;
      const offers = extractShopOffers(item, shopId);
      const offerImage = offers.find(offer => offer.image)?.image;
      // Keep normalizeShop logo (Buffer→data-URI / path). Do not wipe with undefined.
      const listLogo = resolveShopMediaField(item.logo) ?? shop.logo;

      const normalizedShop: ShopWithOffers = {
        ...shop,
        logo: listLogo,
        coverImage: shop.coverImage || offerImage,
        offers,
        // Use filtered length so banner/calendar offers are not counted in Local Offers.
        offerCount: offers.length,
      };

      return normalizedShop;
    })
    .filter((shop): shop is ShopWithOffers => Boolean(shop));

export const parseShopOffersResponse = (payload: unknown, shopId: string): ShopOffer[] =>
  unwrapList(payload)
    .map(item => normalizeOffer(item, shopId))
    .filter((offer): offer is ShopOffer => Boolean(offer));

const extractInventory = (data: Record<string, unknown>) => {
  const inventory = isRecord(data.inventory) ? data.inventory : undefined;

  return {
    productCount: pickNumber(inventory?.productCount, inventory?.product_count),
    offerCount: pickNumber(inventory?.offerCount, inventory?.offer_count),
    serviceCount: pickNumber(inventory?.serviceCount, inventory?.service_count),
    products: Array.isArray(inventory?.products)
      ? inventory.products
          .map(item => normalizeProduct(item, ''))
          .filter((product): product is ShopProduct => Boolean(product))
      : [],
    offers: Array.isArray(inventory?.offers)
      ? inventory.offers
          .map(item => normalizeOffer(item, ''))
          .filter((offer): offer is ShopOffer => Boolean(offer))
      : [],
  };
};

export const parseShopDetailResponse = (payload: unknown, fallbackShopId?: string): ShopWithOffers | null => {
  if (!isRecord(payload)) {
    return null;
  }

  const data = isRecord(payload.data) ? payload.data : payload;
  const shopRecord = isRecord(data.shop) ? data.shop : data;
  const shop = normalizeShop(shopRecord);

  const shopId = (shop?.id || fallbackShopId || '').trim();
  if (!shopId) {
    return null;
  }

  // Soft-fallback if normalize somehow failed but we still have an id from the route/API.
  const resolvedShop: Shop =
    shop ??
    ({
      id: shopId,
      name:
        pickString(
          isRecord(shopRecord) ? shopRecord.shopName : undefined,
          isRecord(shopRecord) ? shopRecord.shop_name : undefined,
          isRecord(shopRecord) ? shopRecord.name : undefined,
          isRecord(shopRecord) ? shopRecord.title : undefined,
        ) || 'Store',
    } as Shop);

  const logoFromField = resolveShopMediaField(
    isRecord(shopRecord) ? shopRecord.logo : undefined,
  );
  const coverFromField = resolveShopMediaField(
    isRecord(shopRecord)
      ? shopRecord.banner ?? shopRecord.coverImage ?? shopRecord.cover_image
      : undefined,
  );

  // Prefer string paths or size-capped data-URIs from Buffer fields.
  // Do not use /shop/:id/logo|/banner — those return SPA HTML, not images.
  const logo = logoFromField ?? resolvedShop.logo;
  const coverImageFromBanner = coverFromField ?? resolvedShop.coverImage;

  const inventory = extractInventory(data);
  let offers = inventory.offers.map(offer => ({ ...offer, shopId }));
  let products = inventory.products.map(product => ({ ...product, shopId }));

  if (!offers.length && isRecord(shopRecord)) {
    for (const key of ['offers', 'shopOffers', 'shop_offers']) {
      const value = shopRecord[key];
      if (Array.isArray(value)) {
        offers = value
          .map(item => normalizeOffer(item, shopId))
          .filter((offer): offer is ShopOffer => Boolean(offer));
        break;
      }
    }
  }

  if (!offers.length) {
    offers = parseShopOffersResponse(payload, shopId);
  }

  const coverImage =
    coverImageFromBanner ||
    products.find(product => product.image)?.image ||
    offers.find(offer => offer.image)?.image;

  return {
    ...resolvedShop,
    id: shopId,
    logo,
    coverImage,
    offers,
    products,
    productCount: inventory.productCount ?? products.length,
    // Use filtered length so banner/calendar offers are not counted on store detail.
    offerCount: offers.length,
    serviceCount: inventory.serviceCount ?? 0,
  };
};
