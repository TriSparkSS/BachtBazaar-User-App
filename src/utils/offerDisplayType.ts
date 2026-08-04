/**
 * Offer list surfaces (Local Offers, store detail) should only show regular offers.
 * Banner / calendar display types have their own UI (carousel / daily rewards).
 * Matches Offer Detail's `displayType`: "banner" | "calendar" | "all" | etc.
 */

const EXCLUDED_OFFER_DISPLAY_TYPES = new Set(['banner', 'calendar']);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value));

const pickTypeString = (...values: unknown[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }

    if (typeof value === 'number' && !Number.isNaN(value)) {
      return String(value);
    }

    if (isRecord(value)) {
      for (const key of ['value', 'label', 'name', 'type', 'displayType', 'display_type']) {
        const nested = value[key];
        if (typeof nested === 'string' && nested.trim()) {
          return nested.trim();
        }
      }
    }
  }

  return undefined;
};

/** Normalize a display/banner type string for comparison. */
export const normalizeOfferDisplayType = (value?: string | null): string | undefined => {
  const trimmed = value?.trim();
  return trimmed ? trimmed.toLowerCase() : undefined;
};

/**
 * True when the offer should appear in regular offer lists.
 * Treats null / undefined / "all" as showable; excludes "banner" and "calendar".
 */
export const isRegularOfferDisplayType = (displayType?: string | null): boolean => {
  const normalized = normalizeOfferDisplayType(displayType);
  if (!normalized || normalized === 'all') {
    return true;
  }

  return !EXCLUDED_OFFER_DISPLAY_TYPES.has(normalized);
};

/**
 * Resolve display type from a raw API offer / banner record (or a normalized object).
 * Checks displayType, display_type, bannerType, banner_type, and type-like category strings.
 */
export const extractOfferDisplayType = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value.trim() || undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  return pickTypeString(
    value.displayType,
    value.display_type,
    value.bannerType,
    value.banner_type,
    value.banner_type_id,
    value.bannerTypeId,
    // Only when API uses `category` as a type label (e.g. "banner"), not a product category object.
    typeof value.category === 'string' ? value.category : undefined,
    value.type,
  );
};

/** Filter predicate for Local Offers / store offers lists. */
export const shouldShowInOffersList = (value: unknown): boolean =>
  isRegularOfferDisplayType(extractOfferDisplayType(value));

/**
 * True only when the offer is explicitly a calendar display type.
 * Null / undefined / "all" / banner / other types are excluded from the daily rewards calendar.
 */
export const isCalendarOfferDisplayType = (displayType?: string | null): boolean =>
  normalizeOfferDisplayType(displayType) === 'calendar';

/** Filter predicate for Daily Rewards / calendar offer lists. */
export const shouldShowInCalendarList = (value: unknown): boolean =>
  isCalendarOfferDisplayType(extractOfferDisplayType(value));
