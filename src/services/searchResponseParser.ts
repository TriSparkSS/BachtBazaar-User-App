import { SearchResults } from '../types/search';
import { ShopOffer, ShopProduct, ShopWithOffers } from '../types/shop';

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
    shopId: pickString(value.shopId, value.shop_id, value.merchant_id, value.merchantId) ?? '',
    title,
    category: pickString(value.category, value.type),
    image: pickString(value.thumbnail, value.image, value.imageUrl, value.image_url),
    price: formatPrice(discountedPrice ?? price),
    originalPrice: discountedPrice != null && price != null ? formatPrice(price) : undefined,
    stock: pickNumber(value.stock),
    isFeatured: Boolean(value.is_featured ?? value.isFeatured),
  };
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

  return {
    id,
    shopId: pickString(value.shopId, value.shop_id, value.merchant_id, value.merchantId) ?? '',
    title,
    subtitle: pickString(value.subtitle, value.shortDescription, value.short_description),
    discount: pickString(value.discount, value.discountLabel, value.discount_label),
    image: pickString(value.thumbnail, value.image, value.imageUrl, value.image_url),
    expiresAt: pickString(value.expiresAt, value.expires_at, value.endDate, value.end_date),
    description: pickString(value.description, value.details),
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

  return {
    id,
    name,
    logo: pickString(value.logo, value.image, value.thumbnail),
    coverImage: pickString(value.banner, value.coverImage, value.cover_image),
    tagline: pickString(value.description, value.tagline),
    address: pickString(value.address),
    address1: pickString(value.address1, value.address_1),
    city: pickString(value.city),
    phone: pickString(value.phone),
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

  return isRecord(payload.results) ? payload.results : payload;
};

export const parseSearchResponse = (payload: unknown): SearchResults => {
  const root = isRecord(payload) ? payload : {};
  const results = getResultsRecord(payload);
  const shops = Array.isArray(results.shops)
    ? results.shops.map(normalizeSearchShop).filter((shop): shop is ShopWithOffers => Boolean(shop))
    : [];
  const products = Array.isArray(results.products)
    ? results.products.map(normalizeSearchProduct).filter((product): product is ShopProduct => Boolean(product))
    : [];
  const services = Array.isArray(results.services)
    ? results.services.map(normalizeSearchProduct).filter((service): service is ShopProduct => Boolean(service))
    : [];
  const offers = Array.isArray(results.offers)
    ? results.offers.map(normalizeSearchOffer).filter((offer): offer is ShopOffer => Boolean(offer))
    : [];

  return {
    query: pickString(root.query) ?? '',
    totalShopsFound: pickNumber(results.totalShopsFound, results.total_shops_found) ?? shops.length,
    totalProductsFound: pickNumber(results.totalProductsFound, results.total_products_found) ?? products.length,
    totalServicesFound: pickNumber(results.totalServicesFound, results.total_services_found) ?? services.length,
    shops,
    products,
    services,
    offers,
  };
};
