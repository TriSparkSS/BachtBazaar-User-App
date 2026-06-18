import { Shop, ShopOpeningHours, ShopProduct } from '../types/shop';

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export const formatShopAddress = (shop: Shop): string | undefined => {
  const parts = [shop.address, shop.address1].map(value => value?.trim()).filter(Boolean) as string[];

  return parts.length ? parts.join(', ') : undefined;
};

export const isShopOpenNow = (openingHours?: ShopOpeningHours): boolean | undefined => {
  if (!openingHours) {
    return undefined;
  }

  const todayKey = DAY_KEYS[new Date().getDay()];
  const today = openingHours[todayKey];

  if (!today) {
    return undefined;
  }

  if (today.isClosed) {
    return false;
  }

  if (!today.open || !today.close) {
    return true;
  }

  const now = new Date();
  const [openHour, openMinute] = today.open.split(':').map(Number);
  const [closeHour, closeMinute] = today.close.split(':').map(Number);

  if ([openHour, openMinute, closeHour, closeMinute].some(value => Number.isNaN(value))) {
    return true;
  }

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

export const formatTodayOpeningHours = (openingHours?: ShopOpeningHours): string | undefined => {
  if (!openingHours) {
    return undefined;
  }

  const todayKey = DAY_KEYS[new Date().getDay()];
  const today = openingHours[todayKey];

  if (!today) {
    return undefined;
  }

  if (today.isClosed) {
    return 'Closed today';
  }

  if (today.open && today.close) {
    return `Open today ${today.open} - ${today.close}`;
  }

  return 'Open today';
};

export const formatCurrency = (value?: number | string | null): string | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }

  const amount = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(amount)) {
    return undefined;
  }

  return `₹${amount.toLocaleString('en-IN')}`;
};

export const getFeaturedProducts = (products: ShopProduct[] = []): ShopProduct[] => {
  const featured = products.filter(product => product.isFeatured);
  return featured.length ? featured : products.slice(0, 4);
};

export const STORE_TABS = ['Overview', 'Products', 'Offers', 'Gallery'] as const;

export type StoreTab = (typeof STORE_TABS)[number];
