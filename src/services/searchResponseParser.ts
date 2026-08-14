import { SearchResults } from '../types/search';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../types/shop';
import { pickProvidesDeliveryFlag } from '../utils/shopDelivery';
import { resolveShopMediaFromApiValue } from './shopResponseParser';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
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

const formatPrice = (value?: number): string | undefined =>
  value != null ? `₹${value.toLocaleString('en-IN')}` : undefined;

const normalizeSearchProduct = (value: unknown): ShopProduct | undefined => {
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
    shopId: pickString(
      value.shopId,
      value.shop_id,
      isRecord(value.merchant_id) ? value.merchant_id._id : value.merchant_id,
      isRecord(value.merchantId) ? value.merchantId._id : value.merchantId,
      isRecord(value.shop) ? value.shop._id ?? value.shop.id : undefined,
    ) ?? '',
    title,
    category: pickString(value.category, value.type),
    brand: pickString(value.brand),
    description: pickString(value.description),
    image: pickString(value.thumbnail, value.image, value.imageUrl, value.image_url),
    price: formatPrice(discountedPrice ?? price),
    originalPrice: discountedPrice != null && price != null ? formatPrice(price) : undefined,
    stock: pickNumber(value.stock),
    isFeatured: Boolean(value.is_featured ?? value.isFeatured),
    shopName: pickString(
      value.shopName,
      value.shop_name,
      value.storeName,
      isRecord(value.shop) ? value.shop.name ?? value.shop.shopName : undefined,
      isRecord(value.merchant_id) ? value.merchant_id.name : undefined,
    ),
    providesDelivery: pickProvidesDeliveryFlag(
      value,
      isRecord(value.shop) ? value.shop : undefined,
      isRecord(value.merchant_id) ? value.merchant_id : undefined,
      isRecord(value.merchantId) ? value.merchantId : undefined,
    ),
  };
};

const buildSearchOfferDiscount = (value: Record<string, unknown>): string | undefined => {
  const offerTypeRecord = isRecord(value.offer_type_id) ? value.offer_type_id : undefined;
  const offerType = pickString(
    offerTypeRecord?.value,
    offerTypeRecord?.label,
    value.offerType,
    value.offer_type,
  )?.toLowerCase();
  const discountValue = pickNumber(value.discount_value, value.discountValue);
  const discountPercentage = pickNumber(value.discount_percentage, value.discountPercentage);

  if (discountValue && discountValue > 0) {
    return `₹${discountValue} OFF`;
  }

  if (discountPercentage && discountPercentage > 0) {
    if (offerType?.includes('flat') || offerType?.includes('rupee')) {
      return `₹${discountPercentage} OFF`;
    }
    if (offerType?.includes('free')) {
      return pickString(offerTypeRecord?.label) ?? 'FREE';
    }
    return `${discountPercentage}% OFF`;
  }

  return pickString(
    offerTypeRecord?.label,
    value.discount,
    value.discountLabel,
    value.discount_label,
    value.badge,
    value.tag,
  );
};

const normalizeSearchOffer = (value: unknown): ShopOffer | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.offerId, value.offer_id);
  const title = pickString(value.title, value.name, value.offerTitle, value.offer_title);

  if (!id || !title) {
    return undefined;
  }

  const merchant = isRecord(value.merchant_id)
    ? value.merchant_id
    : isRecord(value.merchantId)
      ? value.merchantId
      : isRecord(value.shop)
        ? value.shop
        : undefined;

  const shopId =
    pickString(
      value.shopId,
      value.shop_id,
      isRecord(value.shop) ? value.shop._id ?? value.shop.id : undefined,
      merchant?._id,
      merchant?.id,
      typeof value.merchant_id === 'string' ? value.merchant_id : undefined,
      typeof value.merchantId === 'string' ? value.merchantId : undefined,
    ) ?? '';

  const shopName = pickString(
    value.shopName,
    value.shop_name,
    value.storeName,
    isRecord(value.shop) ? value.shop.name ?? value.shop.shopName : undefined,
    merchant?.name,
    merchant?.shopName,
  );

  const offerTypeRecord = isRecord(value.offer_type_id) ? value.offer_type_id : undefined;

  return {
    id,
    shopId,
    title,
    subtitle: pickString(value.subtitle, value.shortDescription, value.short_description),
    discount: buildSearchOfferDiscount(value),
    image: pickString(value.thumbnail, value.image, value.imageUrl, value.image_url),
    expiresAt: pickString(
      value.expiresAt,
      value.expires_at,
      value.endDate,
      value.end_date,
    ),
    description: pickString(value.description, value.details),
    offerType: pickString(offerTypeRecord?.label, offerTypeRecord?.value, value.offerType),
    shopName,
  };
};

