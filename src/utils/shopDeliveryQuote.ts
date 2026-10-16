import {
  Shop,
  ShopDeliveryPricing,
  ShopDeliveryPricingWindow,
  ShopDeliveryQuote,
} from '../types/shop';
import { REQUEST_DELIVERY_FEE } from './shopDelivery';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickNumber = (...values: unknown[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim()) {
      const parsed = Number(value.trim());
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return undefined;
};

const pickString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const pickBoolean = (...values: unknown[]): boolean | undefined => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value !== 0;
    }
    if (typeof value === 'string' && value.trim()) {
      const normalized = value.trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on', 'enabled'].includes(normalized)) {
        return true;
      }
      if (['false', '0', 'no', 'n', 'off', 'disabled'].includes(normalized)) {
        return false;
      }
    }
  }
  return undefined;
};

const parseHHMM = (value?: string): number | undefined => {
  if (!value?.trim()) {
    return undefined;
  }
  const match = value.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return undefined;
  }
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return undefined;
  }
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return undefined;
  }
  return hours * 60 + minutes;
};

const isTimeInWindow = (now: Date, start?: string, end?: string): boolean => {
  const startMin = parseHHMM(start);
  const endMin = parseHHMM(end);
  if (startMin == null || endMin == null || startMin === endMin) {
    return false;
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  if (startMin < endMin) {
    return nowMin >= startMin && nowMin < endMin;
  }
  return nowMin >= startMin || nowMin < endMin;
};

const parsePricingWindow = (value: unknown): ShopDeliveryPricingWindow | undefined => {
  if (!isRecord(value)) {
    return undefined;
  }
  return {
    isEnabled: pickBoolean(value.isEnabled, value.is_enabled),
    ratePerKm: pickNumber(value.ratePerKm, value.rate_per_km),
    flatSurcharge: pickNumber(value.flatSurcharge, value.flat_surcharge),
    startTime: pickString(value.startTime, value.start_time),
    endTime: pickString(value.endTime, value.end_time),
  };
};

export const parseShopCoordinates = (
  value: unknown,
): { latitude?: number; longitude?: number } => {
  if (!isRecord(value)) {
    return {};
  }
  const latitude = pickNumber(value.latitude, value.lat);
  const longitude = pickNumber(value.longitude, value.lng, value.lon);
  return {
    latitude:
      latitude != null && Math.abs(latitude) <= 90 ? latitude : undefined,
    longitude:
      longitude != null && Math.abs(longitude) <= 180 ? longitude : undefined,
  };
};

export const parseShopDeliveryQuote = (value: unknown): ShopDeliveryQuote | undefined => {
  const source = isRecord(value) ? value : undefined;
  const nested = source && isRecord(source.delivery) ? source.delivery : source;
  if (!nested) {
    return undefined;
  }

  const deliveryFee = pickNumber(
    nested.deliveryFee,
    nested.delivery_fee,
    nested.deliveryCharge,
    nested.delivery_charge,
  );
  const distanceKm = pickNumber(nested.distanceKm, nested.distance_km);
  const isAvailable = pickBoolean(nested.isAvailable, nested.is_available);
  const tierApplied = pickString(nested.tierApplied, nested.tier_applied);

  if (
    deliveryFee == null &&
    distanceKm == null &&
    isAvailable == null &&
    !tierApplied
  ) {
    return undefined;
  }

  return {
    isAvailable,
    distanceKm,
    deliveryFee,
    tierApplied,
  };
};

export const parseShopDeliveryPricing = (value: unknown): ShopDeliveryPricing | undefined => {
  const source = isRecord(value) ? value : undefined;
  if (!source) {
    return undefined;
  }

  const pricingSource = isRecord(source.deliveryPricing)
    ? source.deliveryPricing
    : isRecord(source.delivery_pricing)
      ? source.delivery_pricing
      : source;

  const baseFee = pickNumber(pricingSource.baseFee, pricingSource.base_fee);
  const ratePerKm = pickNumber(pricingSource.ratePerKm, pricingSource.rate_per_km);
  const minimumDeliveryFee = pickNumber(
    pricingSource.minimumDeliveryFee,
    pricingSource.minimum_delivery_fee,
  );
  const nightConfig = parsePricingWindow(
    pricingSource.nightConfig ?? pricingSource.night_config,
  );
  const peakConfig = parsePricingWindow(
    pricingSource.peakConfig ?? pricingSource.peak_config,
  );

  if (
    baseFee == null &&
    ratePerKm == null &&
    minimumDeliveryFee == null &&
    !nightConfig &&
    !peakConfig
  ) {
    return undefined;
  }

  return {
    baseFee,
    ratePerKm,
    minimumDeliveryFee,
    nightConfig,
    peakConfig,
  };
};

export const computeDeliveryFeeFromPricing = (
  pricing: ShopDeliveryPricing,
  distanceKm: number,
  now: Date = new Date(),
): number => {
  const night = pricing.nightConfig;
  const peak = pricing.peakConfig;
  let ratePerKm = pricing.ratePerKm ?? 0;
  let surcharge = 0;

  if (night?.isEnabled && isTimeInWindow(now, night.startTime, night.endTime)) {
    ratePerKm = night.ratePerKm ?? ratePerKm;
    surcharge = night.flatSurcharge ?? 0;
  } else if (peak?.isEnabled && isTimeInWindow(now, peak.startTime, peak.endTime)) {
    ratePerKm = peak.ratePerKm ?? ratePerKm;
    surcharge = peak.flatSurcharge ?? 0;
  }

  const computed =
    (pricing.baseFee ?? 0) + Math.max(0, distanceKm) * ratePerKm + surcharge;
  return Math.max(0, pricing.minimumDeliveryFee ?? 0, Math.round(computed));
};

export const resolveShopDeliveryFee = (
  shop?: Pick<Shop, 'delivery' | 'deliveryPricing'> | null,
): number | undefined => {
  const quoted = shop?.delivery?.deliveryFee;
  if (typeof quoted === 'number' && Number.isFinite(quoted) && quoted >= 0) {
    return quoted;
  }

  const distanceKm = shop?.delivery?.distanceKm;
  if (shop?.deliveryPricing && typeof distanceKm === 'number' && Number.isFinite(distanceKm)) {
    return computeDeliveryFeeFromPricing(shop.deliveryPricing, distanceKm);
  }

  return undefined;
};

export const shopDeliveryFeeOrFallback = (
  shop?: Pick<Shop, 'delivery' | 'deliveryPricing'> | null,
): number => resolveShopDeliveryFee(shop) ?? REQUEST_DELIVERY_FEE;

export const shopDeliveryTierLabel = (
  shop?: Pick<Shop, 'delivery'> | null,
): string | undefined => {
  const tier = shop?.delivery?.tierApplied?.trim().toUpperCase();
  if (tier === 'NIGHT') {
    return 'Night';
  }
  if (tier === 'PEAK') {
    return 'Peak';
  }
  return undefined;
};
