import { Shop, ShopOpeningDay, ShopOpeningHours, ShopProduct } from '../types/shop';

const DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

const INDIA_TIME_ZONE = 'Asia/Kolkata';

export const formatShopAddress = (shop: Shop): string | undefined => {
  const parts = [shop.address, shop.address1, shop.city]
    .map(value => value?.trim())
    .filter(Boolean) as string[];

  return parts.length ? parts.join(', ') : undefined;
};

const parseMinutes = (time?: string): number | undefined => {
  if (!time?.trim()) {
    return undefined;
  }

  const [hourRaw, minuteRaw] = time.trim().split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw ?? 0);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return undefined;
  }

  return hour * 60 + minute;
};

/** Shop hours are India-local, not the device timezone. */
const getIndiaNow = (): { dayKey: (typeof DAY_KEYS)[number]; minutes: number } => {
  const now = new Date();
  const weekday = new Intl.DateTimeFormat('en-US', {
    timeZone: INDIA_TIME_ZONE,
    weekday: 'long',
  })
    .format(now)
    .toLowerCase();

  const dayKey = DAY_KEYS.find(day => day === weekday) ?? DAY_KEYS[now.getDay()];

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: INDIA_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const hour = Number(parts.find(part => part.type === 'hour')?.value);
  const minute = Number(parts.find(part => part.type === 'minute')?.value);
  const minutes =
    Number.isNaN(hour) || Number.isNaN(minute)
      ? now.getHours() * 60 + now.getMinutes()
      : hour * 60 + minute;

  return { dayKey, minutes };
};

const todayOpeningDay = (openingHours?: ShopOpeningHours): ShopOpeningDay | undefined => {
  if (!openingHours) {
    return undefined;
  }

  return openingHours[getIndiaNow().dayKey];
};

/** True when current India time falls inside today's hours. */
export const isShopOpenNow = (openingHours?: ShopOpeningHours): boolean | undefined => {
  if (!openingHours) {
    return undefined;
  }

  const { minutes: currentMinutes } = getIndiaNow();
  const today = todayOpeningDay(openingHours);
  if (!today) {
    return undefined;
  }

  if (today.isClosed) {
    return false;
  }

  const openMinutes = parseMinutes(today.open);
  const closeMinutes = parseMinutes(today.close);

  // isClosed is false but times are missing or 00:00–00:00 → open all day.
  if (openMinutes === undefined || closeMinutes === undefined || openMinutes === closeMinutes) {
    return true;
  }

  // Overnight window, e.g. 22:00–06:00.
  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes <= closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
};

export const isShopCurrentlyOpen = (
  shop: Pick<Shop, 'openingHours' | 'isOpen'>,
): boolean | undefined => {
  const fromHours = isShopOpenNow(shop.openingHours);
  if (fromHours !== undefined) {
    return fromHours;
  }
  return shop.isOpen;
};

export const formatTodayOpeningHours = (openingHours?: ShopOpeningHours): string | undefined => {
  if (!openingHours) {
    return undefined;
  }

  const today = todayOpeningDay(openingHours);
  if (!today) {
    return undefined;
  }

  if (today.isClosed) {
    return 'Closed today';
  }

  const openMinutes = parseMinutes(today.open);
  const closeMinutes = parseMinutes(today.close);
  if (
    openMinutes !== undefined &&
    closeMinutes !== undefined &&
    openMinutes === closeMinutes
  ) {
    return 'Open 24 hours';
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

export const STORE_TABS = ['Overview', 'Products', 'Services', 'Offers', 'Gallery'] as const;

export type StoreTab = (typeof STORE_TABS)[number];
