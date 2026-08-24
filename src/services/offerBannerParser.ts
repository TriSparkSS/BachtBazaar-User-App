import { OfferBanner } from '../types/offerBanner';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
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

const pickBoolean = (...values: unknown[]): boolean | undefined => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === 'yes') {
        return true;
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return false;
      }
    }
  }
  return undefined;
};

const pickTerms = (value: Record<string, unknown>): string[] | undefined => {
  const candidates = [
    value.terms,
    value.termsAndConditions,
    value.terms_and_conditions,
    value.tnc,
    value.conditions,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const terms = candidate
        .map(item => {
          if (typeof item === 'string') {
            return item.trim();
          }
          if (isRecord(item)) {
            return pickString(item.text, item.title, item.description, item.condition) || '';
          }
          return '';
        })
        .filter(Boolean);
      if (terms.length) {
        return terms;
      }
    }

    if (typeof candidate === 'string' && candidate.trim()) {
      const parts = candidate
        .split(/\n|•|;|\|/)
        .map(part => part.trim())
        .filter(Boolean);
      if (parts.length) {
        return parts;
      }
    }
  }

  return undefined;
};

const buildBannerDiscount = (value: Record<string, unknown>): string | undefined => {
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

  return pickString(
    value.discount,
    value.discountLabel,
    value.discount_label,
    value.discountExpression,
    value.badge,
    value.tag,
  );
};

const normalizeOfferBanner = (value: unknown): OfferBanner | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.offerId, value.offer_id);
  const discount = buildBannerDiscount(value);
  const title =
    pickString(value.title, value.name, value.offerTitle, value.offer_title) ||
    discount ||
    'Special Offer';

  if (!id) {
    return undefined;
  }

  const shop = isRecord(value.shop) ? value.shop : undefined;
  const merchant = isRecord(value.merchant) ? value.merchant : undefined;
  const shopName = pickString(
    value.shopName,
    value.shop_name,
    shop?.shopName,
    shop?.name,
    merchant?.storeName,
    merchant?.name,
  );
  const ratingValue = pickNumber(
    value.rating,
    value.avgRating,
    value.avg_rating,
    shop?.rating,
    shop?.avgRating,
  );
  const distanceValue = pickNumber(
    value.distanceKm,
    value.distance_km,
    value.distance,
    shop?.distanceKm,
    shop?.distance,
  );

  return {
    id,
    title: discount || title,
    subtitle:
      pickString(value.subtitle, shopName, value.description) || 'Nearby Stores',
    badgeLabel:
      pickString(value.badgeLabel, value.badge_label, value.badgeText, value.badge_text) ||
      'LIMITED TIME',
    discount,
    image: pickString(
      value.bannerImage,
      value.banner_image,
      value.thumbnail,
      value.image,
      value.imageUrl,
      value.image_url,
    ),
    expiresAt: pickString(
      value.expiresAt,
      value.expires_at,
      value.endDate,
      value.end_date,
      value.validTill,
      value.valid_till,
    ),
    shopId: pickString(value.shopId, value.shop_id, shop?._id, shop?.id),
    offerId: pickString(value.offerId, value.offer_id, id),
    description: pickString(
      value.description,
      value.longDescription,
      value.long_description,
      value.offerDescription,
      value.offer_description,
      value.details,
    ),
    shopName,
    shopCategory: pickString(
      value.shopCategory,
      value.shop_category,
      value.category,
      shop?.category,
      shop?.shopCategory,
      Array.isArray(shop?.categories) ? shop?.categories[0] : undefined,
    ),
    shopLogo: pickString(
      value.shopLogo,
      value.shop_logo,
      shop?.logo,
      shop?.avatar,
      merchant?.avatar,
      merchant?.logo,
    ),
    rating: ratingValue != null ? String(ratingValue) : pickString(value.rating, shop?.rating),
    distance:
      distanceValue != null
        ? `${distanceValue.toFixed(1)} km`
        : pickString(value.distanceLabel, value.distance_label, shop?.distance),
    isVerified:
      pickBoolean(
        value.isVerified,
        value.is_verified,
        value.verified,
        shop?.isVerified,
        shop?.is_verified,
        shop?.verified,
      ) ?? false,
    terms: pickTerms(value),
  };
};

const unwrapBannerList = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (!isRecord(payload)) {
    return [];
  }

  for (const key of ['data', 'banners', 'items', 'feed', 'activeFeed', 'active_feed']) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return [];
};

const normalizeAdminBanner = (value: unknown): OfferBanner | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.bannerId, value.banner_id);
  const discount = buildBannerDiscount(value);
  const title =
    pickString(
      value.title,
      value.headline,
      value.name,
      value.bannerTitle,
      value.banner_title,
      value.discountText,
      value.discount_text,
    ) ||
    discount ||
    'Special Offer';

  if (!id) {
    return undefined;
  }

  const shop = isRecord(value.shop) ? value.shop : undefined;
  const merchant = isRecord(value.merchant) ? value.merchant : undefined;

  return {
    id,
    title: discount || title,
    subtitle:
      pickString(
        value.subtitle,
        value.description,
        value.caption,
        value.shortDescription,
        value.short_description,
      ) || 'Bacht Bazaar',
    badgeLabel:
      pickString(value.badgeLabel, value.badge_label, value.badgeText, value.badge_text, value.tag) ||
      'LIMITED TIME',
    discount,
    image: pickString(
      value.bannerImage,
      value.banner_image,
      value.image,
      value.imageUrl,
      value.image_url,
      value.thumbnail,
      value.mediaUrl,
      value.media_url,
    ),
    expiresAt: pickString(
      value.expiresAt,
      value.expires_at,
      value.endDate,
      value.end_date,
      value.validTill,
      value.valid_till,
    ),
    shopId: pickString(value.shopId, value.shop_id, shop?._id, shop?.id),
    offerId: pickString(value.offerId, value.offer_id, value.linkedOfferId, value.linked_offer_id),
    description: pickString(
      value.description,
      value.longDescription,
      value.long_description,
      value.details,
    ),
    shopName: pickString(
      value.shopName,
      value.shop_name,
      shop?.shopName,
      shop?.name,
      merchant?.storeName,
    ),
    shopCategory: pickString(value.shopCategory, value.shop_category, value.category, shop?.category),
    shopLogo: pickString(value.shopLogo, value.shop_logo, shop?.logo, merchant?.avatar),
    rating: pickString(value.rating, shop?.rating),
    distance: pickString(value.distanceLabel, value.distance_label, value.distance),
    isVerified:
      pickBoolean(value.isVerified, value.is_verified, shop?.isVerified, shop?.verified) ?? false,
    terms: pickTerms(value),
    isAdminBanner: true,
  };
};

export const parseOfferBannersResponse = (payload: unknown): OfferBanner[] =>
  unwrapBannerList(payload)
    .map(item => normalizeOfferBanner(item))
    .filter((banner): banner is OfferBanner => Boolean(banner));

export const parseAdminBannersResponse = (payload: unknown): OfferBanner[] =>
  unwrapBannerList(payload)
    .map(item => {
      const fromAdmin = normalizeAdminBanner(item);
      if (fromAdmin) {
        return { ...fromAdmin, isAdminBanner: true };
      }
      const fromOffer = normalizeOfferBanner(item);
      return fromOffer ? { ...fromOffer, isAdminBanner: true } : undefined;
    })
    .filter((banner): banner is OfferBanner => Boolean(banner));