const normalizeSearchShop = (value: unknown): ShopWithOffers | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }

  const id = pickString(value._id, value.id, value.shopId, value.shop_id);
  const name = pickString(value.shopName, value.shop_name, value.name, value.title);

  if (!id || !name) {
    return undefined;
  }

  const merchantId = pickString(
    isRecord(value.merchantId) ? value.merchantId._id ?? value.merchantId.id : value.merchantId,
    isRecord(value.merchant) ? value.merchant._id ?? value.merchant.id : value.merchant,
    isRecord(value.merchant_id) ? value.merchant_id._id ?? value.merchant_id.id : value.merchant_id,
  );

  return {
    id,
    name,
    logo:
      resolveShopMediaFromApiValue(value.logo) ??
      pickString(value.image, value.thumbnail),
    coverImage:
      resolveShopMediaFromApiValue(value.banner) ??
      resolveShopMediaFromApiValue(value.coverImage) ??
      resolveShopMediaFromApiValue(value.cover_image),
    tagline: pickString(value.description, value.tagline),
    address: pickString(value.address),
    address1: pickString(value.address1, value.address_1),
    city: pickString(value.city),
    phone: pickString(value.phone),
    merchantId,
    providesDelivery: pickProvidesDeliveryFlag(
      value,
      isRecord(value.merchantId) ? value.merchantId : undefined,
      isRecord(value.merchant) ? value.merchant : undefined,
      isRecord(value.merchant_id) ? value.merchant_id : undefined,
    ),
    offers: Array.isArray(value.offers)
      ? value.offers.map(normalizeSearchOffer).filter((offer): offer is ShopOffer => Boolean(offer))
      : [],
    offerCount: pickNumber(value.offerCount, value.offer_count),
  };
};

const getResultsRecord = (payload: unknown): Record<string, unknown> => {
  if (!isRecord(payload)) {
    return {};
  }

  if (isRecord(payload.results)) {
    return payload.results;
  }

  if (isRecord(payload.data)) {
    if (isRecord(payload.data.results)) {
      return payload.data.results;
    }
    return payload.data;
  }

  return payload;
};

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

export const parseSearchResponse = (payload: unknown): SearchResults => {
  const root = isRecord(payload) ? payload : {};
  const results = getResultsRecord(payload);
  const shops = asArray(results.shops)
    .map(normalizeSearchShop)
    .filter((shop): shop is ShopWithOffers => Boolean(shop));
  const products = asArray(results.products)
    .map(normalizeSearchProduct)
    .filter((product): product is ShopProduct => Boolean(product));
  const services = asArray(results.services)
    .map(normalizeSearchProduct)
    .filter((service): service is ShopProduct => Boolean(service));
  const offers = asArray(results.offers)
    .map(normalizeSearchOffer)
    .filter((offer): offer is ShopOffer => Boolean(offer));

  return {
    query: pickString(root.query, results.query) ?? '',
    totalShopsFound: pickNumber(results.totalShopsFound, results.total_shops_found) ?? shops.length,
    totalProductsFound:
      pickNumber(results.totalProductsFound, results.total_products_found) ?? products.length,
    totalServicesFound:
      pickNumber(results.totalServicesFound, results.total_services_found) ?? services.length,
    shops,
    products,
    services,
    offers,
  };
};
