import {
  Shop,
  ShopOffer,
  ShopOpeningDay,
  ShopOpeningHours,
  ShopProduct,
  ShopWithOffers,
} from '../types/shop';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

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
  const name = pickString(value.name, value.shopName, value.shop_name, value.title);

  if (!id || !name) {
    return undefined;
  }

  const merchant = isRecord(value.merchantId) ? value.merchantId : undefined;
  const openingHours = normalizeOpeningHours(value.openingHours ?? value.opening_hours);
  const address = pickString(value.address);
  const address1 = pickString(value.address1, value.address_1);

  return {
    id,
    name,
    logo: resolveImagePath(
      pickString(
        value.logo,
        value.image,
        value.shopImage,
        value.shop_image,
        value.profileImage,
        value.profile_image,
        value.avatar,
        value.photo,
        value.thumbnail,
      ),
    ),
    coverImage: resolveImagePath(
      pickString(
        value.coverImage,
        value.cover_image,
        value.bannerImage,
        value.banner_image,
        value.heroImage,
        value.hero_image,
      ),
    ),
    tagline: pickString(value.tagline, value.about, merchant?.name),
    address,
    address1,
    phone: pickString(value.phone, merchant?.phone),
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
      : Array.isArray(value.tags)
        ? value.tags.map(item => String(item).trim()).filter(Boolean)
        : undefined,
    openingHours,
    merchantName: pickString(merchant?.name),
  };
};

const normalizeOffer = (value: unknown, shopId: string): ShopOffer | undefined => {
  if (!isRecord(value)) {
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
    image: resolveImagePath(
      pickString(value.thumbnail, value.image, value.imageUrl, value.image_url, value.photo),
    ),
    price: discountedPrice != null ? `₹${discountedPrice.toLocaleString('en-IN')}` : price != null ? `₹${price.toLocaleString('en-IN')}` : undefined,
    originalPrice:
      discountedPrice != null && price != null ? `₹${price.toLocaleString('en-IN')}` : undefined,
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

  if (!shop) {
    return null;
  }

  const shopId = shop.id || fallbackShopId;
  if (!shopId) {
    return null;
  }

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
    shop.coverImage ||
    products.find(product => product.image)?.image ||
    offers.find(offer => offer.image)?.image;

  return {
    ...shop,
    id: shopId,
    coverImage,
    offers,
    products,
    productCount: inventory.productCount ?? products.length,
    offerCount: inventory.offerCount ?? offers.length,
    serviceCount: inventory.serviceCount ?? 0,
  };
};
