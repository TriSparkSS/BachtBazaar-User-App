import { ShopOffer, ShopProduct } from '../types/shop';

const inferMetalType = (value?: string): string | undefined => {
  if (!value) {
    return undefined;
  }

  const normalized = value.toLowerCase();
  if (normalized.includes('gold')) {
    return 'Gold';
  }

  if (normalized.includes('silver')) {
    return 'Silver';
  }

  if (normalized.includes('artificial') || normalized.includes('imitation')) {
    return 'Artificial';
  }

  return undefined;
};

export const mapOffersToProducts = (offers: ShopOffer[]): ShopProduct[] =>
  offers.map(offer => ({
    id: offer.id,
    shopId: offer.shopId,
    title: offer.title,
    category: offer.subtitle,
    metalType: inferMetalType(`${offer.title} ${offer.subtitle ?? ''}`),
    image: offer.image,
    price: offer.discount,
    rating: '4.8',
  }));

export const DEFAULT_SHOP_CATEGORIES = ['Jewelry', 'Gold', 'Wedding'];

export const METAL_FILTERS = ['All', 'Gold', 'Silver', 'Artificial'] as const;

export type MetalFilter = (typeof METAL_FILTERS)[number];

export const STORE_TABS = ['Overview', 'Reviews', 'Gallery', 'Offers'] as const;

export type StoreTab = (typeof STORE_TABS)[number];
