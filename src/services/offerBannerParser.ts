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

  return {
    id,
    title: discount || title,
    subtitle:
      pickString(
        value.subtitle,
        value.shopName,
        value.shop_name,
        shop?.shopName,
        shop?.name,
        merchant?.storeName,
        value.description,
      ) || 'Nearby Stores',
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
    expiresAt: pickString(value.expiresAt, value.expires_at, value.endDate, value.end_date),
    shopId: pickString(value.shopId, value.shop_id, shop?._id, shop?.id),
    offerId: pickString(value.offerId, value.offer_id, id),
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
  };
};

export const parseOfferBannersResponse = (payload: unknown): OfferBanner[] =>
  unwrapBannerList(payload)
    .map(item => normalizeOfferBanner(item))
    .filter((banner): banner is OfferBanner => Boolean(banner));

export const parseAdminBannersResponse = (payload: unknown): OfferBanner[] =>
  unwrapBannerList(payload)
    .map(item => normalizeAdminBanner(item) ?? normalizeOfferBanner(item))
    .filter((banner): banner is OfferBanner => Boolean(banner));
