import { Shop, ShopOffer } from '../types/shop';

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
      for (const nestedKey of ['shops', 'items', 'offers', 'data', 'list']) {
        const nested = value[nestedKey];
        if (Array.isArray(nested)) {
          return nested;
        }
      }
    }
  }

  return [];
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

  return {
    id,
    name,
    logo: pickString(
      value.logo,
      value.image,
      value.shopImage,
      value.shop_image,
      value.profileImage,
      value.profile_image,
      value.avatar,
      value.photo,
    ),
    coverImage: pickString(
      value.coverImage,
      value.cover_image,
      value.banner,
      value.bannerImage,
      value.banner_image,
      value.heroImage,
      value.hero_image,
    ),
    tagline: pickString(value.tagline, value.description, value.subtitle, value.about),
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
    isOpen: value.isOpen !== undefined ? Boolean(value.isOpen) : value.is_open !== undefined ? Boolean(value.is_open) : undefined,
    isVerified: Boolean(value.isVerified ?? value.is_verified ?? value.verified ?? false),
    categories: Array.isArray(value.categories)
      ? value.categories.map(item => String(item).trim()).filter(Boolean)
      : Array.isArray(value.tags)
        ? value.tags.map(item => String(item).trim()).filter(Boolean)
        : undefined,
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

  return {
    id,
    shopId: pickString(value.shopId, value.shop_id) ?? shopId,
    title,
    subtitle: pickString(value.subtitle, value.shortDescription, value.short_description),
    discount: pickString(value.discount, value.discountLabel, value.discount_label, value.badge, value.tag),
    image: pickString(value.image, value.imageUrl, value.image_url, value.offerImage, value.offer_image, value.photo),
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
  };
};

export const parseShopsResponse = (payload: unknown): Shop[] =>
  unwrapList(payload)
    .map(item => normalizeShop(item))
    .filter((shop): shop is Shop => Boolean(shop));

export const parseShopOffersResponse = (payload: unknown, shopId: string): ShopOffer[] =>
  unwrapList(payload)
    .map(item => normalizeOffer(item, shopId))
    .filter((offer): offer is ShopOffer => Boolean(offer));
